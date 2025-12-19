package model

import (
	"time"
)

type Photo struct {
	ID           string    `db:"id" json:"id"`
	AlbumID      string    `db:"album_id" json:"album_id"`
	Filename     string    `db:"filename" json:"filename"`
	FilePath     string    `db:"file_path" json:"-"`
	FileSize     int64     `db:"file_size" json:"file_size"`
	MimeType     string    `db:"mime_type" json:"mime_type"`
	DisplayOrder int       `db:"display_order" json:"display_order"`
	UploadedAt   time.Time `db:"uploaded_at" json:"uploaded_at"`
	URL          string    `json:"url"`
}