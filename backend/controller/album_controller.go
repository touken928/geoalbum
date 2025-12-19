package controller

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"

	"geoalbum/backend/common"
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

// CreateAlbum creates a new album
func (ctrl *AlbumController) CreateAlbum(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		common.UnauthorizedErrorResponse(c, "UNAUTHORIZED", "User not authenticated")
		return
	}

	var req CreateAlbumRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ValidationErrorResponse(c, err.Error())
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
		common.InternalServerErrorResponse(c, "ALBUM_CREATION_FAILED", "Failed to create album")
		return
	}

	common.SuccessResponse(c, http.StatusCreated, album)
}

// GetAlbums retrieves albums for the authenticated user
func (ctrl *AlbumController) GetAlbums(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		common.UnauthorizedErrorResponse(c, "UNAUTHORIZED", "User not authenticated")
		return
	}

	var query GetAlbumsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		common.ValidationErrorResponse(c, err.Error())
		return
	}

	var albums []interface{}

	if query.StartDate != nil || query.EndDate != nil {
		albumList, err := ctrl.albumService.GetAlbumsByUserIDAndTimeRange(userID, query.StartDate, query.EndDate)
		if err != nil {
			logrus.WithError(err).Error("Failed to get albums by time range")
			common.InternalServerErrorResponse(c, "ALBUMS_RETRIEVAL_FAILED", "Failed to retrieve albums")
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
			common.InternalServerErrorResponse(c, "ALBUMS_RETRIEVAL_FAILED", "Failed to retrieve albums")
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

	common.SuccessResponse(c, http.StatusOK, response)
}

// GetAlbum retrieves a specific album
func (ctrl *AlbumController) GetAlbum(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		common.UnauthorizedErrorResponse(c, "UNAUTHORIZED", "User not authenticated")
		return
	}

	albumID := c.Param("id")
	album, err := ctrl.albumService.GetAlbumByID(albumID, userID)
	if err != nil {
		logrus.WithError(err).Error("Failed to get album")
		common.NotFoundErrorResponse(c, "ALBUM_NOT_FOUND", "Album not found")
		return
	}

	common.SuccessResponse(c, http.StatusOK, album)
}

// UpdateAlbum updates an existing album
func (ctrl *AlbumController) UpdateAlbum(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		common.UnauthorizedErrorResponse(c, "UNAUTHORIZED", "User not authenticated")
		return
	}

	albumID := c.Param("id")
	var req UpdateAlbumRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ValidationErrorResponse(c, err.Error())
		return
	}

	album, err := ctrl.albumService.UpdateAlbum(albumID, userID, req.Title, req.Description)
	if err != nil {
		logrus.WithError(err).Error("Failed to update album")
		common.InternalServerErrorResponse(c, "ALBUM_UPDATE_FAILED", "Failed to update album")
		return
	}

	common.SuccessResponse(c, http.StatusOK, album)
}

// DeleteAlbum deletes an album
func (ctrl *AlbumController) DeleteAlbum(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		common.UnauthorizedErrorResponse(c, "UNAUTHORIZED", "User not authenticated")
		return
	}

	albumID := c.Param("id")
	if err := ctrl.albumService.DeleteAlbum(albumID, userID); err != nil {
		logrus.WithError(err).Error("Failed to delete album")
		common.InternalServerErrorResponse(c, "ALBUM_DELETION_FAILED", "Failed to delete album")
		return
	}

	response := gin.H{
		"message": "Album deleted successfully",
		"album_id": albumID,
	}

	common.SuccessResponse(c, http.StatusOK, response)
}