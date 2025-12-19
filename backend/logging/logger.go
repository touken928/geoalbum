package logging

import (
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/sirupsen/logrus"
)

// LogLevel represents different log levels
type LogLevel string

const (
	DebugLevel LogLevel = "debug"
	InfoLevel  LogLevel = "info"
	WarnLevel  LogLevel = "warn"
	ErrorLevel LogLevel = "error"
	FatalLevel LogLevel = "fatal"
	PanicLevel LogLevel = "panic"
)

// LogConfig holds logging configuration
type LogConfig struct {
	Level      LogLevel `json:"level"`
	Format     string   `json:"format"`     // "json" or "text"
	Output     string   `json:"output"`     // "stdout", "file", or "both"
	LogDir     string   `json:"log_dir"`
	MaxSize    int      `json:"max_size"`    // Maximum size in MB
	MaxBackups int      `json:"max_backups"` // Maximum number of backup files
	MaxAge     int      `json:"max_age"`     // Maximum age in days
	Compress   bool     `json:"compress"`    // Whether to compress rotated files
}

// DefaultConfig returns default logging configuration
func DefaultConfig() *LogConfig {
	return &LogConfig{
		Level:      InfoLevel,
		Format:     "json",
		Output:     "both",
		LogDir:     "logs",
		MaxSize:    100,
		MaxBackups: 5,
		MaxAge:     30,
		Compress:   true,
	}
}

// Logger wraps logrus with additional functionality
type Logger struct {
	*logrus.Logger
	config *LogConfig
}

// NewLogger creates a new logger instance with the given configuration
func NewLogger(config *LogConfig) (*Logger, error) {
	if config == nil {
		config = DefaultConfig()
	}

	logger := logrus.New()
	
	// Set log level
	level, err := logrus.ParseLevel(string(config.Level))
	if err != nil {
		return nil, err
	}
	logger.SetLevel(level)

	// Set formatter
	if config.Format == "json" {
		logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: time.RFC3339,
			FieldMap: logrus.FieldMap{
				logrus.FieldKeyTime:  "timestamp",
				logrus.FieldKeyLevel: "level",
				logrus.FieldKeyMsg:   "message",
				logrus.FieldKeyFunc:  "function",
			},
		})
	} else {
		logger.SetFormatter(&logrus.TextFormatter{
			TimestampFormat: time.RFC3339,
			FullTimestamp:   true,
		})
	}

	// Set output
	if err := setupOutput(logger, config); err != nil {
		return nil, err
	}

	return &Logger{
		Logger: logger,
		config: config,
	}, nil
}

// setupOutput configures the logger output based on configuration
func setupOutput(logger *logrus.Logger, config *LogConfig) error {
	switch config.Output {
	case "stdout":
		logger.SetOutput(os.Stdout)
	case "file":
		if err := setupFileOutput(logger, config); err != nil {
			return err
		}
	case "both":
		if err := setupBothOutput(logger, config); err != nil {
			return err
		}
	default:
		logger.SetOutput(os.Stdout)
	}
	return nil
}

// setupFileOutput configures file-only output
func setupFileOutput(logger *logrus.Logger, config *LogConfig) error {
	// Create log directory if it doesn't exist
	if err := os.MkdirAll(config.LogDir, 0755); err != nil {
		return err
	}

	// Create log file
	logFile := filepath.Join(config.LogDir, "geoalbum.log")
	file, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return err
	}

	logger.SetOutput(file)
	return nil
}

// setupBothOutput configures output to both stdout and file
func setupBothOutput(logger *logrus.Logger, config *LogConfig) error {
	// Create log directory if it doesn't exist
	if err := os.MkdirAll(config.LogDir, 0755); err != nil {
		return err
	}

	// Create log file
	logFile := filepath.Join(config.LogDir, "geoalbum.log")
	file, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return err
	}

	// Create multi-writer for both stdout and file
	multiWriter := io.MultiWriter(os.Stdout, file)
	logger.SetOutput(multiWriter)
	return nil
}

