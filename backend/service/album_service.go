package service

import (
	"fmt"
	"time"

	"github.com/google/uuid"

	"geoalbum/backend/dao"
	"geoalbum/backend/middleware"
	"geoalbum/backend/model"
)

type AlbumService struct {
	albumDAO  *dao.AlbumDAO
	photoDAO  *dao.PhotoDAO
	sanitizer *middleware.InputSanitizer
}

func NewAlbumService() *AlbumService {
	return &AlbumService{
		albumDAO:  dao.NewAlbumDAO(),
		photoDAO:  dao.NewPhotoDAO(),
		sanitizer: middleware.GetInputSanitizer(),
	}
}

// CreateAlbum creates a new album
func (s *AlbumService) CreateAlbum(userID, title, description string, latitude, longitude float64, createdAt time.Time) (*model.Album, error) {
	// Validate and sanitize input
	title = s.sanitizer.SanitizeString(title)
	description = s.sanitizer.SanitizeString(description)
	
	// Validate input
	if !s.sanitizer.ValidateAlbumTitle(title) {
		return nil, fmt.Errorf("invalid album title: must be 1-200 characters")
	}
	
	if !s.sanitizer.ValidateAlbumDescription(description) {
		return nil, fmt.Errorf("invalid album description: must be max 2000 characters")
	}
	
	if !s.sanitizer.ValidateCoordinates(latitude, longitude) {
		return nil, fmt.Errorf("invalid coordinates: latitude must be -90 to 90, longitude must be -180 to 180")
	}
	
	// Check for SQL injection patterns
	if s.sanitizer.DetectSQLInjection(title) || s.sanitizer.DetectSQLInjection(description) {
		return nil, fmt.Errorf("invalid input: contains prohibited characters")
	}

	album := &model.Album{
		ID:          uuid.New().String(),
		UserID:      userID,
		Title:       title,
		Description: description,
		Latitude:    latitude,
		Longitude:   longitude,
		CreatedAt:   createdAt,
		UpdatedAt:   time.Now(),
	}

	if err := s.albumDAO.Create(album); err != nil {
		return nil, fmt.Errorf("failed to create album: %w", err)
	}

	return album, nil
}

// GetAlbumsByUserID retrieves all albums for a user
func (s *AlbumService) GetAlbumsByUserID(userID string) ([]model.Album, error) {
	albums, err := s.albumDAO.GetByUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get albums: %w", err)
	}

	// Add photo count for each album
	for i := range albums {
		photos, err := s.photoDAO.GetByAlbumID(albums[i].ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get photo count for album %s: %w", albums[i].ID, err)
		}
		albums[i].PhotoCount = len(photos)
	}

	return albums, nil
}

// GetAlbumsByUserIDAndTimeRange retrieves albums for a user within a time range
func (s *AlbumService) GetAlbumsByUserIDAndTimeRange(userID string, startDate, endDate *time.Time) ([]model.Album, error) {
	albums, err := s.albumDAO.GetByUserIDAndTimeRange(userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get albums by time range: %w", err)
	}

	// Add photo count for each album
	for i := range albums {
		photos, err := s.photoDAO.GetByAlbumID(albums[i].ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get photo count for album %s: %w", albums[i].ID, err)
		}
		albums[i].PhotoCount = len(photos)
	}

	return albums, nil
}

// GetAlbumByID retrieves an album by ID and ensures it belongs to the user
func (s *AlbumService) GetAlbumByID(id, userID string) (*model.Album, error) {
	album, err := s.albumDAO.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get album: %w", err)
	}
	if album == nil {
		return nil, fmt.Errorf("album not found")
	}
	if album.UserID != userID {
		return nil, fmt.Errorf("access denied: album does not belong to user")
	}

	// Load photos
	photos, err := s.photoDAO.GetByAlbumID(album.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get album photos: %w", err)
	}
	album.Photos = photos
	album.PhotoCount = len(photos)

	return album, nil
}

// UpdateAlbum updates an album
func (s *AlbumService) UpdateAlbum(id, userID, title, description string) (*model.Album, error) {
	// Validate and sanitize input
	title = s.sanitizer.SanitizeString(title)
	description = s.sanitizer.SanitizeString(description)
	
	// Validate input
	if title != "" && !s.sanitizer.ValidateAlbumTitle(title) {
		return nil, fmt.Errorf("invalid album title: must be 1-200 characters")
	}
	
	if !s.sanitizer.ValidateAlbumDescription(description) {
		return nil, fmt.Errorf("invalid album description: must be max 2000 characters")
	}
	
	// Check for SQL injection patterns
	if s.sanitizer.DetectSQLInjection(title) || s.sanitizer.DetectSQLInjection(description) {
		return nil, fmt.Errorf("invalid input: contains prohibited characters")
	}

	// First check if album exists and belongs to user
	album, err := s.GetAlbumByID(id, userID)
	if err != nil {
		return nil, err
	}

	// Update fields
	if title != "" {
		album.Title = title
	}
	album.Description = description
	album.UpdatedAt = time.Now()

	if err := s.albumDAO.Update(album); err != nil {
		return nil, fmt.Errorf("failed to update album: %w", err)
	}

	return album, nil
}

// DeleteAlbum deletes an album
func (s *AlbumService) DeleteAlbum(id, userID string) error {
	// First check if album exists and belongs to user
	_, err := s.GetAlbumByID(id, userID)
	if err != nil {
		return err
	}

	if err := s.albumDAO.Delete(id, userID); err != nil {
		return fmt.Errorf("failed to delete album: %w", err)
	}

	return nil
}