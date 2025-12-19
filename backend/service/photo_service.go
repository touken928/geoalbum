package service

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"geoalbum/backend/dao"
	"geoalbum/backend/middleware"
	"geoalbum/backend/model"
)

type PhotoService struct {
	photoDAO *dao.PhotoDAO
	albumDAO *dao.AlbumDAO
}

func NewPhotoService() *PhotoService {
	return &PhotoService{
		photoDAO: dao.NewPhotoDAO(),
		albumDAO: dao.NewAlbumDAO(),
	}
}

// UploadPhoto uploads a photo to an album
func (s *PhotoService) UploadPhoto(albumID, userID string, file *multipart.FileHeader) (*model.Photo, error) {
	// Verify album exists and belongs to user
	album, err := s.albumDAO.GetByID(albumID)
	if err != nil {
		return nil, fmt.Errorf("failed to get album: %w", err)
	}
	if album == nil {
		return nil, fmt.Errorf("album not found")
	}
	if album.UserID != userID {
		return nil, fmt.Errorf("access denied: album does not belong to user")
	}

	// Validate file type
	if !s.isValidImageType(file.Header.Get("Content-Type")) {
		return nil, fmt.Errorf("invalid file type: only JPEG, PNG, and HEIC are supported")
	}

	// Create uploads directory if it doesn't exist
	uploadsDir := "data/uploads"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create uploads directory: %w", err)
	}

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	filename := uuid.New().String() + ext
	filePath := filepath.Join(uploadsDir, filename)

	// Save file to disk
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	dst, err := os.Create(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// Get next display order
	existingPhotos, err := s.photoDAO.GetByAlbumID(albumID)
	if err != nil {
		return nil, fmt.Errorf("failed to get existing photos: %w", err)
	}
	displayOrder := len(existingPhotos)

	// Create photo record
	photo := &model.Photo{
		ID:           uuid.New().String(),
		AlbumID:      albumID,
		Filename:     file.Filename,
		FilePath:     filePath,
		FileSize:     file.Size,
		MimeType:     file.Header.Get("Content-Type"),
		DisplayOrder: displayOrder,
		UploadedAt:   time.Now(),
		URL:          fmt.Sprintf("/api/photos/%s/file", uuid.New().String()),
	}

	if err := s.photoDAO.Create(photo); err != nil {
		// Clean up file if database insert fails
		os.Remove(filePath)
		return nil, fmt.Errorf("failed to create photo record: %w", err)
	}

	// Set the correct URL with the photo ID
	photo.URL = fmt.Sprintf("/api/photos/%s/file", photo.ID)

	return photo, nil
}

// GetPhotosByAlbumID retrieves all photos for an album
func (s *PhotoService) GetPhotosByAlbumID(albumID, userID string) ([]model.Photo, error) {
	// Verify album exists and belongs to user
	album, err := s.albumDAO.GetByID(albumID)
	if err != nil {
		return nil, fmt.Errorf("failed to get album: %w", err)
	}
	if album == nil {
		return nil, fmt.Errorf("album not found")
	}
	if album.UserID != userID {
		return nil, fmt.Errorf("access denied: album does not belong to user")
	}

	photos, err := s.photoDAO.GetByAlbumID(albumID)
	if err != nil {
		return nil, fmt.Errorf("failed to get photos: %w", err)
	}

	// Set URLs for photos
	for i := range photos {
		photos[i].URL = fmt.Sprintf("/api/photos/%s/file", photos[i].ID)
	}

	return photos, nil
}

// GetPhotoByID retrieves a photo by ID and verifies user access
func (s *PhotoService) GetPhotoByID(photoID, userID string) (*model.Photo, error) {
	photo, err := s.photoDAO.GetByID(photoID)
	if err != nil {
		return nil, fmt.Errorf("failed to get photo: %w", err)
	}
	if photo == nil {
		return nil, fmt.Errorf("photo not found")
	}

	// Verify album belongs to user
	album, err := s.albumDAO.GetByID(photo.AlbumID)
	if err != nil {
		return nil, fmt.Errorf("failed to get album: %w", err)
	}
	if album == nil {
		return nil, fmt.Errorf("album not found")
	}
	if album.UserID != userID {
		return nil, fmt.Errorf("access denied: photo does not belong to user")
	}

	photo.URL = fmt.Sprintf("/api/photos/%s/file", photo.ID)
	return photo, nil
}

// DeletePhoto deletes a photo
func (s *PhotoService) DeletePhoto(photoID, userID string) error {
	photo, err := s.GetPhotoByID(photoID, userID)
	if err != nil {
		return err
	}

	// Delete file from disk
	if err := os.Remove(photo.FilePath); err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Warning: failed to delete file %s: %v\n", photo.FilePath, err)
	}

	// Delete from database
	if err := s.photoDAO.Delete(photoID); err != nil {
		return fmt.Errorf("failed to delete photo from database: %w", err)
	}

	return nil
}

// UpdatePhotoOrder updates the display order of photos in an album
func (s *PhotoService) UpdatePhotoOrder(photoID, userID string, newOrder int) error {
	// Verify photo exists and user has access
	_, err := s.GetPhotoByID(photoID, userID)
	if err != nil {
		return err
	}

	if err := s.photoDAO.UpdateOrder(photoID, newOrder); err != nil {
		return fmt.Errorf("failed to update photo order: %w", err)
	}

	return nil
}

// GetPhotoFile returns the file path for serving the photo file
func (s *PhotoService) GetPhotoFile(photoID, userID string) (string, error) {
	photo, err := s.GetPhotoByID(photoID, userID)
	if err != nil {
		return "", err
	}

	// Check if file exists
	if _, err := os.Stat(photo.FilePath); os.IsNotExist(err) {
		return "", fmt.Errorf("photo file not found")
	}

	return photo.FilePath, nil
}

// isValidImageType checks if the MIME type is supported
func (s *PhotoService) isValidImageType(mimeType string) bool {
	validTypes := []string{
		"image/jpeg",
		"image/jpg",
		"image/png",
		"image/heic",
		"image/heif",
	}

	mimeType = strings.ToLower(mimeType)
	for _, validType := range validTypes {
		if mimeType == validType {
			return true
		}
	}
	return false
}

// TokenClaims represents the JWT claims for photo access
type TokenClaims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// ValidateToken validates a JWT token and returns the claims
func (s *PhotoService) ValidateToken(tokenString string) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		return middleware.GetJWTSecret(), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(*TokenClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}