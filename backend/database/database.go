package database

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"

	"geoalbum/backend/logging"
)

var DB *sqlx.DB

// Initialize initializes the SQLite database connection and creates tables
func Initialize() error {
	// Create data directory if it doesn't exist
	dataDir := "data"
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return fmt.Errorf("failed to create data directory: %w", err)
	}

	// Database file path with optimized connection parameters
	dbPath := filepath.Join(dataDir, "geoalbum.db")
	
	// SQLite connection string with performance optimizations
	connectionString := fmt.Sprintf("%s?_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)&_pragma=cache_size(-64000)&_pragma=foreign_keys(1)&_pragma=busy_timeout(30000)", dbPath)
	
	// Open database connection
	db, err := sqlx.Open("sqlite", connectionString)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool for optimal performance
	db.SetMaxOpenConns(25)                 // Maximum number of open connections
	db.SetMaxIdleConns(5)                  // Maximum number of idle connections
	db.SetConnMaxLifetime(30 * time.Minute) // Maximum connection lifetime
	db.SetConnMaxIdleTime(5 * time.Minute)  // Maximum idle time for connections

	// Test connection
	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	DB = db
	logging.WithFields(map[string]interface{}{
		"max_open_conns":     25,
		"max_idle_conns":     5,
		"conn_max_lifetime":  "30m",
		"conn_max_idle_time": "5m",
		"wal_mode":          true,
		"foreign_keys":      true,
	}).Info("Database connection established with optimized settings")

	// Apply additional performance optimizations
	if err := optimizeDatabase(); err != nil {
		return fmt.Errorf("failed to optimize database: %w", err)
	}

	// Create tables
	if err := createTables(); err != nil {
		return fmt.Errorf("failed to create tables: %w", err)
	}

	// Ensure spatial index (R-tree) exists and is backfilled
	if err := ensureAlbumSpatialIndex(); err != nil {
		return fmt.Errorf("failed to ensure album spatial index: %w", err)
	}

	// Initialize blob store for photo storage
	blobPath := filepath.Join(dataDir, "photos.db")
	if err := InitBlobStore(blobPath); err != nil {
		return fmt.Errorf("failed to initialize blob store: %w", err)
	}
	logging.Info("Blob store initialized for photo storage")

	logging.Info("Database tables created successfully")
	return nil
}

// ensureAlbumSpatialIndex creates and backfills the album spatial index (R-tree).
//
// Implementation notes:
// - SQLite R-tree requires an integer primary key, but albums use TEXT UUIDs.
// - We maintain an auxiliary mapping table (album_spatial) with an integer spatial_id.
// - Triggers keep album_spatial + albums_rtree consistent with albums table changes.
func ensureAlbumSpatialIndex() error {
	if DB == nil {
		return fmt.Errorf("database connection is nil")
	}

	stmts := []string{
		// Mapping table: album_id (TEXT) -> spatial_id (INTEGER)
		`
		CREATE TABLE IF NOT EXISTS album_spatial (
			spatial_id INTEGER PRIMARY KEY AUTOINCREMENT,
			album_id   TEXT NOT NULL UNIQUE,
			user_id    TEXT NOT NULL,
			longitude  REAL NOT NULL,
			latitude   REAL NOT NULL,
			FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
		);
		`,
		"CREATE INDEX IF NOT EXISTS idx_album_spatial_user_id ON album_spatial(user_id);",
		"CREATE INDEX IF NOT EXISTS idx_album_spatial_album_id ON album_spatial(album_id);",

		// R-tree virtual table (lon/lat bbox)
		`
		CREATE VIRTUAL TABLE IF NOT EXISTS albums_rtree USING rtree(
			id,
			min_lon, max_lon,
			min_lat, max_lat
		);
		`,

		// Triggers to maintain mapping + rtree in sync
		"DROP TRIGGER IF EXISTS trg_albums_spatial_insert;",
		"DROP TRIGGER IF EXISTS trg_albums_spatial_update_location;",
		"DROP TRIGGER IF EXISTS trg_albums_spatial_delete;",

		`
		CREATE TRIGGER trg_albums_spatial_insert
		AFTER INSERT ON albums
		BEGIN
			INSERT OR IGNORE INTO album_spatial(album_id, user_id, longitude, latitude)
			VALUES (NEW.id, NEW.user_id, NEW.longitude, NEW.latitude);

			INSERT OR REPLACE INTO albums_rtree(id, min_lon, max_lon, min_lat, max_lat)
			VALUES (
				(SELECT spatial_id FROM album_spatial WHERE album_id = NEW.id),
				NEW.longitude, NEW.longitude,
				NEW.latitude, NEW.latitude
			);
		END;
		`,
		`
		CREATE TRIGGER trg_albums_spatial_update_location
		AFTER UPDATE OF latitude, longitude ON albums
		BEGIN
			UPDATE album_spatial
			SET longitude = NEW.longitude, latitude = NEW.latitude
			WHERE album_id = NEW.id;

			INSERT OR REPLACE INTO albums_rtree(id, min_lon, max_lon, min_lat, max_lat)
			VALUES (
				(SELECT spatial_id FROM album_spatial WHERE album_id = NEW.id),
				NEW.longitude, NEW.longitude,
				NEW.latitude, NEW.latitude
			);
		END;
		`,
		`
		CREATE TRIGGER trg_albums_spatial_delete
		AFTER DELETE ON albums
		BEGIN
			DELETE FROM albums_rtree
			WHERE id = (SELECT spatial_id FROM album_spatial WHERE album_id = OLD.id);
			DELETE FROM album_spatial WHERE album_id = OLD.id;
		END;
		`,
	}

	for _, stmt := range stmts {
		if _, err := DB.Exec(stmt); err != nil {
			return fmt.Errorf("failed to apply spatial index statement: %w", err)
		}
	}

	// Backfill mapping table for existing albums
	if _, err := DB.Exec(`
		INSERT OR IGNORE INTO album_spatial(album_id, user_id, longitude, latitude)
		SELECT id, user_id, longitude, latitude
		FROM albums
	`); err != nil {
		return fmt.Errorf("failed to backfill album_spatial: %w", err)
	}

	// Backfill rtree entries that don't exist yet
	if _, err := DB.Exec(`
		INSERT OR IGNORE INTO albums_rtree(id, min_lon, max_lon, min_lat, max_lat)
		SELECT spatial_id, longitude, longitude, latitude, latitude
		FROM album_spatial
	`); err != nil {
		return fmt.Errorf("failed to backfill albums_rtree: %w", err)
	}

	return nil
}

