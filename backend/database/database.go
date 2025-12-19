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

	logging.Info("Database tables created successfully")
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
	if DB != nil {
		logging.Info("Closing database connection")
		return DB.Close()
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