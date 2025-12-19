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
		SELECT id, user_id, title, description, latitude, longitude, created_at, updated_at
		FROM albums 
		WHERE user_id = ? 
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
			SELECT id, user_id, title, description, latitude, longitude, created_at, updated_at
			FROM albums 
			WHERE user_id = ? AND created_at >= ? AND created_at <= ?
			ORDER BY created_at DESC
		`
		args = []interface{}{userID, startDate, endDate}
	} else if startDate != nil {
		query = `
			SELECT id, user_id, title, description, latitude, longitude, created_at, updated_at
			FROM albums 
			WHERE user_id = ? AND created_at >= ?
			ORDER BY created_at DESC
		`
		args = []interface{}{userID, startDate}
	} else if endDate != nil {
		query = `
			SELECT id, user_id, title, description, latitude, longitude, created_at, updated_at
			FROM albums 
			WHERE user_id = ? AND created_at <= ?
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