// createTables creates all necessary database tables
func createTables() error {
	// Users table
	usersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	// Albums table
	albumsTable := `
	CREATE TABLE IF NOT EXISTS albums (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		title TEXT NOT NULL,
		description TEXT,
		latitude REAL NOT NULL,
		longitude REAL NOT NULL,
		created_at DATETIME NOT NULL,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);`

	// Photos table
	photosTable := `
	CREATE TABLE IF NOT EXISTS photos (
		id TEXT PRIMARY KEY,
		album_id TEXT NOT NULL,
		filename TEXT NOT NULL,
		file_path TEXT NOT NULL,
		file_size INTEGER NOT NULL,
		mime_type TEXT NOT NULL,
		display_order INTEGER NOT NULL DEFAULT 0,
		uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
	);`

	// Paths table
	pathsTable := `
	CREATE TABLE IF NOT EXISTS paths (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		from_album_id TEXT NOT NULL,
		to_album_id TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (from_album_id) REFERENCES albums(id) ON DELETE CASCADE,
		FOREIGN KEY (to_album_id) REFERENCES albums(id) ON DELETE CASCADE,
		UNIQUE(from_album_id, to_album_id)
	);`

	// Execute table creation
	tables := []string{usersTable, albumsTable, photosTable, pathsTable}
	for _, table := range tables {
		if _, err := DB.Exec(table); err != nil {
			return fmt.Errorf("failed to create table: %w", err)
		}
	}

	// Create indexes
	if err := createIndexes(); err != nil {
		return fmt.Errorf("failed to create indexes: %w", err)
	}

	return nil
}

// optimizeDatabase applies performance optimizations to the database
func optimizeDatabase() error {
	optimizations := []string{
		// Enable Write-Ahead Logging for better concurrency
		"PRAGMA journal_mode = WAL;",
		// Set synchronous mode to NORMAL for better performance
		"PRAGMA synchronous = NORMAL;",
		// Increase cache size to 64MB for better performance
		"PRAGMA cache_size = -64000;",
		// Enable foreign key constraints
		"PRAGMA foreign_keys = ON;",
		// Set busy timeout to 30 seconds
		"PRAGMA busy_timeout = 30000;",
		// Optimize memory usage
		"PRAGMA temp_store = MEMORY;",
		// Set page size to 4KB for optimal performance
		"PRAGMA page_size = 4096;",
		// Enable automatic index creation for WHERE clauses
		"PRAGMA automatic_index = ON;",
	}

	for _, pragma := range optimizations {
		if _, err := DB.Exec(pragma); err != nil {
			logging.WithError(err).Warnf("Failed to apply optimization: %s", pragma)
		}
	}

	logging.Info("Database performance optimizations applied")
	return nil
}

