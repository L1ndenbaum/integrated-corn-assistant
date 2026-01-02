package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/L1ndenbaum/integrated-corn-assistant/common/jwtauth"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/weather-service/internal/config"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/weather-service/internal/handler"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/weather-service/internal/server"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	jwtVerifier, err := jwtauth.NewVerifier(cfg.JWTSecret, cfg.JWTIssuer)
	if err != nil {
		log.Fatalf("jwt verifier error: %v", err)
	}

	gin.SetMode(gin.ReleaseMode)

	weatherHandler := handler.New(cfg.AMapKey)
	router := server.NewRouter(weatherHandler, jwtVerifier)

	httpServer := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("weather-service listening on :%s", cfg.Port)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
