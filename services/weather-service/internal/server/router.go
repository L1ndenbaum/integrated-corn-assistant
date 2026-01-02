package server

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/L1ndenbaum/integrated-corn-assistant/common/jwtauth"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/weather-service/internal/handler"
)

func NewRouter(handler *handler.Handler, verifier *jwtauth.Verifier) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"service":   "weather-service",
		})
	})

	geoGroup := router.Group("/api/v1/geo")
	geoGroup.Use(jwtauth.Middleware(verifier))
	{
		geoGroup.GET("/ip", handler.GetIPLocation)
		geoGroup.GET("/weather", handler.GetWeather)
	}

	router.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{"error": "接口不存在"})
	})

	return router
}