// WithRequestID adds request ID to log context
func (l *Logger) WithRequestID(requestID string) *logrus.Entry {
	return l.WithField("request_id", requestID)
}

// WithUserID adds user ID to log context
func (l *Logger) WithUserID(userID string) *logrus.Entry {
	return l.WithField("user_id", userID)
}

// WithComponent adds component name to log context
func (l *Logger) WithComponent(component string) *logrus.Entry {
	return l.WithField("component", component)
}

// WithError adds error to log context
func (l *Logger) WithError(err error) *logrus.Entry {
	return l.Logger.WithError(err)
}

// LogHTTPRequest logs HTTP request details
func (l *Logger) LogHTTPRequest(method, path string, statusCode int, duration time.Duration, clientIP, userAgent string) {
	l.WithFields(logrus.Fields{
		"type":       "http_request",
		"method":     method,
		"path":       path,
		"status":     statusCode,
		"duration":   duration.String(),
		"client_ip":  clientIP,
		"user_agent": userAgent,
	}).Info("HTTP request processed")
}

// LogHTTPError logs HTTP error details
func (l *Logger) LogHTTPError(method, path string, statusCode int, err error, clientIP string) {
	l.WithFields(logrus.Fields{
		"type":      "http_error",
		"method":    method,
		"path":      path,
		"status":    statusCode,
		"client_ip": clientIP,
		"error":     err.Error(),
	}).Error("HTTP request error")
}

// LogDatabaseOperation logs database operation details
func (l *Logger) LogDatabaseOperation(operation, table string, duration time.Duration, err error) {
	fields := logrus.Fields{
		"type":      "database_operation",
		"operation": operation,
		"table":     table,
		"duration":  duration.String(),
	}

	if err != nil {
		fields["error"] = err.Error()
		l.WithFields(fields).Error("Database operation failed")
	} else {
		l.WithFields(fields).Debug("Database operation completed")
	}
}

// LogAuthEvent logs authentication events
func (l *Logger) LogAuthEvent(event, userID, clientIP string, success bool, details map[string]interface{}) {
	fields := logrus.Fields{
		"type":      "auth_event",
		"event":     event,
		"user_id":   userID,
		"client_ip": clientIP,
		"success":   success,
	}

	// Add additional details
	for k, v := range details {
		fields[k] = v
	}

	if success {
		l.WithFields(fields).Info("Authentication event")
	} else {
		l.WithFields(fields).Warn("Authentication event failed")
	}
}

// LogSecurityEvent logs security-related events
func (l *Logger) LogSecurityEvent(event, clientIP string, severity string, details map[string]interface{}) {
	fields := logrus.Fields{
		"type":      "security_event",
		"event":     event,
		"client_ip": clientIP,
		"severity":  severity,
	}

	// Add additional details
	for k, v := range details {
		fields[k] = v
	}

	switch severity {
	case "high":
		l.WithFields(fields).Error("High severity security event")
	case "medium":
		l.WithFields(fields).Warn("Medium severity security event")
	case "low":
		l.WithFields(fields).Info("Low severity security event")
	default:
		l.WithFields(fields).Info("Security event")
	}
}

// LogFileOperation logs file system operations
func (l *Logger) LogFileOperation(operation, filePath string, size int64, err error) {
	fields := logrus.Fields{
		"type":      "file_operation",
		"operation": operation,
		"file_path": filePath,
		"size":      size,
	}

	if err != nil {
		fields["error"] = err.Error()
		l.WithFields(fields).Error("File operation failed")
	} else {
		l.WithFields(fields).Debug("File operation completed")
	}
}

// LogSystemEvent logs system-level events
func (l *Logger) LogSystemEvent(event string, details map[string]interface{}) {
	fields := logrus.Fields{
		"type":  "system_event",
		"event": event,
	}

	// Add additional details
	for k, v := range details {
		fields[k] = v
	}

	l.WithFields(fields).Info("System event")
}