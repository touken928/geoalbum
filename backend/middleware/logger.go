package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"geoalbum/backend/logging"
)

// LoggerMiddleware logs HTTP requests with enhanced structured logging
func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Generate request ID for tracing
		requestID := uuid.New().String()
		c.Set("request_id", requestID)

		startTime := time.Now()

		// Process request
		c.Next()

		// Log after request
		duration := time.Since(startTime)
		statusCode := c.Writer.Status()

		// Get user ID if available
		userID := ""
		if userIDValue, exists := c.Get("user_id"); exists {
			if uid, ok := userIDValue.(string); ok {
				userID = uid
			}
		}

		// Log the HTTP request
		logger := logging.GetGlobalLogger()
		logger.LogHTTPRequest(
			c.Request.Method,
			c.Request.URL.Path,
			statusCode,
			duration,
			c.ClientIP(),
			c.Request.UserAgent(),
		)

		// Log errors if any
		if len(c.Errors) > 0 {
			for _, err := range c.Errors {
				logger.LogHTTPError(
					c.Request.Method,
					c.Request.URL.Path,
					statusCode,
					err.Err,
					c.ClientIP(),
				)
			}
		}

		// Log slow requests (> 1 second)
		if duration > time.Second {
			logging.WithFields(map[string]interface{}{
				"type":       "slow_request",
				"request_id": requestID,
				"method":     c.Request.Method,
				"path":       c.Request.URL.Path,
				"duration":   duration.String(),
				"user_id":    userID,
				"client_ip":  c.ClientIP(),
			}).Warn("Slow HTTP request detected")
		}
	}
}

// RequestIDMiddleware adds request ID to context
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetString("request_id")
		if requestID == "" {
			requestID = uuid.New().String()
			c.Set("request_id", requestID)
		}
		
		// Add request ID to response headers for debugging
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}