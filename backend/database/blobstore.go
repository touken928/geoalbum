package database

import (
	"fmt"
	"sync"

	bolt "go.etcd.io/bbolt"
)

var (
	blobDB     *bolt.DB
	blobDBOnce sync.Once
	blobDBErr  error
)

const (
	// PhotoBucket is the bucket name for storing photo binary data
	PhotoBucket = "photos"
)

// InitBlobStore initializes the bbolt database for blob storage
func InitBlobStore(dbPath string) error {
	blobDBOnce.Do(func() {
		var err error
		blobDB, err = bolt.Open(dbPath, 0600, nil)
		if err != nil {
			blobDBErr = fmt.Errorf("failed to open blob store: %w", err)
			return
		}

		// Create buckets
		err = blobDB.Update(func(tx *bolt.Tx) error {
			_, err := tx.CreateBucketIfNotExists([]byte(PhotoBucket))
			return err
		})
		if err != nil {
			blobDBErr = fmt.Errorf("failed to create bucket: %w", err)
		}
	})

	return blobDBErr
}

// GetBlobStore returns the bbolt database instance
func GetBlobStore() *bolt.DB {
	return blobDB
}

// CloseBlobStore closes the bbolt database
func CloseBlobStore() error {
	if blobDB != nil {
		return blobDB.Close()
	}
	return nil
}

// SaveBlob saves binary data to the blob store
func SaveBlob(bucket, key string, data []byte) error {
	if blobDB == nil {
		return fmt.Errorf("blob store not initialized")
	}

	return blobDB.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte(bucket))
		if b == nil {
			return fmt.Errorf("bucket %s not found", bucket)
		}
		return b.Put([]byte(key), data)
	})
}

// GetBlob retrieves binary data from the blob store
func GetBlob(bucket, key string) ([]byte, error) {
	if blobDB == nil {
		return nil, fmt.Errorf("blob store not initialized")
	}

	var data []byte
	err := blobDB.View(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte(bucket))
		if b == nil {
			return fmt.Errorf("bucket %s not found", bucket)
		}
		v := b.Get([]byte(key))
		if v == nil {
			return fmt.Errorf("key %s not found", key)
		}
		// Copy the data since it's only valid within the transaction
		data = make([]byte, len(v))
		copy(data, v)
		return nil
	})

	return data, err
}

// DeleteBlob deletes binary data from the blob store
func DeleteBlob(bucket, key string) error {
	if blobDB == nil {
		return fmt.Errorf("blob store not initialized")
	}

	return blobDB.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte(bucket))
		if b == nil {
			return fmt.Errorf("bucket %s not found", bucket)
		}
		return b.Delete([]byte(key))
	})
}

// DeleteBlobsByPrefix deletes all blobs with keys starting with the given prefix
func DeleteBlobsByPrefix(bucket, prefix string) error {
	if blobDB == nil {
		return fmt.Errorf("blob store not initialized")
	}

	return blobDB.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte(bucket))
		if b == nil {
			return fmt.Errorf("bucket %s not found", bucket)
		}

		c := b.Cursor()
		prefixBytes := []byte(prefix)

		for k, _ := c.Seek(prefixBytes); k != nil && len(k) >= len(prefixBytes); k, _ = c.Next() {
			// Check if key starts with prefix
			match := true
			for i := 0; i < len(prefixBytes); i++ {
				if k[i] != prefixBytes[i] {
					match = false
					break
				}
			}
			if !match {
				break
			}
			if err := b.Delete(k); err != nil {
				return err
			}
		}
		return nil
	})
}
