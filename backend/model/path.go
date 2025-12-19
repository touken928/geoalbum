package model

import (
	"time"
)

type Path struct {
	ID          string    `db:"id" json:"id"`
	UserID      string    `db:"user_id" json:"user_id"`
	FromAlbumID string    `db:"from_album_id" json:"from_album_id"`
	ToAlbumID   string    `db:"to_album_id" json:"to_album_id"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	FromAlbum   *Album    `json:"from_album,omitempty"`
	ToAlbum     *Album    `json:"to_album,omitempty"`
}