package dao

import (
	"database/sql"
	"fmt"

	"geoalbum/backend/database"
	"geoalbum/backend/model"
)

type PathDAO struct{}

func NewPathDAO() *PathDAO {
	return &PathDAO{}
}

// Create creates a new path in the database
func (dao *PathDAO) Create(path *model.Path) error {
	query := `
		INSERT INTO paths (id, user_id, from_album_id, to_album_id, created_at)
		VALUES (?, ?, ?, ?, ?)
	`
	_, err := database.DB.Exec(query, path.ID, path.UserID, path.FromAlbumID, path.ToAlbumID, path.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create path: %w", err)
	}
	return nil
}

// GetByUserID retrieves all paths for a specific user
func (dao *PathDAO) GetByUserID(userID string) ([]model.Path, error) {
	var paths []model.Path
	query := `
		SELECT id, user_id, from_album_id, to_album_id, created_at
		FROM paths 
		WHERE user_id = ? 
		ORDER BY created_at DESC
	`
	err := database.DB.Select(&paths, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get paths by user ID: %w", err)
	}
	return paths, nil
}

// GetByID retrieves a path by ID
func (dao *PathDAO) GetByID(id string) (*model.Path, error) {
	var path model.Path
	query := `
		SELECT id, user_id, from_album_id, to_album_id, created_at
		FROM paths 
		WHERE id = ?
	`
	err := database.DB.Get(&path, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get path by ID: %w", err)
	}
	return &path, nil
}

// GetByFromAlbumID retrieves paths starting from a specific album
func (dao *PathDAO) GetByFromAlbumID(fromAlbumID string) ([]model.Path, error) {
	var paths []model.Path
	query := `
		SELECT id, user_id, from_album_id, to_album_id, created_at
		FROM paths 
		WHERE from_album_id = ?
		ORDER BY created_at DESC
	`
	err := database.DB.Select(&paths, query, fromAlbumID)
	if err != nil {
		return nil, fmt.Errorf("failed to get paths by from_album_id: %w", err)
	}
	return paths, nil
}

// Delete deletes a path from the database
func (dao *PathDAO) Delete(id, userID string) error {
	query := `DELETE FROM paths WHERE id = ? AND user_id = ?`
	_, err := database.DB.Exec(query, id, userID)
	if err != nil {
		return fmt.Errorf("failed to delete path: %w", err)
	}
	return nil
}

// DeleteByFromAlbumID deletes all paths starting from a specific album
func (dao *PathDAO) DeleteByFromAlbumID(fromAlbumID, userID string) error {
	query := `DELETE FROM paths WHERE from_album_id = ? AND user_id = ?`
	_, err := database.DB.Exec(query, fromAlbumID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete paths by from_album_id: %w", err)
	}
	return nil
}

// CheckPathExists checks if a path already exists between two albums
func (dao *PathDAO) CheckPathExists(fromAlbumID, toAlbumID, userID string) (bool, error) {
	var count int
	query := `SELECT COUNT(*) FROM paths WHERE from_album_id = ? AND to_album_id = ? AND user_id = ?`
	err := database.DB.Get(&count, query, fromAlbumID, toAlbumID, userID)
	if err != nil {
		return false, fmt.Errorf("failed to check path existence: %w", err)
	}
	return count > 0, nil
}