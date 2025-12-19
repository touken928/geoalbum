package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"

	"geoalbum/backend/service"
)

type PathController struct {
	pathService *service.PathService
}

func NewPathController() *PathController {
	return &PathController{
		pathService: service.NewPathService(),
	}
}

type CreatePathRequest struct {
	FromAlbumID string `json:"from_album_id" binding:"required"`
	ToAlbumID   string `json:"to_album_id" binding:"required"`
}

type SetNextDestinationRequest struct {
	ToAlbumID string `json:"to_album_id" binding:"required"`
}

// CreatePath creates a new path between two albums
func (ctrl *PathController) CreatePath(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": map[string]interface{}{
				"code":    "UNAUTHORIZED",
				"message": "User not authenticated",
			},
		})
		return
	}

	var req CreatePathRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid request data",
				"details": err.Error(),
			},
		})
		return
	}

	// Validate that from and to albums are different
	if req.FromAlbumID == req.ToAlbumID {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "INVALID_PATH",
				"message": "Cannot create path from album to itself",
			},
		})
		return
	}

	path, err := ctrl.pathService.CreatePath(userID, req.FromAlbumID, req.ToAlbumID)
	if err != nil {
		logrus.WithError(err).Error("Failed to create path")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": map[string]interface{}{
				"code":    "PATH_CREATION_FAILED",
				"message": "Failed to create path",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, path)
}

// GetPaths retrieves all paths for the authenticated user
func (ctrl *PathController) GetPaths(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": map[string]interface{}{
				"code":    "UNAUTHORIZED",
				"message": "User not authenticated",
			},
		})
		return
	}

	paths, err := ctrl.pathService.GetPathsByUserID(userID)
	if err != nil {
		logrus.WithError(err).Error("Failed to get paths")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": map[string]interface{}{
				"code":    "PATHS_RETRIEVAL_FAILED",
				"message": "Failed to retrieve paths",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"paths": paths,
	})
}

// GetPath retrieves a specific path
func (ctrl *PathController) GetPath(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": map[string]interface{}{
				"code":    "UNAUTHORIZED",
				"message": "User not authenticated",
			},
		})
		return
	}

	pathID := c.Param("id")
	path, err := ctrl.pathService.GetPathByID(pathID, userID)
	if err != nil {
		logrus.WithError(err).Error("Failed to get path")
		c.JSON(http.StatusNotFound, gin.H{
			"error": map[string]interface{}{
				"code":    "PATH_NOT_FOUND",
				"message": "Path not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, path)
}

// DeletePath deletes a path
func (ctrl *PathController) DeletePath(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": map[string]interface{}{
				"code":    "UNAUTHORIZED",
				"message": "User not authenticated",
			},
		})
		return
	}

	pathID := c.Param("id")
	if err := ctrl.pathService.DeletePath(pathID, userID); err != nil {
		logrus.WithError(err).Error("Failed to delete path")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": map[string]interface{}{
				"code":    "PATH_DELETION_FAILED",
				"message": "Failed to delete path",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Path deleted successfully",
	})
}

// SetNextDestination sets the "next destination" for an album
func (ctrl *PathController) SetNextDestination(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": map[string]interface{}{
				"code":    "UNAUTHORIZED",
				"message": "User not authenticated",
			},
		})
		return
	}

	fromAlbumID := c.Param("id")
	var req SetNextDestinationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid request data",
				"details": err.Error(),
			},
		})
		return
	}

	// Validate that from and to albums are different
	if fromAlbumID == req.ToAlbumID {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "INVALID_PATH",
				"message": "Cannot set album as its own next destination",
			},
		})
		return
	}

	path, err := ctrl.pathService.SetNextDestination(userID, fromAlbumID, req.ToAlbumID)
	if err != nil {
		logrus.WithError(err).Error("Failed to set next destination")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": map[string]interface{}{
				"code":    "NEXT_DESTINATION_FAILED",
				"message": "Failed to set next destination",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    path,
	})
}

// GetNextDestination gets the next destination for an album
func (ctrl *PathController) GetNextDestination(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": map[string]interface{}{
				"code":    "UNAUTHORIZED",
				"message": "User not authenticated",
			},
		})
		return
	}

	fromAlbumID := c.Param("id")
	album, err := ctrl.pathService.GetNextDestination(fromAlbumID, userID)
	if err != nil {
		logrus.WithError(err).Error("Failed to get next destination")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": map[string]interface{}{
				"code":    "NEXT_DESTINATION_RETRIEVAL_FAILED",
				"message": "Failed to get next destination",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"next_destination": album,
		},
	})
}

// RemoveNextDestination removes the next destination for an album
func (ctrl *PathController) RemoveNextDestination(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": map[string]interface{}{
				"code":    "UNAUTHORIZED",
				"message": "User not authenticated",
			},
		})
		return
	}

	fromAlbumID := c.Param("id")
	if err := ctrl.pathService.RemoveNextDestination(fromAlbumID, userID); err != nil {
		logrus.WithError(err).Error("Failed to remove next destination")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": map[string]interface{}{
				"code":    "NEXT_DESTINATION_REMOVAL_FAILED",
				"message": "Failed to remove next destination",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Next destination removed successfully",
	})
}