package main

import (
	"log"
	"net/http"
	"time"

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

	chatHandler := handler.New(client, cfg.PageLimit)
	router := server.NewRouter(chatHandler)

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