// createIndexes creates database indexes for performance optimization
func createIndexes() error {
	indexes := []string{
		// User table indexes
		"CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);",
		"CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);",
		
		// Album table indexes
		"CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);",
		"CREATE INDEX IF NOT EXISTS idx_albums_created_at ON albums(created_at);",
		"CREATE INDEX IF NOT EXISTS idx_albums_location ON albums(latitude, longitude);",
		"CREATE INDEX IF NOT EXISTS idx_albums_user_created ON albums(user_id, created_at);",
		"CREATE INDEX IF NOT EXISTS idx_albums_user_location ON albums(user_id, latitude, longitude);",
		
		// Photo table indexes
		"CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id);",
		"CREATE INDEX IF NOT EXISTS idx_photos_order ON photos(album_id, display_order);",
		"CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(uploaded_at);",
		"CREATE INDEX IF NOT EXISTS idx_photos_album_order ON photos(album_id, display_order, uploaded_at);",
		
		// Path table indexes
		"CREATE INDEX IF NOT EXISTS idx_paths_user_id ON paths(user_id);",
		"CREATE INDEX IF NOT EXISTS idx_paths_from_album ON paths(from_album_id);",
		"CREATE INDEX IF NOT EXISTS idx_paths_to_album ON paths(to_album_id);",
		"CREATE INDEX IF NOT EXISTS idx_paths_user_from ON paths(user_id, from_album_id);",
		"CREATE INDEX IF NOT EXISTS idx_paths_created_at ON paths(created_at);",
	}

	for i, index := range indexes {
		if _, err := DB.Exec(index); err != nil {
			return fmt.Errorf("failed to create index %d: %w", i+1, err)
		}
	}

	logging.WithField("index_count", len(indexes)).Info("Database indexes created successfully")
	return nil
}

// Close closes the database connection
func Close() error {
	var errs []error
	
	if DB != nil {
		logging.Info("Closing database connection")
		if err := DB.Close(); err != nil {
			errs = append(errs, err)
		}
	}
	
	if err := CloseBlobStore(); err != nil {
		errs = append(errs, err)
	}
	
	if len(errs) > 0 {
		return fmt.Errorf("errors closing databases: %v", errs)
	}
	return nil
}

// GetDB returns the database connection
func GetDB() *sqlx.DB {
	return DB
}

// GetConnectionStats returns database connection pool statistics
func GetConnectionStats() map[string]interface{} {
	if DB == nil {
		return map[string]interface{}{
			"status": "disconnected",
		}
	}

	stats := DB.Stats()
	return map[string]interface{}{
		"status":             "connected",
		"max_open_conns":     stats.MaxOpenConnections,
		"open_conns":         stats.OpenConnections,
		"in_use":            stats.InUse,
		"idle":              stats.Idle,
		"wait_count":        stats.WaitCount,
		"wait_duration":     stats.WaitDuration.String(),
		"max_idle_closed":   stats.MaxIdleClosed,
		"max_idle_time_closed": stats.MaxIdleTimeClosed,
		"max_lifetime_closed":  stats.MaxLifetimeClosed,
	}
}

// HealthCheck performs a database health check
func HealthCheck() error {
	if DB == nil {
		return fmt.Errorf("database connection is nil")
	}

	// Test basic connectivity
	if err := DB.Ping(); err != nil {
		return fmt.Errorf("database ping failed: %w", err)
	}

	// Test a simple query
	var result int
	if err := DB.Get(&result, "SELECT 1"); err != nil {
		return fmt.Errorf("database query test failed: %w", err)
	}

	return nil
}

// AnalyzeDatabase runs ANALYZE command to update query planner statistics
func AnalyzeDatabase() error {
	if DB == nil {
		return fmt.Errorf("database connection is nil")
	}

	if _, err := DB.Exec("ANALYZE"); err != nil {
		return fmt.Errorf("failed to analyze database: %w", err)
	}

	logging.Info("Database analysis completed - query planner statistics updated")
	return nil
}

// VacuumDatabase runs VACUUM command to optimize database file
func VacuumDatabase() error {
	if DB == nil {
		return fmt.Errorf("database connection is nil")
	}

	logging.Info("Starting database vacuum operation")
	if _, err := DB.Exec("VACUUM"); err != nil {
		return fmt.Errorf("failed to vacuum database: %w", err)
	}

	logging.Info("Database vacuum completed - database file optimized")
	return nil
}