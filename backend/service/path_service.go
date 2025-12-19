package service

import (
	"fmt"
	"time"

	"github.com/google/uuid"

	"geoalbum/backend/dao"
	"geoalbum/backend/model"
)

type PathService struct {
	pathDAO  *dao.PathDAO
	albumDAO *dao.AlbumDAO
}

func NewPathService() *PathService {
	return &PathService{
		pathDAO:  dao.NewPathDAO(),
		albumDAO: dao.NewAlbumDAO(),
	}
}

// CreatePath creates a new path between two albums
func (s *PathService) CreatePath(userID, fromAlbumID, toAlbumID string) (*model.Path, error) {
	// Validate that both albums exist and belong to the user
	fromAlbum, err := s.albumDAO.GetByID(fromAlbumID)
	if err != nil {
		return nil, fmt.Errorf("failed to get from album: %w", err)
	}
	if fromAlbum == nil {
		return nil, fmt.Errorf("from album not found")
	}
	if fromAlbum.UserID != userID {
		return nil, fmt.Errorf("access denied: from album does not belong to user")
	}

	toAlbum, err := s.albumDAO.GetByID(toAlbumID)
	if err != nil {
		return nil, fmt.Errorf("failed to get to album: %w", err)
	}
	if toAlbum == nil {
		return nil, fmt.Errorf("to album not found")
	}
	if toAlbum.UserID != userID {
		return nil, fmt.Errorf("access denied: to album does not belong to user")
	}

	// Check if path already exists
	exists, err := s.pathDAO.CheckPathExists(fromAlbumID, toAlbumID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check path existence: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("path already exists between these albums")
	}

	// Create the path
	path := &model.Path{
		ID:          uuid.New().String(),
		UserID:      userID,
		FromAlbumID: fromAlbumID,
		ToAlbumID:   toAlbumID,
		CreatedAt:   time.Now(),
	}

	if err := s.pathDAO.Create(path); err != nil {
		return nil, fmt.Errorf("failed to create path: %w", err)
	}

	// Load album details for response
	path.FromAlbum = fromAlbum
	path.ToAlbum = toAlbum

	return path, nil
}

// GetPathsByUserID retrieves all paths for a user with album details
func (s *PathService) GetPathsByUserID(userID string) ([]model.Path, error) {
	paths, err := s.pathDAO.GetByUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get paths: %w", err)
	}

	// Load album details for each path
	for i := range paths {
		fromAlbum, err := s.albumDAO.GetByID(paths[i].FromAlbumID)
		if err != nil {
			return nil, fmt.Errorf("failed to get from album for path %s: %w", paths[i].ID, err)
		}
		paths[i].FromAlbum = fromAlbum

		toAlbum, err := s.albumDAO.GetByID(paths[i].ToAlbumID)
		if err != nil {
			return nil, fmt.Errorf("failed to get to album for path %s: %w", paths[i].ID, err)
		}
		paths[i].ToAlbum = toAlbum
	}

	return paths, nil
}

// GetPathByID retrieves a path by ID and ensures it belongs to the user
func (s *PathService) GetPathByID(id, userID string) (*model.Path, error) {
	path, err := s.pathDAO.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get path: %w", err)
	}
	if path == nil {
		return nil, fmt.Errorf("path not found")
	}
	if path.UserID != userID {
		return nil, fmt.Errorf("access denied: path does not belong to user")
	}

	// Load album details
	fromAlbum, err := s.albumDAO.GetByID(path.FromAlbumID)
	if err != nil {
		return nil, fmt.Errorf("failed to get from album: %w", err)
	}
	path.FromAlbum = fromAlbum

	toAlbum, err := s.albumDAO.GetByID(path.ToAlbumID)
	if err != nil {
		return nil, fmt.Errorf("failed to get to album: %w", err)
	}
	path.ToAlbum = toAlbum

	return path, nil
}

// DeletePath deletes a path
func (s *PathService) DeletePath(id, userID string) error {
	// First check if path exists and belongs to user
	_, err := s.GetPathByID(id, userID)
	if err != nil {
		return err
	}

	if err := s.pathDAO.Delete(id, userID); err != nil {
		return fmt.Errorf("failed to delete path: %w", err)
	}

	return nil
}

// SetNextDestination sets or updates the "next destination" for an album
// This replaces any existing path from the album
func (s *PathService) SetNextDestination(userID, fromAlbumID, toAlbumID string) (*model.Path, error) {
	// First delete any existing paths from this album
	if err := s.pathDAO.DeleteByFromAlbumID(fromAlbumID, userID); err != nil {
		return nil, fmt.Errorf("failed to delete existing paths: %w", err)
	}

	// Create new path
	return s.CreatePath(userID, fromAlbumID, toAlbumID)
}

// GetNextDestination gets the next destination album for a given album
func (s *PathService) GetNextDestination(fromAlbumID, userID string) (*model.Album, error) {
	paths, err := s.pathDAO.GetByFromAlbumID(fromAlbumID)
	if err != nil {
		return nil, fmt.Errorf("failed to get paths from album: %w", err)
	}

	if len(paths) == 0 {
		return nil, nil // No next destination
	}

	// Get the first path (there should only be one for "next destination")
	path := paths[0]
	if path.UserID != userID {
		return nil, fmt.Errorf("access denied: path does not belong to user")
	}

	toAlbum, err := s.albumDAO.GetByID(path.ToAlbumID)
	if err != nil {
		return nil, fmt.Errorf("failed to get destination album: %w", err)
	}

	return toAlbum, nil
}

// RemoveNextDestination removes the "next destination" for an album
func (s *PathService) RemoveNextDestination(fromAlbumID, userID string) error {
	return s.pathDAO.DeleteByFromAlbumID(fromAlbumID, userID)
}