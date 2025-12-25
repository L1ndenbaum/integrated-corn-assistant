package server

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/L1ndenbaum/integrated-corn-assistant/services/auth-service/internal/handler"
)

func NewRouter(handler *handler.Handler) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"service":   "auth-service",
		})
	})

	auth := router.Group("/api/v1/auth")
	{
		auth.POST("/login/username", handler.LoginUsername)
		auth.POST("/login/email", handler.LoginEmail)
		auth.POST("/login/phone", handler.LoginPhone)
		auth.GET("/session", handler.Session)
		auth.POST("/refresh", handler.Refresh)
		auth.POST("/logout", handler.Logout)
	}

	return router
}
