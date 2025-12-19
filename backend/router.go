package backend

import (
	"time"

	"github.com/gin-gonic/gin"

	"geoalbum/backend/controller"
	"geoalbum/backend/database"
	"geoalbum/backend/middleware"
)

// Register registers all backend routes and initializes the database
func Register(r *gin.Engine) {
	// Initialize database
	if err := database.Initialize(); err != nil {
		panic("Failed to initialize database: " + err.Error())
	}

	// Start rate limiter cleanup routine
	middleware.CleanupRateLimiters()

	// Add security middleware
	r.Use(middleware.SecurityHeadersMiddleware())
	r.Use(middleware.RequestSizeMiddleware(10 << 20)) // 10MB max request size
	r.Use(middleware.CORSMiddleware())
	r.Use(middleware.RequestIDMiddleware())
	r.Use(middleware.LoggerMiddleware())
	r.Use(middleware.SecurityValidationMiddleware())
	
	// Add rate limiting (100 requests per minute per IP)
	r.Use(middleware.RateLimitMiddleware(100, 1*time.Minute))

	// Initialize controllers
	authController := controller.NewAuthController()
	albumController := controller.NewAlbumController()
	photoController := controller.NewPhotoController()
	pathController := controller.NewPathController()
	securityController := controller.NewSecurityController()
	healthController := controller.NewHealthController()

	// API routes
	api := r.Group("/api")
	{
		// Health check routes (no auth required)
		api.GET("/health", healthController.HealthCheck)
		api.GET("/health/database", healthController.DatabaseStats)
		api.GET("/health/logging", healthController.LoggingConfig)

		// Authentication routes (no auth required)
		auth := api.Group("/auth")
		{
			auth.POST("/register", authController.Register)
			auth.POST("/login", authController.Login)
		}

		// Photo file serving route (supports query token for img tags)
		photoFiles := api.Group("/photos")
		photoFiles.Use(middleware.AuthMiddlewareWithQueryToken())
		{
			photoFiles.GET("/:id/file", photoController.ServePhotoFile)
		}

		// Protected routes (auth required)
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			// Album routes
			albums := protected.Group("/albums")
			{
				albums.POST("", albumController.CreateAlbum)
				albums.GET("", albumController.GetAlbums)
				albums.GET("/:id", albumController.GetAlbum)
				albums.PUT("/:id", albumController.UpdateAlbum)
				albums.DELETE("/:id", albumController.DeleteAlbum)
				
				// Photo routes for albums
				albums.POST("/:id/photos", photoController.UploadPhoto)
				albums.POST("/:id/photos/multiple", photoController.UploadMultiplePhotos)
				albums.GET("/:id/photos", photoController.GetAlbumPhotos)
			}

			// Photo routes
			photos := protected.Group("/photos")
			{
				photos.GET("/:id", photoController.GetPhoto)
				photos.DELETE("/:id", photoController.DeletePhoto)
				photos.PUT("/:id/order", photoController.UpdatePhotoOrder)
			}

			// Path routes
			paths := protected.Group("/paths")
			{
				paths.POST("", pathController.CreatePath)
				paths.GET("", pathController.GetPaths)
				paths.GET("/:id", pathController.GetPath)
				paths.DELETE("/:id", pathController.DeletePath)
			}

			// Album-specific path routes (for "next destination" functionality)
			// These routes are nested under the existing albums/:id routes
			albums.POST("/:id/next-destination", pathController.SetNextDestination)
			albums.GET("/:id/next-destination", pathController.GetNextDestination)
			albums.DELETE("/:id/next-destination", pathController.RemoveNextDestination)
		}

		// Security endpoints (development only)
		if gin.Mode() != gin.ReleaseMode {
			security := protected.Group("/security")
			{
				security.GET("/report", securityController.GetSecurityReport)
				security.GET("/best-practices", securityController.GetSecurityBestPractices)
			}
		}
	}
}