package logging

import (
	"os"
	"sync"

	"github.com/sirupsen/logrus"
)

var (
	globalLogger *Logger
	once         sync.Once
)

// InitializeGlobalLogger initializes the global logger instance
func InitializeGlobalLogger(config *LogConfig) error {
	var err error
	once.Do(func() {
		globalLogger, err = NewLogger(config)
		if err != nil {
			return
		}

		// Replace the default logrus logger with our configured one
		logrus.SetLevel(globalLogger.Level)
		logrus.SetFormatter(globalLogger.Formatter)
		logrus.SetOutput(globalLogger.Out)

		globalLogger.LogSystemEvent("logger_initialized", map[string]interface{}{
			"level":  config.Level,
			"format": config.Format,
			"output": config.Output,
		})
	})
	return err
}

// GetGlobalLogger returns the global logger instance
func GetGlobalLogger() *Logger {
	if globalLogger == nil {
		// Fallback to default configuration if not initialized
		config := DefaultConfig()
		if err := InitializeGlobalLogger(config); err != nil {
			// If initialization fails, create a basic logger
			logger := logrus.New()
			logger.SetOutput(os.Stdout)
			logger.SetLevel(logrus.InfoLevel)
			globalLogger = &Logger{Logger: logger, config: config}
		}
	}
	return globalLogger
}

// Convenience functions that use the global logger

// Debug logs a debug message
func Debug(args ...interface{}) {
	GetGlobalLogger().Debug(args...)
}

// Debugf logs a formatted debug message
func Debugf(format string, args ...interface{}) {
	GetGlobalLogger().Debugf(format, args...)
}

// Info logs an info message
func Info(args ...interface{}) {
	GetGlobalLogger().Info(args...)
}

// Infof logs a formatted info message
func Infof(format string, args ...interface{}) {
	GetGlobalLogger().Infof(format, args...)
}

// Warn logs a warning message
func Warn(args ...interface{}) {
	GetGlobalLogger().Warn(args...)
}

// Warnf logs a formatted warning message
func Warnf(format string, args ...interface{}) {
	GetGlobalLogger().Warnf(format, args...)
}

// Error logs an error message
func Error(args ...interface{}) {
	GetGlobalLogger().Error(args...)
}

// Errorf logs a formatted error message
func Errorf(format string, args ...interface{}) {
	GetGlobalLogger().Errorf(format, args...)
}

// Fatal logs a fatal message and exits
func Fatal(args ...interface{}) {
	GetGlobalLogger().Fatal(args...)
}

// Fatalf logs a formatted fatal message and exits
func Fatalf(format string, args ...interface{}) {
	GetGlobalLogger().Fatalf(format, args...)
}

// WithField creates an entry with a single field
func WithField(key string, value interface{}) *logrus.Entry {
	return GetGlobalLogger().WithField(key, value)
}

// WithFields creates an entry with multiple fields
func WithFields(fields logrus.Fields) *logrus.Entry {
	return GetGlobalLogger().WithFields(fields)
}

// WithError creates an entry with an error field
func WithError(err error) *logrus.Entry {
	return GetGlobalLogger().WithError(err)
}

// WithRequestID creates an entry with request ID
func WithRequestID(requestID string) *logrus.Entry {
	return GetGlobalLogger().WithRequestID(requestID)
}

// WithUserID creates an entry with user ID
func WithUserID(userID string) *logrus.Entry {
	return GetGlobalLogger().WithUserID(userID)
}

// WithComponent creates an entry with component name
func WithComponent(component string) *logrus.Entry {
	return GetGlobalLogger().WithComponent(component)
}