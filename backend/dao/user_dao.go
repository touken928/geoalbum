package dao

import (
	"database/sql"
	"fmt"

	"geoalbum/backend/database"
	"geoalbum/backend/model"
)

type UserDAO struct{}

func NewUserDAO() *UserDAO {
	return &UserDAO{}
}

// Create creates a new user in the database
func (dao *UserDAO) Create(user *model.User) error {
	query := `
		INSERT INTO users (id, username, password_hash, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`
	_, err := database.DB.Exec(query, user.ID, user.Username, user.PasswordHash, user.CreatedAt, user.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

// GetByUsername retrieves a user by username
func (dao *UserDAO) GetByUsername(username string) (*model.User, error) {
	var user model.User
	query := `SELECT id, username, password_hash, created_at, updated_at FROM users WHERE username = ?`
	err := database.DB.Get(&user, query, username)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get user by username: %w", err)
	}
	return &user, nil
}

// GetByID retrieves a user by ID
func (dao *UserDAO) GetByID(id string) (*model.User, error) {
	var user model.User
	query := `SELECT id, username, password_hash, created_at, updated_at FROM users WHERE id = ?`
	err := database.DB.Get(&user, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}
	return &user, nil
}