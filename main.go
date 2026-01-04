package main

import (
	"embed"
	"io"
	"io/fs"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"

	"geoalbum/backend"
	"geoalbum/backend/logging"
)

//go:embed all:frontend/dist
var assets embed.FS

// initMimeTypes 注册非标准或特定需求的 MIME 类型
func initMimeTypes() {
	mime.AddExtensionType(".webp", "image/webp")
	mime.AddExtensionType(".avif", "image/avif")
	mime.AddExtensionType(".woff2", "font/woff2")
}

// getCacheHeaders 返回基于文件类型的 Cache-Control 值
func getCacheHeaders(ext string) string {
	switch ext {
	case ".js", ".css", ".woff", ".woff2", ".ttf", ".eot":
		return "public, max-age=31536000, immutable"
	case ".svg", ".ico", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif":
		return "public, max-age=604800"
	case ".html":
		return "no-cache, no-store, must-revalidate"
	case ".json":
		return "public, max-age=3600"
	default:
		return "public, max-age=3600"
	}
}

// serveFile 设置响应头并使用 http.ServeContent 发送文件
func serveFile(c *gin.Context, file fs.File, filePath string) {
	stat, err := file.Stat()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to stat file"})
		return
	}

	ext := filepath.Ext(filePath)

	// 设置 Content-Type
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	if strings.HasPrefix(contentType, "text/") || contentType == "application/javascript" || contentType == "application/json" {
		contentType += "; charset=utf-8"
	}
	c.Header("Content-Type", contentType)

	// 设置 Cache-Control
	c.Header("Cache-Control", getCacheHeaders(ext))

	// HTML 安全头
	if ext == ".html" {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
	}

	// embed.FS 的文件实现了 io.ReadSeeker，直接类型断言
	seeker, ok := file.(io.ReadSeeker)
	if !ok {
		// 理论上 embed.FS 总是支持 ReadSeeker，这里不应该到达
		logging.Error("File does not implement io.ReadSeeker")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	http.ServeContent(c.Writer, c.Request, filePath, stat.ModTime(), seeker)
}

func frontendHandler(dist fs.FS) gin.HandlerFunc {
	return func(c *gin.Context) {
		reqPath := c.Request.URL.Path

		// API 路由拦截
		if strings.HasPrefix(reqPath, "/api/") {
			c.Header("Content-Type", "application/json")
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":    "ROUTE_NOT_FOUND",
					"message": "API endpoint not found",
					"details": gin.H{
						"path":   reqPath,
						"method": c.Request.Method,
					},
				},
			})
			return
		}

		// 根路径处理
		if reqPath == "/" {
			reqPath = "/index.html"
		}

		// 路径清理
		filePath := strings.TrimPrefix(path.Clean(reqPath), "/")

		// 防御性检查：防止路径遍历
		// fs.Sub 已提供隔离，此检查为额外防护
		if strings.Contains(filePath, "..") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid path"})
			return
		}

		// 打开文件
		file, err := dist.Open(filePath)
		if err != nil {
			// SPA 回退：无扩展名的路径返回 index.html
			if os.IsNotExist(err) && filepath.Ext(filePath) == "" {
				if indexFile, indexErr := dist.Open("index.html"); indexErr == nil {
					defer indexFile.Close()
					serveFile(c, indexFile, "index.html")
					return
				}
			}

			c.Header("Content-Type", "application/json")
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":    "FILE_NOT_FOUND",
					"message": "Static file not found",
					"details": gin.H{"path": filePath},
				},
			})
			return
		}
		defer file.Close()

		// 获取文件信息
		stat, err := file.Stat()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to stat file"})
			return
		}

		// 目录处理：返回 index.html
		if stat.IsDir() {
			if indexFile, indexErr := dist.Open("index.html"); indexErr == nil {
				defer indexFile.Close()
				serveFile(c, indexFile, "index.html")
				return
			}
			c.JSON(http.StatusNotFound, gin.H{"error": "Directory listing not allowed"})
			return
		}

		serveFile(c, file, filePath)
	}
}

func main() {
	logConfig := &logging.LogConfig{
		Level:      getLogLevel(),
		Format:     getLogFormat(),
		Output:     getLogOutput(),
		LogDir:     "logs",
		MaxSize:    100,
		MaxBackups: 5,
		MaxAge:     30,
		Compress:   true,
	}

	if err := logging.InitializeGlobalLogger(logConfig); err != nil {
		panic("Failed to initialize logging system: " + err.Error())
	}

	logging.Info("Starting GeoAlbum server")

	initMimeTypes()

	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())

	backend.Register(r)

	distFS, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		logging.Fatal("Failed to setup frontend assets: " + err.Error())
	}

	r.NoRoute(frontendHandler(distFS))

	port := getServerPort()
	logging.WithField("port", port).Info("Server starting")

	if err := r.Run(":" + port); err != nil {
		logging.WithError(err).Fatal("Failed to start server")
	}
}

func getLogLevel() logging.LogLevel {
	switch strings.ToLower(os.Getenv("LOG_LEVEL")) {
	case "debug":
		return logging.DebugLevel
	case "info":
		return logging.InfoLevel
	case "warn":
		return logging.WarnLevel
	case "error":
		return logging.ErrorLevel
	default:
		return logging.InfoLevel
	}
}

func getLogFormat() string {
	if os.Getenv("LOG_FORMAT") == "text" {
		return "text"
	}
	return "json"
}

func getLogOutput() string {
	switch os.Getenv("LOG_OUTPUT") {
	case "stdout":
		return "stdout"
	case "file":
		return "file"
	case "both":
		return "both"
	default:
		return "both"
	}
}

func getServerPort() string {
	if port := os.Getenv("PORT"); port != "" {
		return port
	}
	return "8080"
}
