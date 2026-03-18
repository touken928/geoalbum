package service

import (
	"fmt"
	"io"
	"mime/multipart"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"geoalbum/backend/dao"
	"geoalbum/backend/database"
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

	// Generate unique photo ID
	photoID := uuid.New().String()

	// Read file content
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	data, err := io.ReadAll(src)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// Store in bbolt with key format: userID/photoID
	blobKey := fmt.Sprintf("%s/%s", userID, photoID)
	if err := database.SaveBlob(database.PhotoBucket, blobKey, data); err != nil {
		return nil, fmt.Errorf("failed to save photo to blob store: %w", err)
	}

	// Get next display order
	existingPhotos, err := s.photoDAO.GetByAlbumID(albumID)
	if err != nil {
		// Clean up blob if database query fails
		database.DeleteBlob(database.PhotoBucket, blobKey)
		return nil, fmt.Errorf("failed to get existing photos: %w", err)
	}
	displayOrder := len(existingPhotos)

	// Create photo record
	photo := &model.Photo{
		ID:           photoID,
		AlbumID:      albumID,
		Filename:     file.Filename,
		FilePath:     blobKey, // Store blob key instead of file path
		FileSize:     file.Size,
		MimeType:     file.Header.Get("Content-Type"),
		DisplayOrder: displayOrder,
		UploadedAt:   time.Now(),
		URL:          fmt.Sprintf("/api/photos/%s/file", photoID),
	}

	if err := s.photoDAO.Create(photo); err != nil {
		// Clean up blob if database insert fails
		database.DeleteBlob(database.PhotoBucket, blobKey)
		return nil, fmt.Errorf("failed to create photo record: %w", err)
	}

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

// PaginatedPhotosResult represents the result of a paginated photo query
type PaginatedPhotosResult struct {
	Photos     []model.Photo `json:"photos"`
	Total      int           `json:"total"`
	Offset     int           `json:"offset"`
	Limit      int           `json:"limit"`
	HasMore    bool          `json:"has_more"`
}

// GetPhotosByAlbumIDPaginated retrieves photos for an album with pagination
func (s *PhotoService) GetPhotosByAlbumIDPaginated(albumID, userID string, offset, limit int) (*PaginatedPhotosResult, error) {
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

	photos, total, err := s.photoDAO.GetByAlbumIDPaginated(albumID, offset, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get photos: %w", err)
	}

	// Set URLs for photos
	for i := range photos {
		photos[i].URL = fmt.Sprintf("/api/photos/%s/file", photos[i].ID)
	}

	return &PaginatedPhotosResult{
		Photos:  photos,
		Total:   total,
		Offset:  offset,
		Limit:   limit,
		HasMore: offset+len(photos) < total,
	}, nil
}

// GetPhotoCount returns the total number of photos in an album
func (s *PhotoService) GetPhotoCount(albumID, userID string) (int, error) {
	// Verify album exists and belongs to user
	album, err := s.albumDAO.GetByID(albumID)
	if err != nil {
		return 0, fmt.Errorf("failed to get album: %w", err)
	}
	if album == nil {
		return 0, fmt.Errorf("album not found")
	}
	if album.UserID != userID {
		return 0, fmt.Errorf("access denied: album does not belong to user")
	}

	var total int
	countQuery := `SELECT COUNT(*) FROM photos WHERE album_id = ?`
	err = database.DB.Get(&total, countQuery, albumID)
	if err != nil {
		return 0, fmt.Errorf("failed to get photo count: %w", err)
	}
	return total, nil
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

	// Delete from blob store
	if err := database.DeleteBlob(database.PhotoBucket, photo.FilePath); err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Warning: failed to delete blob %s: %v\n", photo.FilePath, err)
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

// GetPhotoData returns the photo binary data for serving
func (s *PhotoService) GetPhotoData(photoID, userID string) ([]byte, string, error) {
	photo, err := s.GetPhotoByID(photoID, userID)
	if err != nil {
		return nil, "", err
	}

	// Get data from blob store
	data, err := database.GetBlob(database.PhotoBucket, photo.FilePath)
	if err != nil {
		return nil, "", fmt.Errorf("photo file not found: %w", err)
	}

	return data, photo.MimeType, nil
}

// GetPhotoFile returns the file path for serving the photo file (deprecated, kept for compatibility)
func (s *PhotoService) GetPhotoFile(photoID, userID string) (string, error) {
	photo, err := s.GetPhotoByID(photoID, userID)
	if err != nil {
		return "", err
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

// DeleteUserPhotos deletes all photos for a user from blob store
func (s *PhotoService) DeleteUserPhotos(userID string) error {
	// Delete all blobs with prefix userID/
	prefix := userID + "/"
	if err := database.DeleteBlobsByPrefix(database.PhotoBucket, prefix); err != nil {
		return fmt.Errorf("failed to delete user photos: %w", err)
	}
	return nil
}

// DeleteUserPhotosDirectory is deprecated, use DeleteUserPhotos instead
func (s *PhotoService) DeleteUserPhotosDirectory(userID string) error {
	return s.DeleteUserPhotos(userID)
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
