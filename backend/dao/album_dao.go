package dao

import (
	"database/sql"
	"fmt"
	"time"

	"geoalbum/backend/database"
	"geoalbum/backend/model"
)

type AlbumDAO struct{}

func NewAlbumDAO() *AlbumDAO {
	return &AlbumDAO{}
}

// Create creates a new album in the database
func (dao *AlbumDAO) Create(album *model.Album) error {
	query := `
		INSERT INTO albums (id, user_id, title, description, latitude, longitude, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`
	_, err := database.DB.Exec(query, album.ID, album.UserID, album.Title, album.Description, 
		album.Latitude, album.Longitude, album.CreatedAt, album.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create album: %w", err)
	}
	return nil
}

// GetByUserID retrieves all albums for a specific user
func (dao *AlbumDAO) GetByUserID(userID string) ([]model.Album, error) {
	var albums []model.Album
	query := `
		SELECT
			a.id, a.user_id, a.title, a.description, a.latitude, a.longitude, a.created_at, a.updated_at,
			COALESCE(pc.photo_count, 0) AS photo_count
		FROM albums a
		LEFT JOIN (
			SELECT album_id, COUNT(*) AS photo_count
			FROM photos
			GROUP BY album_id
		) pc ON pc.album_id = a.id
		WHERE a.user_id = ?
		ORDER BY created_at DESC
	`
	err := database.DB.Select(&albums, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get albums by user ID: %w", err)
	}
	return albums, nil
}

// GetByUserIDAndTimeRange retrieves albums for a user within a time range
func (dao *AlbumDAO) GetByUserIDAndTimeRange(userID string, startDate, endDate *time.Time) ([]model.Album, error) {
	var albums []model.Album
	var query string
	var args []interface{}

	if startDate != nil && endDate != nil {
		query = `
			SELECT
				a.id, a.user_id, a.title, a.description, a.latitude, a.longitude, a.created_at, a.updated_at,
				COALESCE(pc.photo_count, 0) AS photo_count
			FROM albums a
			LEFT JOIN (
				SELECT album_id, COUNT(*) AS photo_count
				FROM photos
				GROUP BY album_id
			) pc ON pc.album_id = a.id
			WHERE a.user_id = ? AND a.created_at >= ? AND a.created_at <= ?
			ORDER BY created_at DESC
		`
		args = []interface{}{userID, startDate, endDate}
	} else if startDate != nil {
		query = `
			SELECT
				a.id, a.user_id, a.title, a.description, a.latitude, a.longitude, a.created_at, a.updated_at,
				COALESCE(pc.photo_count, 0) AS photo_count
			FROM albums a
			LEFT JOIN (
				SELECT album_id, COUNT(*) AS photo_count
				FROM photos
				GROUP BY album_id
			) pc ON pc.album_id = a.id
			WHERE a.user_id = ? AND a.created_at >= ?
			ORDER BY created_at DESC
		`
		args = []interface{}{userID, startDate}
	} else if endDate != nil {
		query = `
			SELECT
				a.id, a.user_id, a.title, a.description, a.latitude, a.longitude, a.created_at, a.updated_at,
				COALESCE(pc.photo_count, 0) AS photo_count
			FROM albums a
			LEFT JOIN (
				SELECT album_id, COUNT(*) AS photo_count
				FROM photos
				GROUP BY album_id
			) pc ON pc.album_id = a.id
			WHERE a.user_id = ? AND a.created_at <= ?
			ORDER BY created_at DESC
		`
		args = []interface{}{userID, endDate}
	} else {
		return dao.GetByUserID(userID)
	}

	err := database.DB.Select(&albums, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get albums by time range: %w", err)
	}
	return albums, nil
}

// GetByID retrieves an album by ID
func (dao *AlbumDAO) GetByID(id string) (*model.Album, error) {
	var album model.Album
	query := `
		SELECT id, user_id, title, description, latitude, longitude, created_at, updated_at
		FROM albums 
		WHERE id = ?
	`
	err := database.DB.Get(&album, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get album by ID: %w", err)
	}
	return &album, nil
}

// Update updates an album in the database
func (dao *AlbumDAO) Update(album *model.Album) error {
	query := `
		UPDATE albums 
		SET title = ?, description = ?, updated_at = ?
		WHERE id = ? AND user_id = ?
	`
	_, err := database.DB.Exec(query, album.Title, album.Description, album.UpdatedAt, album.ID, album.UserID)
	if err != nil {
		return fmt.Errorf("failed to update album: %w", err)
	}
	return nil
}

