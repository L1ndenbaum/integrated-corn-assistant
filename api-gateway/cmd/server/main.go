package main

import (
	"log"
	"net/http"
	"time"

	"github.com/L1ndenbaum/integrated-corn-assistant/api-gateway/internal/config"
	"github.com/L1ndenbaum/integrated-corn-assistant/api-gateway/internal/server"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	router, err := server.NewRouter(cfg)
	if err != nil {
		log.Fatalf("router error: %v", err)
	}

	httpServer := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("api-gateway listening on :%s", cfg.Port)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
