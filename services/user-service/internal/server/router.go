package server

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/L1ndenbaum/integrated-corn-assistant/services/user-service/internal/handler"
)

func NewRouter(internal *handler.InternalHandler) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"service":   "user-service",
		})
	})

	internalGroup := router.Group("/internal/user")
	{
		internalGroup.POST("/verify/username", internal.VerifyUsername)
		internalGroup.POST("/verify/email", internal.VerifyEmail)
		internalGroup.POST("/verify/phone", internal.VerifyPhone)
		internalGroup.GET("/profile/uuid/:user_uuid", internal.ProfileByUUID)
	}

	return router
}
