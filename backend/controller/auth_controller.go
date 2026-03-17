package controller

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/sirupsen/logrus"

	"geoalbum/backend/middleware"
	"geoalbum/backend/service"
)

type AuthController struct {
	userService *service.UserService
}

func NewAuthController() *AuthController {
	return &AuthController{
		userService: service.NewUserService(),
	}
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  interface{} `json:"user"`
}

// Response helpers
func successResponseAuth(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, gin.H{"success": true, "data": data})
}

func errorResponseAuth(c *gin.Context, statusCode int, code, message string, details interface{}) {
	c.JSON(statusCode, gin.H{
		"success": false,
		"error":   gin.H{"code": code, "message": message, "details": details},
	})
}

func validationErrorResponseAuth(c *gin.Context, details interface{}) {
	errorResponseAuth(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data", details)
}

func unauthorizedErrorResponseAuth(c *gin.Context, code, message string) {
	errorResponseAuth(c, http.StatusUnauthorized, code, message, nil)
}

func internalServerErrorResponseAuth(c *gin.Context, code, message string) {
	errorResponseAuth(c, http.StatusInternalServerError, code, message, nil)
}

// Register handles user registration
func (ctrl *AuthController) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		validationErrorResponseAuth(c, err.Error())
		return
	}

	user, err := ctrl.userService.CreateUser(req.Username, req.Password)
	if err != nil {
		logrus.WithError(err).Error("Failed to create user")
		errorResponseAuth(c, http.StatusBadRequest, "USER_CREATION_FAILED", err.Error(), nil)
		return
	}

	// Generate JWT token
	token, err := ctrl.generateToken(user.ID, user.Username)
	if err != nil {
		logrus.WithError(err).Error("Failed to generate JWT token")
		internalServerErrorResponseAuth(c, "TOKEN_GENERATION_FAILED", "Failed to generate authentication token")
		return
	}

	response := AuthResponse{
		Token: token,
		User: gin.H{
			"id":         user.ID,
			"username":   user.Username,
			"created_at": user.CreatedAt,
		},
	}

	successResponseAuth(c, http.StatusCreated, response)
}

// Login handles user authentication
func (ctrl *AuthController) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		validationErrorResponseAuth(c, err.Error())
		return
	}

	user, err := ctrl.userService.AuthenticateUser(req.Username, req.Password)
	if err != nil {
		logrus.WithError(err).Error("Authentication failed")
		unauthorizedErrorResponseAuth(c, "AUTHENTICATION_FAILED", "Invalid credentials")
		return
	}

	// Generate JWT token
	token, err := ctrl.generateToken(user.ID, user.Username)
	if err != nil {
		logrus.WithError(err).Error("Failed to generate JWT token")
		internalServerErrorResponseAuth(c, "TOKEN_GENERATION_FAILED", "Failed to generate authentication token")
		return
	}

	response := AuthResponse{
		Token: token,
		User: gin.H{
			"id":         user.ID,
			"username":   user.Username,
			"created_at": user.CreatedAt,
		},
	}

	successResponseAuth(c, http.StatusOK, response)
}

// generateToken generates a JWT token for the user
func (ctrl *AuthController) generateToken(userID, username string) (string, error) {
	claims := &middleware.Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(middleware.GetJWTSecret())
}