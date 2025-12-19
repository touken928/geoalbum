package controller

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"

	"geoalbum/backend/service"
)

type PhotoController struct {
	photoService *service.PhotoService
}

func NewPhotoController() *PhotoController {
	return &PhotoController{
		photoService: service.NewPhotoService(),
	}
}

type UpdatePhotoOrderRequest struct {
	Order int `json:"order" binding:"required,min=0"`
}

// UploadPhoto uploads a photo to an album
func (ctrl *PhotoController) UploadPhoto(c *gin.Context) {
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

	albumID := c.Param("id")
	if albumID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "VALIDATION_ERROR",
				"message": "Album ID is required",
			},
		})
		return
	}

	// Get uploaded file
	file, err := c.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "FILE_UPLOAD_ERROR",
				"message": "No photo file provided",
				"details": err.Error(),
			},
		})
		return
	}

	photo, err := ctrl.photoService.UploadPhoto(albumID, userID, file)
	if err != nil {
		logrus.WithError(err).Error("Failed to upload photo")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": map[string]interface{}{
				"code":    "PHOTO_UPLOAD_FAILED",
				"message": "Failed to upload photo",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, photo)
}

// GetAlbumPhotos retrieves all photos for an album
func (ctrl *PhotoController) GetAlbumPhotos(c *gin.Context) {
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

	albumID := c.Param("id")
	photos, err := ctrl.photoService.GetPhotosByAlbumID(albumID, userID)
	if err != nil {
		logrus.WithError(err).Error("Failed to get album photos")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": map[string]interface{}{
				"code":    "PHOTOS_RETRIEVAL_FAILED",
				"message": "Failed to retrieve photos",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"photos": photos,
	})
}

// DeletePhoto deletes a photo
func (ctrl *PhotoController) DeletePhoto(c *gin.Context) {
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

	photoID := c.Param("id")
	if err := ctrl.photoService.DeletePhoto(photoID, userID); err != nil {
		logrus.WithError(err).Error("Failed to delete photo")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": map[string]interface{}{
				"code":    "PHOTO_DELETION_FAILED",
				"message": "Failed to delete photo",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Photo deleted successfully",
	})
}

// UpdatePhotoOrder updates the display order of a photo
func (ctrl *PhotoController) UpdatePhotoOrder(c *gin.Context) {
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

	photoID := c.Param("id")
	var req UpdatePhotoOrderRequest
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

	if err := ctrl.photoService.UpdatePhotoOrder(photoID, userID, req.Order); err != nil {
		logrus.WithError(err).Error("Failed to update photo order")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": map[string]interface{}{
				"code":    "PHOTO_ORDER_UPDATE_FAILED",
				"message": "Failed to update photo order",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Photo order updated successfully",
	})
}

// ServePhotoFile serves the actual photo file
// Supports both header-based auth and query parameter token for img tags
func (ctrl *PhotoController) ServePhotoFile(c *gin.Context) {
	userID := c.GetString("user_id")
	
	// If no user_id from middleware, try to get token from query parameter
	if userID == "" {
		token := c.Query("token")
		if token != "" {
			// Validate token and get user ID
			claims, err := ctrl.photoService.ValidateToken(token)
			if err == nil && claims != nil {
				userID = claims.UserID
			}
		}
	}
	
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": map[string]interface{}{
				"code":    "UNAUTHORIZED",
				"message": "User not authenticated",
			},
		})
		return
	}

	photoID := c.Param("id")
	filePath, err := ctrl.photoService.GetPhotoFile(photoID, userID)
	if err != nil {
		logrus.WithError(err).Error("Failed to get photo file")
		c.JSON(http.StatusNotFound, gin.H{
			"error": map[string]interface{}{
				"code":    "PHOTO_NOT_FOUND",
				"message": "Photo file not found",
			},
		})
		return
	}

	c.File(filePath)
}

// GetPhoto retrieves a specific photo's metadata
func (ctrl *PhotoController) GetPhoto(c *gin.Context) {
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

	photoID := c.Param("id")
	photo, err := ctrl.photoService.GetPhotoByID(photoID, userID)
	if err != nil {
		logrus.WithError(err).Error("Failed to get photo")
		c.JSON(http.StatusNotFound, gin.H{
			"error": map[string]interface{}{
				"code":    "PHOTO_NOT_FOUND",
				"message": "Photo not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, photo)
}

// UploadMultiplePhotos uploads multiple photos to an album
func (ctrl *PhotoController) UploadMultiplePhotos(c *gin.Context) {
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

	albumID := c.Param("id")
	if albumID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "VALIDATION_ERROR",
				"message": "Album ID is required",
			},
		})
		return
	}

	// Parse multipart form
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "FORM_PARSE_ERROR",
				"message": "Failed to parse multipart form",
				"details": err.Error(),
			},
		})
		return
	}

	files := form.File["photos"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "NO_FILES_PROVIDED",
				"message": "No photo files provided",
			},
		})
		return
	}

	var uploadedPhotos []interface{}
	var errors []string

	for _, file := range files {
		photo, err := ctrl.photoService.UploadPhoto(albumID, userID, file)
		if err != nil {
			logrus.WithError(err).WithField("filename", file.Filename).Error("Failed to upload photo")
			errors = append(errors, fmt.Sprintf("Failed to upload %s: %s", file.Filename, err.Error()))
			continue
		}
		uploadedPhotos = append(uploadedPhotos, photo)
	}

	response := gin.H{
		"uploaded_count": len(uploadedPhotos),
		"photos":         uploadedPhotos,
	}

	if len(errors) > 0 {
		response["errors"] = errors
		response["error_count"] = len(errors)
	}

	statusCode := http.StatusCreated
	if len(uploadedPhotos) == 0 {
		statusCode = http.StatusBadRequest
	} else if len(errors) > 0 {
		statusCode = http.StatusPartialContent
	}

	c.JSON(statusCode, response)
}