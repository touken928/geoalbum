package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// SecurityHeadersMiddleware adds security headers to responses
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Generate a nonce for CSP
		nonce := generateNonce()
		c.Set("csp_nonce", nonce)

		// Security headers
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		
		// Content Security Policy
		csp := "default-src 'self'; " +
			"script-src 'self' 'nonce-" + nonce + "'; " +
			"style-src 'self' 'unsafe-inline'; " +
			"img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.openstreetmap.org https://*.is.autonavi.com https://webrd04.is.autonavi.com https://webst01.is.autonavi.com; " +
			"font-src 'self'; " +
			"connect-src 'self'; " +
			"media-src 'self'; " +
			"object-src 'none'; " +
			"child-src 'none'; " +
			"worker-src 'none'; " +
			"frame-ancestors 'none'; " +
			"form-action 'self'; " +
			"base-uri 'self'"
		c.Header("Content-Security-Policy", csp)

		// HSTS (HTTP Strict Transport Security) - only in production with HTTPS
		if isProduction() && c.Request.TLS != nil {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}

		c.Next()
	}
}

// RequestSizeMiddleware limits request body size
func RequestSizeMiddleware(maxSize int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Set max request size (default 10MB for photo uploads)
		if maxSize == 0 {
			maxSize = 10 << 20 // 10MB
		}
		
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxSize)
		c.Next()
	}
}

// RequestTimeoutMiddleware sets a timeout for requests
func RequestTimeoutMiddleware(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Set default timeout if not specified
		if timeout == 0 {
			timeout = 30 * time.Second
		}

		// Create a context with timeout
		ctx := c.Request.Context()
		ctx, cancel := context.WithTimeout(ctx, timeout)
		defer cancel()

		// Replace request context
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

// generateNonce generates a random nonce for CSP
func generateNonce() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to timestamp-based nonce if random generation fails
		return strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	return hex.EncodeToString(bytes)
}

// isProduction checks if the application is running in production mode
func isProduction() bool {
	env := os.Getenv("GIN_MODE")
	return env == "release" || env == "production"
}