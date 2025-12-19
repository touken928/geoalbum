package controller

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"geoalbum/backend/common"
	"geoalbum/backend/database"
	"geoalbum/backend/logging"
)

// HealthController handles health check endpoints
type HealthController struct{}

// NewHealthController creates a new health controller
func NewHealthController() *HealthController {
	return &HealthController{}
}

// HealthCheck performs a comprehensive health check
func (hc *HealthController) HealthCheck(c *gin.Context) {
	startTime := time.Now()
	
	health := map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().UTC(),
		"version":   "1.0.0",
		"uptime":    time.Since(startTime).String(),
	}

	// Check database health
	dbHealth := hc.checkDatabaseHealth()
	health["database"] = dbHealth

	// Check logging system
	loggingHealth := hc.checkLoggingHealth()
	health["logging"] = loggingHealth

	// Determine overall status
	overallStatus := "healthy"
	if dbStatus, ok := dbHealth["status"].(string); ok && dbStatus != "healthy" {
		overallStatus = "unhealthy"
	}
	if logStatus, ok := loggingHealth["status"].(string); ok && logStatus != "healthy" {
		overallStatus = "unhealthy"
	}

	health["status"] = overallStatus

	// Log health check
	logger := logging.GetGlobalLogger()
	logger.LogSystemEvent("health_check", map[string]interface{}{
		"status":   overallStatus,
		"duration": time.Since(startTime).String(),
	})

	statusCode := http.StatusOK
	if overallStatus != "healthy" {
		statusCode = http.StatusServiceUnavailable
	}

	common.SuccessResponse(c, statusCode, health)
}

// checkDatabaseHealth checks database connectivity and performance
func (hc *HealthController) checkDatabaseHealth() map[string]interface{} {
	dbHealth := map[string]interface{}{
		"status": "healthy",
	}

	// Check basic connectivity
	if err := database.HealthCheck(); err != nil {
		dbHealth["status"] = "unhealthy"
		dbHealth["error"] = err.Error()
		return dbHealth
	}

	// Get connection statistics
	stats := database.GetConnectionStats()
	dbHealth["connection_stats"] = stats

	// Check if connection pool is healthy
	if openConns, exists := stats["open_conns"]; exists {
		if conns, ok := openConns.(int); ok && conns > 20 {
			dbHealth["warning"] = "High number of open connections"
		}
	}

	return dbHealth
}

// checkLoggingHealth checks logging system status
func (hc *HealthController) checkLoggingHealth() map[string]interface{} {
	logHealth := map[string]interface{}{
		"status": "healthy",
	}

	// Try to write a test log entry
	logger := logging.GetGlobalLogger()
	if logger == nil {
		logHealth["status"] = "unhealthy"
		logHealth["error"] = "Global logger not initialized"
		return logHealth
	}

	// Test logging functionality
	logger.Debug("Health check test log entry")
	
	logHealth["level"] = logger.Level.String()
	logHealth["formatter"] = "json" // Assuming JSON formatter is used

	return logHealth
}

// DatabaseStats returns detailed database statistics
func (hc *HealthController) DatabaseStats(c *gin.Context) {
	stats := database.GetConnectionStats()
	
	logging.WithComponent("health_controller").Info("Database statistics requested")
	
	common.SuccessResponse(c, http.StatusOK, stats)
}

// LoggingConfig returns current logging configuration
func (hc *HealthController) LoggingConfig(c *gin.Context) {
	logger := logging.GetGlobalLogger()
	
	config := map[string]interface{}{
		"level":     logger.Level.String(),
		"formatter": "json",
		"output":    "configured",
	}
	
	logging.WithComponent("health_controller").Info("Logging configuration requested")
	
	common.SuccessResponse(c, http.StatusOK, config)
}