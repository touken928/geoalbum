package controller

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/sirupsen/logrus"

	"geoalbum/backend/common"
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

// Register handles user registration
func (ctrl *AuthController) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ValidationErrorResponse(c, err.Error())
		return
	}

	user, err := ctrl.userService.CreateUser(req.Username, req.Password)
	if err != nil {
		logrus.WithError(err).Error("Failed to create user")
		common.ErrorResponse(c, http.StatusBadRequest, "USER_CREATION_FAILED", err.Error(), nil)
		return
	}

	// Generate JWT token
	token, err := ctrl.generateToken(user.ID, user.Username)
	if err != nil {
		logrus.WithError(err).Error("Failed to generate JWT token")
		common.InternalServerErrorResponse(c, "TOKEN_GENERATION_FAILED", "Failed to generate authentication token")
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

	common.SuccessResponse(c, http.StatusCreated, response)
}

// Login handles user authentication
func (ctrl *AuthController) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ValidationErrorResponse(c, err.Error())
		return
	}

	user, err := ctrl.userService.AuthenticateUser(req.Username, req.Password)
	if err != nil {
		logrus.WithError(err).Error("Authentication failed")
		common.UnauthorizedErrorResponse(c, "AUTHENTICATION_FAILED", "Invalid credentials")
		return
	}

	// Generate JWT token
	token, err := ctrl.generateToken(user.ID, user.Username)
	if err != nil {
		logrus.WithError(err).Error("Failed to generate JWT token")
		common.InternalServerErrorResponse(c, "TOKEN_GENERATION_FAILED", "Failed to generate authentication token")
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

	common.SuccessResponse(c, http.StatusOK, response)
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