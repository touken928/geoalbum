package dao

import (
	"database/sql"
	"fmt"

	"geoalbum/backend/database"
	"geoalbum/backend/model"
)

type PhotoDAO struct{}

func NewPhotoDAO() *PhotoDAO {
	return &PhotoDAO{}
}

// Create creates a new photo in the database
func (dao *PhotoDAO) Create(photo *model.Photo) error {
	query := `
		INSERT INTO photos (id, album_id, filename, file_path, file_size, mime_type, display_order, uploaded_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`
	_, err := database.DB.Exec(query, photo.ID, photo.AlbumID, photo.Filename, photo.FilePath,
		photo.FileSize, photo.MimeType, photo.DisplayOrder, photo.UploadedAt)
	if err != nil {
		return fmt.Errorf("failed to create photo: %w", err)
	}
	return nil
}

// GetByAlbumID retrieves all photos for a specific album
func (dao *PhotoDAO) GetByAlbumID(albumID string) ([]model.Photo, error) {
	var photos []model.Photo
	query := `
		SELECT id, album_id, filename, file_path, file_size, mime_type, display_order, uploaded_at
		FROM photos 
		WHERE album_id = ? 
		ORDER BY display_order ASC, uploaded_at ASC
	`
	err := database.DB.Select(&photos, query, albumID)
	if err != nil {
		return nil, fmt.Errorf("failed to get photos by album ID: %w", err)
	}
	return photos, nil
}

// GetByID retrieves a photo by ID
func (dao *PhotoDAO) GetByID(id string) (*model.Photo, error) {
	var photo model.Photo
	query := `
		SELECT id, album_id, filename, file_path, file_size, mime_type, display_order, uploaded_at
		FROM photos 
		WHERE id = ?
	`
	err := database.DB.Get(&photo, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get photo by ID: %w", err)
	}
	return &photo, nil
}

// UpdateOrder updates the display order of a photo
func (dao *PhotoDAO) UpdateOrder(id string, order int) error {
	query := `UPDATE photos SET display_order = ? WHERE id = ?`
	_, err := database.DB.Exec(query, order, id)
	if err != nil {
		return fmt.Errorf("failed to update photo order: %w", err)
	}
	return nil
}

// Delete deletes a photo from the database
func (dao *PhotoDAO) Delete(id string) error {
	query := `DELETE FROM photos WHERE id = ?`
	_, err := database.DB.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete photo: %w", err)
	}
	return nil
}