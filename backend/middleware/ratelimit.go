package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"geoalbum/backend/common"
)

// RateLimiter represents a rate limiter for a specific client
type RateLimiter struct {
	tokens    int
	maxTokens int
	refillRate time.Duration
	lastRefill time.Time
	mutex     sync.Mutex
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(maxTokens int, refillRate time.Duration) *RateLimiter {
	return &RateLimiter{
		tokens:     maxTokens,
		maxTokens:  maxTokens,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

// Allow checks if a request is allowed
func (rl *RateLimiter) Allow() bool {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()

	now := time.Now()
	elapsed := now.Sub(rl.lastRefill)

	// Refill tokens based on elapsed time
	tokensToAdd := int(elapsed / rl.refillRate)
	if tokensToAdd > 0 {
		rl.tokens += tokensToAdd
		if rl.tokens > rl.maxTokens {
			rl.tokens = rl.maxTokens
		}
		rl.lastRefill = now
	}

	// Check if request is allowed
	if rl.tokens > 0 {
		rl.tokens--
		return true
	}

	return false
}

// Global rate limiter storage
var (
	rateLimiters = make(map[string]*RateLimiter)
	rateLimiterMutex sync.RWMutex
)

// RateLimitMiddleware implements rate limiting based on client IP
func RateLimitMiddleware(maxRequests int, window time.Duration) gin.HandlerFunc {
	refillRate := window / time.Duration(maxRequests)

	return func(c *gin.Context) {
		clientIP := c.ClientIP()

		rateLimiterMutex.RLock()
		limiter, exists := rateLimiters[clientIP]
		rateLimiterMutex.RUnlock()

		if !exists {
			rateLimiterMutex.Lock()
			// Double-check pattern
			if limiter, exists = rateLimiters[clientIP]; !exists {
				limiter = NewRateLimiter(maxRequests, refillRate)
				rateLimiters[clientIP] = limiter
			}
			rateLimiterMutex.Unlock()
		}

		if !limiter.Allow() {
			common.ErrorResponse(c, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", 
				"Too many requests. Please try again later.", gin.H{
					"retry_after": window.Seconds(),
				})
			c.Abort()
			return
		}

		c.Next()
	}
}

// CleanupRateLimiters removes old rate limiters to prevent memory leaks
func CleanupRateLimiters() {
	ticker := time.NewTicker(1 * time.Hour)
	go func() {
		for range ticker.C {
			rateLimiterMutex.Lock()
			now := time.Now()
			for ip, limiter := range rateLimiters {
				limiter.mutex.Lock()
				// Remove limiters that haven't been used for more than 2 hours
				if now.Sub(limiter.lastRefill) > 2*time.Hour {
					delete(rateLimiters, ip)
				}
				limiter.mutex.Unlock()
			}
			rateLimiterMutex.Unlock()
		}
	}()
}