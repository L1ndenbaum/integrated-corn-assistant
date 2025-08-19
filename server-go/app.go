package main

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

var (
	staticDir            string
	frontendStaticOutDir string
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
}

func main() {
	// 设置为发布模式
	gin.SetMode(gin.ReleaseMode)

	// 创建gin引擎
	router := gin.Default()

	// 配置CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://101.43.131.195:4040",
			"http://gd736e64.natappfree.cc",
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// 初始化数据库
	err := InitDatabase()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize database: %v", err))
	}

	// 打印数据库连接信息
	fmt.Println("Database connected successfully")

	// 注册路由
	setupRoutes(router)

	// 启动服务器
	fmt.Println("Server starting on :8080")
	// server := &http.Server{
	// 	Addr:           ":8080",
	// 	Handler:        router,
	// 	ReadTimeout:    0, // disable read timeout
	// 	WriteTimeout:   0, // disable write timeout (important for SSE)
	// 	IdleTimeout:    0, // optional
	// 	MaxHeaderBytes: 1 << 20,
	// }
	// server.ListenAndServe()
	router.Run(":8080")
}

// setupRoutes 设置路由
func setupRoutes(router *gin.Engine) {
	// 用户控制接口
	router.POST("/api/user/register", RegisterUser)
	router.POST("/api/user/login", LoginUser)
	router.GET("/api/user/info/:username", GetUserInfo)
	router.POST("/api/user/change-password", ChangePassword)
	router.POST("/api/user/update-avatar", UpdateUserAvatar)

	// 静态文件服务接口
	router.GET("/auth/login", ServeLogin)
	router.GET("/auth/login.txt", ServeLoginTxt)
	router.GET("/auth/register", ServeRegister)
	router.GET("/auth/register.txt", ServeRegisterTxt)

	// 聊天接口
	router.POST("/api/chat", Chat)
	router.GET("/api/chat/next_suggest/:message_id", GetNextProblemSuggestion)
	router.GET("/api/conversations/list/:username", ListConversations)
	router.GET("/api/conversations/:conversation_id/history", GetChatHistory)
	router.DELETE("/api/conversations/:conversation_id/delete", DeleteConversation)
	router.POST("/api/file/upload", UploadFiles)

	// 静态文件服务
	router.Static("/_next", filepath.Join(frontendStaticOutDir, "_next"))
	router.Static("/images", filepath.Join(frontendStaticOutDir, "images"))
	router.Static("/static/avatars", filepath.Join(staticDir, "avatars"))

	// 主页和图标
	router.GET("/", func(c *gin.Context) {
		c.File(filepath.Join(frontendStaticOutDir, "index.html"))
	})

	// 用户头像
	router.GET("/avatars/*filepath", func(c *gin.Context) {
		filePath := c.Param("filepath")
		c.File(filepath.Join("static/avatars", filePath))
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
	router.GET("/dashboard.txt", ServeRegisterTxt)

	// 页面图标
	router.GET("/favicon.ico", func(c *gin.Context) {
		c.File(filepath.Join(frontendStaticOutDir, "favicon.ico"))
	})

	// 健康检查
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"service":   "chatbot-backend",
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