// Delete deletes an album from the database
func (dao *AlbumDAO) Delete(id, userID string) error {
	query := `DELETE FROM albums WHERE id = ? AND user_id = ?`
	_, err := database.DB.Exec(query, id, userID)
	if err != nil {
		return fmt.Errorf("failed to delete album: %w", err)
	}
	return nil
}

// GetByUserIDInBBox returns albums within a bounding box, using the spatial index.
// west/east are longitude degrees, south/north are latitude degrees.
func (dao *AlbumDAO) GetByUserIDInBBox(userID string, west, south, east, north float64, limit int) ([]model.Album, error) {
	var albums []model.Album
	if limit <= 0 {
		limit = 5000
	}

	query := `
		SELECT
			a.id, a.user_id, a.title, a.description, a.latitude, a.longitude, a.created_at, a.updated_at,
			COALESCE(pc.photo_count, 0) AS photo_count
		FROM albums_rtree r
		JOIN album_spatial s ON s.spatial_id = r.id
		JOIN albums a ON a.id = s.album_id
		LEFT JOIN (
			SELECT album_id, COUNT(*) AS photo_count
			FROM photos
			GROUP BY album_id
		) pc ON pc.album_id = a.id
		WHERE
			s.user_id = ?
			AND r.min_lon <= ? AND r.max_lon >= ?
			AND r.min_lat <= ? AND r.max_lat >= ?
		ORDER BY a.created_at DESC
		LIMIT ?
	`

	err := database.DB.Select(&albums, query, userID, east, west, north, south, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get albums in bbox: %w", err)
	}
	return albums, nil
}

type AlbumClusterRow struct {
	Longitude float64 `db:"longitude" json:"longitude"`
	Latitude  float64 `db:"latitude" json:"latitude"`
	Count     int     `db:"count" json:"count"`
	West      float64 `db:"west" json:"west"`
	South     float64 `db:"south" json:"south"`
	East      float64 `db:"east" json:"east"`
	North     float64 `db:"north" json:"north"`
}

// GetClustersByUserIDInBBox aggregates albums into grid clusters within a bounding box.
func (dao *AlbumDAO) GetClustersByUserIDInBBox(userID string, west, south, east, north float64, gridSize int) ([]AlbumClusterRow, error) {
	var clusters []AlbumClusterRow
	if gridSize <= 0 {
		gridSize = 64
	}
	if gridSize > 256 {
		gridSize = 256
	}

	lonSpan := east - west
	latSpan := north - south
	if lonSpan <= 0 || latSpan <= 0 {
		return []AlbumClusterRow{}, nil
	}

	cellLon := lonSpan / float64(gridSize)
	cellLat := latSpan / float64(gridSize)
	// Avoid division by zero for pathological bbox
	if cellLon <= 0 {
		cellLon = 1e-9
	}
	if cellLat <= 0 {
		cellLat = 1e-9
	}

	query := `
		WITH candidates AS (
			SELECT a.longitude AS lon, a.latitude AS lat
			FROM albums_rtree r
			JOIN album_spatial s ON s.spatial_id = r.id
			JOIN albums a ON a.id = s.album_id
			WHERE
				s.user_id = ?
				AND r.min_lon <= ? AND r.max_lon >= ?
				AND r.min_lat <= ? AND r.max_lat >= ?
		)
		, binned AS (
			SELECT
				lon,
				lat,
				CAST((lon - ?) / ? AS INTEGER) AS gx,
				CAST((lat - ?) / ? AS INTEGER) AS gy
			FROM candidates
		)
		SELECT
			AVG(lon) AS longitude,
			AVG(lat) AS latitude,
			COUNT(*) AS count,
			(? + (? * gx)) AS west,
			(? + (? * gy)) AS south,
			(? + (? * (gx + 1))) AS east,
			(? + (? * (gy + 1))) AS north
		FROM binned
		GROUP BY gx, gy
	`

	err := database.DB.Select(&clusters, query,
		userID,
		east, west, north, south,
		// binned gx/gy
		west, cellLon, south, cellLat,
		// bbox reconstruction
		west, cellLon,
		south, cellLat,
		west, cellLon,
		south, cellLat,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get album clusters in bbox: %w", err)
	}
	return clusters, nil
}