package main

import (
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	staticDir            string
	frontendStaticOutDir string
	avatarDir            string
)

func init() {
	// 获取静态文件目录
	ex, err := os.Executable()
	if err != nil {
		panic(err)
	}
	exPath := filepath.Dir(ex)
	staticDir = filepath.Join(exPath, "static")
	frontendStaticOutDir = filepath.Join(staticDir, "out")
	avatarDir = os.Getenv("AVATAR_DIR")
	if avatarDir == "" {
		avatarDir = filepath.Join(exPath, "avatars")
	}
}

func main() {
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	setupRoutes(router)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8086"
	}
	router.Run(":" + port)
}

// setupRoutes 设置路由
func setupRoutes(router *gin.Engine) {
	// 静态文件服务
	router.Static("/_next", filepath.Join(frontendStaticOutDir, "_next"))
	router.Static("/images", filepath.Join(frontendStaticOutDir, "images"))
	router.Static("/avatar", avatarDir)

	// 主页和图标
	router.GET("/", func(c *gin.Context) {
		c.File(filepath.Join(frontendStaticOutDir, "index.html"))
	})

	router.GET("/auth/login", func(c *gin.Context) {
		c.File(filepath.Join(frontendStaticOutDir, "auth", "login.html"))
	})

	router.GET("/auth/register", func(c *gin.Context) {
		c.File(filepath.Join(frontendStaticOutDir, "auth", "register.html"))
	})

	// 诊断页
	router.GET("/diagnosis", func(c *gin.Context) {
		c.File(filepath.Join(frontendStaticOutDir, "diagnosis.html"))
	})

	// 聊天页
	router.GET("/qa", func(c *gin.Context) {
		c.File(filepath.Join(frontendStaticOutDir, "qa.html"))
	})

	// 信息控制台页
	router.GET("/dashboard", func(c *gin.Context) {
		c.File(filepath.Join(frontendStaticOutDir, "dashboard.html"))
	})

	// 页面图标
	router.GET("/favicon.ico", func(c *gin.Context) {
		c.File(filepath.Join(frontendStaticOutDir, "favicon.ico"))
	})

	// 健康检查
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"service":   "static-server",
		})
	})

	// 404 处理
	router.NoRoute(func(c *gin.Context) {
		// 匹配所有 / 目录下的文件
		filePath := c.Request.URL.Path
		fullPath := filepath.Join(frontendStaticOutDir, filePath)
		if _, err := os.Stat(fullPath); err == nil {
			c.File(fullPath)
			return
		}

		// 真正的404
		c.JSON(http.StatusNotFound, gin.H{
			"error": "页面或接口不存在",
		})
	})
}
