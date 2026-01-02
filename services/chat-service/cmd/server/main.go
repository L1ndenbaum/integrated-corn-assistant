package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/L1ndenbaum/integrated-corn-assistant/common/jwtauth"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/chat-service/internal/config"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/chat-service/internal/dify"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/chat-service/internal/handler"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/chat-service/internal/server"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	client, err := dify.New(cfg.DifyAPIKey, cfg.DifyBaseURL, cfg.AllProxy)
	if err != nil {
		log.Fatalf("dify client error: %v", err)
	}

	jwtVerifier, err := jwtauth.NewVerifier(cfg.JWTSecret, cfg.JWTIssuer)
	if err != nil {
		log.Fatalf("jwt verifier error: %v", err)
	}

	gin.SetMode(gin.ReleaseMode)
	chatHandler := handler.New(client, cfg.PageLimit)
	router := server.NewRouter(chatHandler, jwtVerifier)

	httpServer := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("chat-service listening on :%s", cfg.Port)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
