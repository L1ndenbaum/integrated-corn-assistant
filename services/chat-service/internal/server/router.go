package server

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/L1ndenbaum/integrated-corn-assistant/services/chat-service/internal/handler"
)

func NewRouter(handler *handler.Handler) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"service":   "chat-service",
		})
	})

	router.POST("/api/v1/chat/messages", handler.Chat)
	router.GET("/api/v1/chat/suggestions/:message_id", handler.GetNextProblemSuggestion)
	router.POST("/api/v1/chat/files/upload", handler.UploadFiles)

	router.GET("/api/v1/chat/conversations/:username", handler.ListConversations)
	router.GET("/api/v1/chat/conversations/:conversation_id/history", handler.GetChatHistory)
	router.DELETE("/api/v1/chat/conversations/:conversation_id", handler.DeleteConversation)

	router.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{"error": "接口不存在"})
	})

	return router
}
