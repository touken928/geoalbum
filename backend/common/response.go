package common

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// APIResponse represents a standardized API response structure
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

// APIError represents a standardized error structure
type APIError struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// Meta represents metadata for responses (pagination, etc.)
type Meta struct {
	Page       int `json:"page,omitempty"`
	PerPage    int `json:"per_page,omitempty"`
	Total      int `json:"total,omitempty"`
	TotalPages int `json:"total_pages,omitempty"`
}

// SuccessResponse sends a successful API response
func SuccessResponse(c *gin.Context, statusCode int, data interface{}) {
	response := APIResponse{
		Success: true,
		Data:    data,
	}
	c.JSON(statusCode, response)
}

// SuccessResponseWithMeta sends a successful API response with metadata
func SuccessResponseWithMeta(c *gin.Context, statusCode int, data interface{}, meta *Meta) {
	response := APIResponse{
		Success: true,
		Data:    data,
		Meta:    meta,
	}
	c.JSON(statusCode, response)
}

// ErrorResponse sends an error API response
func ErrorResponse(c *gin.Context, statusCode int, code, message string, details interface{}) {
	response := APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
			Details: details,
		},
	}
	c.JSON(statusCode, response)
}

// ValidationErrorResponse sends a validation error response
func ValidationErrorResponse(c *gin.Context, details interface{}) {
	ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data", details)
}

// UnauthorizedErrorResponse sends an unauthorized error response
func UnauthorizedErrorResponse(c *gin.Context, code, message string) {
	ErrorResponse(c, http.StatusUnauthorized, code, message, nil)
}

// NotFoundErrorResponse sends a not found error response
func NotFoundErrorResponse(c *gin.Context, code, message string) {
	ErrorResponse(c, http.StatusNotFound, code, message, nil)
}

// InternalServerErrorResponse sends an internal server error response
func InternalServerErrorResponse(c *gin.Context, code, message string) {
	ErrorResponse(c, http.StatusInternalServerError, code, message, nil)
}

// ConflictErrorResponse sends a conflict error response
func ConflictErrorResponse(c *gin.Context, code, message string, details interface{}) {
	ErrorResponse(c, http.StatusConflict, code, message, details)
}

// ForbiddenErrorResponse sends a forbidden error response
func ForbiddenErrorResponse(c *gin.Context, code, message string) {
	ErrorResponse(c, http.StatusForbidden, code, message, nil)
}