package main

import (
	"embed"
	"io/fs"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"

	"geoalbum/backend"
	"geoalbum/backend/logging"
)

//go:embed all:frontend/dist
var assets embed.FS

// initMimeTypes registers additional MIME types for better static file serving
func initMimeTypes() {
	// Register common web file types that might not be in the default registry
	mime.AddExtensionType(".js", "application/javascript; charset=utf-8")
	mime.AddExtensionType(".mjs", "application/javascript; charset=utf-8")
	mime.AddExtensionType(".css", "text/css; charset=utf-8")
	mime.AddExtensionType(".json", "application/json; charset=utf-8")
	mime.AddExtensionType(".svg", "image/svg+xml")
	mime.AddExtensionType(".ico", "image/x-icon")
	mime.AddExtensionType(".woff", "font/woff")
	mime.AddExtensionType(".woff2", "font/woff2")
	mime.AddExtensionType(".ttf", "font/ttf")
	mime.AddExtensionType(".eot", "application/vnd.ms-fontobject")
	mime.AddExtensionType(".webp", "image/webp")
	mime.AddExtensionType(".avif", "image/avif")
}

// getCacheHeaders returns appropriate cache headers based on file type
func getCacheHeaders(ext string) (string, string) {
	switch ext {
	case ".js", ".css", ".woff", ".woff2", ".ttf", ".eot":
		// Static assets with hash in filename - cache for 1 year
		return "public, max-age=31536000, immutable", "31536000"
	case ".svg", ".ico", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif":
		// Images - cache for 1 week
		return "public, max-age=604800", "604800"
	case ".html":
		// HTML files - no cache to ensure SPA routing works
		return "no-cache, no-store, must-revalidate", "0"
	case ".json":
		// JSON files - cache for 1 hour
		return "public, max-age=3600", "3600"
	default:
		// Default - cache for 1 hour
		return "public, max-age=3600", "3600"
	}
}

func frontendHandler(dist fs.FS) gin.HandlerFunc {
	return func(c *gin.Context) {
		reqPath := c.Request.URL.Path

		// API routes should never fallback to static file serving
		if strings.HasPrefix(reqPath, "/api/") {
			c.Header("Content-Type", "application/json")
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":    "ROUTE_NOT_FOUND",
					"message": "API endpoint not found",
					"details": gin.H{
						"path":   reqPath,
						"method": c.Request.Method,
					},
				},
			})
			return
		}

		// Root path maps to index.html
		if reqPath == "/" {
			reqPath = "/index.html"
		}

		// Normalize path and prevent directory traversal attacks
		filePath := strings.TrimPrefix(path.Clean(reqPath), "/")
		
		// Additional security: ensure the path doesn't contain suspicious patterns
		if strings.Contains(filePath, "..") || strings.HasPrefix(filePath, "/") {
			c.Header("Content-Type", "application/json")
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "INVALID_PATH",
					"message": "Invalid file path",
					"details": gin.H{
						"path": reqPath,
					},
				},
			})
			return
		}

		ext := filepath.Ext(filePath)

		// Try to read the requested file
		data, err := fs.ReadFile(dist, filePath)
		if err != nil {
			// For routes without extension (SPA routes), fallback to index.html
			if ext == "" {
				if indexData, indexErr := fs.ReadFile(dist, "index.html"); indexErr == nil {
					// Set appropriate headers for HTML
					c.Header("Content-Type", "text/html; charset=utf-8")
					cacheControl, maxAge := getCacheHeaders(".html")
					c.Header("Cache-Control", cacheControl)
					c.Header("Max-Age", maxAge)
					c.Data(http.StatusOK, "text/html; charset=utf-8", indexData)
					return
				}
			}
			
			// File not found - return proper 404 response
			c.Header("Content-Type", "application/json")
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":    "FILE_NOT_FOUND",
					"message": "Static file not found",
					"details": gin.H{
						"path":      reqPath,
						"file_path": filePath,
					},
				},
			})
			return
		}

		// Determine content type
		contentType := mime.TypeByExtension(ext)
		if contentType == "" {
			// Fallback for unknown extensions
			contentType = "application/octet-stream"
		}

		// Set cache headers based on file type
		cacheControl, maxAge := getCacheHeaders(ext)
		c.Header("Cache-Control", cacheControl)
		c.Header("Max-Age", maxAge)
		
		// Set additional security headers for static files
		if ext == ".html" {
			c.Header("X-Content-Type-Options", "nosniff")
			c.Header("X-Frame-Options", "DENY")
			c.Header("X-XSS-Protection", "1; mode=block")
		}

		// Set ETag for better caching (simple hash of file path and size)
		etag := `"` + filePath + `-` + string(rune(len(data))) + `"`
		c.Header("ETag", etag)
		
		// Check if client has cached version
		if match := c.GetHeader("If-None-Match"); match == etag {
			c.Status(http.StatusNotModified)
			return
		}

		// Serve the file with proper content type
		c.Data(http.StatusOK, contentType, data)
	}
}

func main() {
	// Initialize enhanced logging system
	logConfig := &logging.LogConfig{
		Level:      getLogLevel(),
		Format:     getLogFormat(),
		Output:     getLogOutput(),
		LogDir:     "logs",
		MaxSize:    100,
		MaxBackups: 5,
		MaxAge:     30,
		Compress:   true,
	}

	if err := logging.InitializeGlobalLogger(logConfig); err != nil {
		panic("Failed to initialize logging system: " + err.Error())
	}

	logging.Info("Starting GeoAlbum server")

	// Initialize MIME types for better static file serving
	initMimeTypes()

	// Set Gin mode based on environment
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New() // Use gin.New() instead of gin.Default() to avoid default middleware

	// Register backend API routes
	backend.Register(r)

	// Setup frontend static file serving
	distFS, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		logging.Fatal("Failed to setup frontend assets: " + err.Error())
	}
	
	// Handle all non-API routes with the enhanced frontend handler
	r.NoRoute(frontendHandler(distFS))

	// Start server
	port := getServerPort()
	logging.WithField("port", port).Info("Server starting")
	
	if err := r.Run(":" + port); err != nil {
		logging.WithError(err).Fatal("Failed to start server")
	}
}

// getLogLevel returns the log level from environment variable or default
func getLogLevel() logging.LogLevel {
	level := os.Getenv("LOG_LEVEL")
	switch strings.ToLower(level) {
	case "debug":
		return logging.DebugLevel
	case "info":
		return logging.InfoLevel
	case "warn":
		return logging.WarnLevel
	case "error":
		return logging.ErrorLevel
	default:
		return logging.InfoLevel
	}
}

// getLogFormat returns the log format from environment variable or default
func getLogFormat() string {
	format := os.Getenv("LOG_FORMAT")
	if format == "text" {
		return "text"
	}
	return "json" // default
}

// getLogOutput returns the log output from environment variable or default
func getLogOutput() string {
	output := os.Getenv("LOG_OUTPUT")
	switch output {
	case "stdout":
		return "stdout"
	case "file":
		return "file"
	case "both":
		return "both"
	default:
		return "both" // default
	}
}

// getServerPort returns the server port from environment variable or default
func getServerPort() string {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	return port
}
