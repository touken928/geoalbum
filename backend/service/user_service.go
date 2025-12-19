package service

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"geoalbum/backend/dao"
	"geoalbum/backend/middleware"
	"geoalbum/backend/model"
)

type UserService struct {
	userDAO   *dao.UserDAO
	sanitizer *middleware.InputSanitizer
}

func NewUserService() *UserService {
	return &UserService{
		userDAO:   dao.NewUserDAO(),
		sanitizer: middleware.GetInputSanitizer(),
	}
}

// CreateUser creates a new user with hashed password
func (s *UserService) CreateUser(username, password string) (*model.User, error) {
	// Validate and sanitize input
	username = s.sanitizer.SanitizeString(username)
	
	// Validate username format
	if !s.sanitizer.ValidateUsername(username) {
		return nil, fmt.Errorf("invalid username format: must be 3-50 characters, alphanumeric and underscores only")
	}
	
	// Validate password strength
	if !s.sanitizer.ValidatePassword(password) {
		return nil, fmt.Errorf("invalid password: must be at least 6 characters with at least one letter and one number")
	}
	
	// Check for SQL injection patterns
	if s.sanitizer.DetectSQLInjection(username) {
		return nil, fmt.Errorf("invalid username: contains prohibited characters")
	}

	// Check if user already exists
	existingUser, err := s.userDAO.GetByUsername(username)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing user: %w", err)
	}
	if existingUser != nil {
		return nil, fmt.Errorf("user with username '%s' already exists", username)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := &model.User{
		ID:           uuid.New().String(),
		Username:     username,
		PasswordHash: string(hashedPassword),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.userDAO.Create(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// AuthenticateUser authenticates a user with username and password
func (s *UserService) AuthenticateUser(username, password string) (*model.User, error) {
	// Sanitize input
	username = s.sanitizer.SanitizeString(username)
	
	// Check for SQL injection patterns
	if s.sanitizer.DetectSQLInjection(username) {
		return nil, fmt.Errorf("invalid credentials")
	}

	user, err := s.userDAO.GetByUsername(username)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	if user == nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	return user, nil
}

// GetUserByID retrieves a user by ID
func (s *UserService) GetUserByID(id string) (*model.User, error) {
	user, err := s.userDAO.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}
	if user == nil {
		return nil, fmt.Errorf("user not found")
	}
	return user, nil
}