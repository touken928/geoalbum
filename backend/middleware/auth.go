package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/sirupsen/logrus"

	"geoalbum/backend/common"
)

// JWT secret key - in production, this should be loaded from environment variables
var jwtSecret = []byte("your-secret-key-change-this-in-production")

// Claims represents the JWT claims
type Claims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// AuthMiddleware validates JWT tokens
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			common.UnauthorizedErrorResponse(c, "MISSING_TOKEN", "Authorization header is required")
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			common.UnauthorizedErrorResponse(c, "INVALID_TOKEN_FORMAT", "Authorization header must be in format 'Bearer <token>'")
			c.Abort()
			return
		}

		// Parse and validate token
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil {
			logrus.WithError(err).Error("Failed to parse JWT token")
			common.UnauthorizedErrorResponse(c, "INVALID_TOKEN", "Invalid or expired token")
			c.Abort()
			return
		}

		if !token.Valid {
			common.UnauthorizedErrorResponse(c, "INVALID_TOKEN", "Invalid token")
			c.Abort()
			return
		}

		// Extract claims
		claims, ok := token.Claims.(*Claims)
		if !ok {
			common.UnauthorizedErrorResponse(c, "INVALID_CLAIMS", "Invalid token claims")
			c.Abort()
			return
		}

		// Set user information in context
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)

		c.Next()
	}
}

// AuthMiddlewareWithQueryToken validates JWT tokens from both header and query parameter
// This is useful for endpoints that need to be accessed via img tags or direct URLs
func AuthMiddlewareWithQueryToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string

		// First try to get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
			if tokenString == authHeader {
				tokenString = "" // Invalid format, try query parameter
			}
		}

		// If no token from header, try query parameter
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		if tokenString == "" {
			common.UnauthorizedErrorResponse(c, "MISSING_TOKEN", "Authorization token is required")
			c.Abort()
			return
		}

		// Parse and validate token
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil {
			logrus.WithError(err).Error("Failed to parse JWT token")
			common.UnauthorizedErrorResponse(c, "INVALID_TOKEN", "Invalid or expired token")
			c.Abort()
			return
		}

		if !token.Valid {
			common.UnauthorizedErrorResponse(c, "INVALID_TOKEN", "Invalid token")
			c.Abort()
			return
		}

		// Extract claims
		claims, ok := token.Claims.(*Claims)
		if !ok {
			common.UnauthorizedErrorResponse(c, "INVALID_CLAIMS", "Invalid token claims")
			c.Abort()
			return
		}

		// Set user information in context
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)

		c.Next()
	}
}

// GetJWTSecret returns the JWT secret key
func GetJWTSecret() []byte {
	return jwtSecret
}