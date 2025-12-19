package middleware

import (
	"html"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"

	"geoalbum/backend/common"
)

// InputSanitizer provides input sanitization functions
type InputSanitizer struct{}

// SanitizeString sanitizes a string by removing potentially dangerous characters
func (s *InputSanitizer) SanitizeString(input string) string {
	// Remove null bytes
	input = strings.ReplaceAll(input, "\x00", "")
	
	// HTML escape to prevent XSS
	input = html.EscapeString(input)
	
	// Trim whitespace
	input = strings.TrimSpace(input)
	
	return input
}

// ValidateUsername validates username format
func (s *InputSanitizer) ValidateUsername(username string) bool {
	// Username should be 3-50 characters, alphanumeric and underscores only
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9_]{3,50}$`, username)
	return matched
}

// ValidatePassword validates password strength
func (s *InputSanitizer) ValidatePassword(password string) bool {
	// Password should be at least 6 characters
	if len(password) < 6 {
		return false
	}
	
	// Check for at least one letter and one number
	hasLetter, _ := regexp.MatchString(`[a-zA-Z]`, password)
	hasNumber, _ := regexp.MatchString(`[0-9]`, password)
	
	return hasLetter && hasNumber
}

// ValidateAlbumTitle validates album title
func (s *InputSanitizer) ValidateAlbumTitle(title string) bool {
	// Title should be 1-200 characters after trimming
	title = strings.TrimSpace(title)
	return len(title) >= 1 && len(title) <= 200
}

// ValidateAlbumDescription validates album description
func (s *InputSanitizer) ValidateAlbumDescription(description string) bool {
	// Description should be max 2000 characters
	return len(description) <= 2000
}

// ValidateCoordinates validates latitude and longitude
func (s *InputSanitizer) ValidateCoordinates(lat, lng float64) bool {
	return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

// DetectSQLInjection detects potential SQL injection patterns
func (s *InputSanitizer) DetectSQLInjection(input string) bool {
	// Convert to lowercase for pattern matching
	lower := strings.ToLower(input)
	
	// SQL injection patterns (more specific to avoid false positives)
	sqlPatterns := []string{
		"' or ",
		"' and ",
		"' union ",
		"' select ",
		"' insert ",
		"' update ",
		"' delete ",
		"' drop ",
		"' create ",
		"' alter ",
		"; select ",
		"; insert ",
		"; update ",
		"; delete ",
		"; drop ",
		"; create ",
		"; alter ",
		"--",
		"/*",
		"*/",
		"xp_cmdshell",
		"sp_executesql",
	}
	
	// XSS patterns (more specific)
	xssPatterns := []string{
		"<script",
		"</script>",
		"javascript:",
		"vbscript:",
		"onload=",
		"onerror=",
		"onclick=",
		"onmouseover=",
		"onfocus=",
		"onblur=",
	}
	
	// Check SQL injection patterns
	for _, pattern := range sqlPatterns {
		if strings.Contains(lower, pattern) {
			return true
		}
	}
	
	// Check XSS patterns
	for _, pattern := range xssPatterns {
		if strings.Contains(lower, pattern) {
			return true
		}
	}
	
	return false
}

// SecurityValidationMiddleware provides input validation and sanitization
func SecurityValidationMiddleware() gin.HandlerFunc {
	sanitizer := &InputSanitizer{}
	
	return func(c *gin.Context) {
		// Skip validation for static file requests and root path
		path := c.Request.URL.Path
		if path == "/" || strings.HasPrefix(path, "/assets/") || 
		   strings.HasPrefix(path, "/static/") || isStaticFile(path) {
			c.Next()
			return
		}
		
		// Only apply strict validation to API endpoints
		if strings.HasPrefix(path, "/api/") {
			// Check for suspicious patterns in URL path
			if sanitizer.DetectSQLInjection(path) {
				common.ErrorResponse(c, http.StatusBadRequest, "INVALID_REQUEST", 
					"Request contains invalid characters", nil)
				c.Abort()
				return
			}
			
			// Check query parameters for API requests
			for key, values := range c.Request.URL.Query() {
				for _, value := range values {
					if sanitizer.DetectSQLInjection(key) || sanitizer.DetectSQLInjection(value) {
						common.ErrorResponse(c, http.StatusBadRequest, "INVALID_QUERY_PARAMETER", 
							"Query parameter contains invalid characters", gin.H{
								"parameter": key,
							})
						c.Abort()
						return
					}
				}
			}
			
			// Only check specific headers for API requests, and be more lenient
			suspiciousHeaders := []string{"X-Forwarded-For", "X-Real-IP"}
			for _, header := range suspiciousHeaders {
				value := c.GetHeader(header)
				if value != "" && sanitizer.DetectSQLInjection(value) {
					common.ErrorResponse(c, http.StatusBadRequest, "INVALID_HEADER", 
						"Request header contains invalid characters", gin.H{
							"header": header,
						})
					c.Abort()
					return
				}
			}
		}
		
		c.Next()
	}
}

// isStaticFile checks if the path is for a static file
func isStaticFile(path string) bool {
	staticExtensions := []string{
		".js", ".css", ".html", ".htm", ".png", ".jpg", ".jpeg", ".gif", ".svg", 
		".ico", ".woff", ".woff2", ".ttf", ".eot", ".json", ".xml", ".txt",
		".webp", ".avif", ".map",
	}
	
	for _, ext := range staticExtensions {
		if strings.HasSuffix(strings.ToLower(path), ext) {
			return true
		}
	}
	
	return false
}

// GetInputSanitizer returns a new input sanitizer instance
func GetInputSanitizer() *InputSanitizer {
	return &InputSanitizer{}
}