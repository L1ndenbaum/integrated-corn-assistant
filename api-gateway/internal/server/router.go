package server

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/L1ndenbaum/integrated-corn-assistant/api-gateway/internal/config"
	"github.com/L1ndenbaum/integrated-corn-assistant/api-gateway/internal/proxy"
)

func NewRouter(cfg config.Config) (*gin.Engine, error) {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"service":   "api-gateway",
		})
	})

	if err := registerProxy(router, "/api/v1/auth", cfg.AuthServiceURL); err != nil {
		return nil, err
	}
	if err := registerProxy(router, "/api/v1/user", cfg.UserServiceURL); err != nil {
		return nil, err
	}
	_ = registerProxy(router, "/api/v1/chat", cfg.ChatServiceURL)
	_ = registerProxy(router, "/api/v1/geo", cfg.WeatherServiceURL)
	_ = registerProxy(router, "/api/v1/diagnosis", cfg.DiagnosisServiceURL)

	router.Any("/internal", blockInternal)
	router.Any("/internal/*proxyPath", blockInternal)

	router.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{"error": "接口不存在"})
	})

	return router, nil
}

func registerProxy(router *gin.Engine, prefix, target string) error {
	if target == "" {
		return nil
	}

	proxyHandler, err := proxy.New(target)
	if err != nil {
		return err
	}

	handler := func(c *gin.Context) {
		proxyHandler.Reverse.ServeHTTP(c.Writer, c.Request)
	}

	router.Any(prefix, handler)
	router.Any(prefix+"/*proxyPath", handler)
	return nil
}

func blockInternal(c *gin.Context) {
	c.JSON(http.StatusNotFound, gin.H{"error": "接口不存在"})
}
