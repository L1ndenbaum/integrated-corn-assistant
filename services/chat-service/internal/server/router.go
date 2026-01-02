package server

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/L1ndenbaum/integrated-corn-assistant/common/jwtauth"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/chat-service/internal/handler"
)

func NewRouter(handler *handler.Handler, verifier *jwtauth.Verifier) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"service":   "chat-service",
		})
	})

	chatGroup := router.Group("/api/v1/chat")
	chatGroup.Use(jwtauth.Middleware(verifier))
	{
		chatGroup.POST("/messages", handler.Chat)
		chatGroup.GET("/suggestions/:message_id", handler.GetNextProblemSuggestion)
		chatGroup.POST("/files/upload", handler.UploadFiles)

		chatGroup.GET("/conversations/user/:username", handler.ListConversations)
		chatGroup.GET("/conversations/:conversation_id/history", handler.GetChatHistory)
		chatGroup.DELETE("/conversations/:conversation_id", handler.DeleteConversation)
	}

	router.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{"error": "接口不存在"})
	})

	return router
}
