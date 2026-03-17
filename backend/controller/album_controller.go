package controller

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"

	"geoalbum/backend/service"
)

type AlbumController struct {
	albumService *service.AlbumService
}

func NewAlbumController() *AlbumController {
	return &AlbumController{
		albumService: service.NewAlbumService(),
	}
}

type CreateAlbumRequest struct {
	Title       string    `json:"title" binding:"required,max=200"`
	Description string    `json:"description" binding:"max=2000"`
	Latitude    float64   `json:"latitude" binding:"required,min=-90,max=90"`
	Longitude   float64   `json:"longitude" binding:"required,min=-180,max=180"`
	CreatedAt   time.Time `json:"created_at"`
}

type UpdateAlbumRequest struct {
	Title       string `json:"title" binding:"max=200"`
	Description string `json:"description" binding:"max=2000"`
}

type GetAlbumsQuery struct {
	StartDate *time.Time `form:"start_date" time_format:"2006-01-02T15:04:05Z07:00"`
	EndDate   *time.Time `form:"end_date" time_format:"2006-01-02T15:04:05Z07:00"`
}

// Response helpers
func successResponse(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, gin.H{"success": true, "data": data})
}

func errorResponse(c *gin.Context, statusCode int, code, message string, details interface{}) {
	c.JSON(statusCode, gin.H{
		"success": false,
		"error":   gin.H{"code": code, "message": message, "details": details},
	})
}

func validationErrorResponse(c *gin.Context, details interface{}) {
	errorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data", details)
}

func unauthorizedErrorResponse(c *gin.Context, code, message string) {
	errorResponse(c, http.StatusUnauthorized, code, message, nil)
}

func notFoundErrorResponse(c *gin.Context, code, message string) {
	errorResponse(c, http.StatusNotFound, code, message, nil)
}

func internalServerErrorResponse(c *gin.Context, code, message string) {
	errorResponse(c, http.StatusInternalServerError, code, message, nil)
}

// CreateAlbum creates a new album
func (ctrl *AlbumController) CreateAlbum(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		unauthorizedErrorResponse(c, "UNAUTHORIZED", "User not authenticated")
		return
	}

	var req CreateAlbumRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		validationErrorResponse(c, err.Error())
		return
	}

	// Use provided created_at or current time
	createdAt := req.CreatedAt
	if createdAt.IsZero() {
		createdAt = time.Now()
	}

	album, err := ctrl.albumService.CreateAlbum(userID, req.Title, req.Description, req.Latitude, req.Longitude, createdAt)
	if err != nil {
		logrus.WithError(err).Error("Failed to create album")
		internalServerErrorResponse(c, "ALBUM_CREATION_FAILED", "Failed to create album")
		return
	}

	successResponse(c, http.StatusCreated, album)
}

// GetAlbums retrieves albums for the authenticated user
func (ctrl *AlbumController) GetAlbums(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		unauthorizedErrorResponse(c, "UNAUTHORIZED", "User not authenticated")
		return
	}

	var query GetAlbumsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		validationErrorResponse(c, err.Error())
		return
	}

	var albums []interface{}

	if query.StartDate != nil || query.EndDate != nil {
		albumList, err := ctrl.albumService.GetAlbumsByUserIDAndTimeRange(userID, query.StartDate, query.EndDate)
		if err != nil {
			logrus.WithError(err).Error("Failed to get albums by time range")
			internalServerErrorResponse(c, "ALBUMS_RETRIEVAL_FAILED", "Failed to retrieve albums")
			return
		}
		albums = make([]interface{}, len(albumList))
		for i, album := range albumList {
			albums[i] = album
		}
	} else {
		albumList, err := ctrl.albumService.GetAlbumsByUserID(userID)
		if err != nil {
			logrus.WithError(err).Error("Failed to get albums")
			internalServerErrorResponse(c, "ALBUMS_RETRIEVAL_FAILED", "Failed to retrieve albums")
			return
		}
		albums = make([]interface{}, len(albumList))
		for i, album := range albumList {
			albums[i] = album
		}
	}

	response := gin.H{
		"albums": albums,
		"count":  len(albums),
	}

	successResponse(c, http.StatusOK, response)
}

// GetAlbum retrieves a specific album
func (ctrl *AlbumController) GetAlbum(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		unauthorizedErrorResponse(c, "UNAUTHORIZED", "User not authenticated")
		return
	}

	albumID := c.Param("id")
	album, err := ctrl.albumService.GetAlbumByID(albumID, userID)
	if err != nil {
		logrus.WithError(err).Error("Failed to get album")
		notFoundErrorResponse(c, "ALBUM_NOT_FOUND", "Album not found")
		return
	}

	successResponse(c, http.StatusOK, album)
}

// UpdateAlbum updates an existing album
func (ctrl *AlbumController) UpdateAlbum(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		unauthorizedErrorResponse(c, "UNAUTHORIZED", "User not authenticated")
		return
	}

	albumID := c.Param("id")
	var req UpdateAlbumRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		validationErrorResponse(c, err.Error())
		return
	}

	album, err := ctrl.albumService.UpdateAlbum(albumID, userID, req.Title, req.Description)
	if err != nil {
		logrus.WithError(err).Error("Failed to update album")
		internalServerErrorResponse(c, "ALBUM_UPDATE_FAILED", "Failed to update album")
		return
	}

	successResponse(c, http.StatusOK, album)
}

// DeleteAlbum deletes an album
func (ctrl *AlbumController) DeleteAlbum(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		unauthorizedErrorResponse(c, "UNAUTHORIZED", "User not authenticated")
		return
	}

	albumID := c.Param("id")
	if err := ctrl.albumService.DeleteAlbum(albumID, userID); err != nil {
		logrus.WithError(err).Error("Failed to delete album")
		internalServerErrorResponse(c, "ALBUM_DELETION_FAILED", "Failed to delete album")
		return
	}

	response := gin.H{
		"message": "Album deleted successfully",
		"album_id": albumID,
	}

	successResponse(c, http.StatusOK, response)
}
