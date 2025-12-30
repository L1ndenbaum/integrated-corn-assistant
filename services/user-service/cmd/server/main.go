package main

import (
	"database/sql"
	"log"
	"net/http"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"github.com/L1ndenbaum/integrated-corn-assistant/services/user-service/internal/config"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/user-service/internal/handler"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/user-service/internal/server"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/user-service/internal/store"
	"github.com/L1ndenbaum/integrated-corn-assistant/common/jwtauth"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	db, err := sql.Open("mysql", cfg.DatabaseDSN)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	db.SetConnMaxLifetime(1 * time.Hour)
	db.SetMaxIdleConns(10)
	db.SetMaxOpenConns(50)

	if err := db.Ping(); err != nil {
		log.Fatalf("ping db: %v", err)
	}

	jwtVerifier, err := jwtauth.NewVerifier(cfg.JWTSecret, cfg.JWTIssuer)
	if err != nil {
		log.Fatalf("jwt verifier error: %v", err)
	}

	userStore := store.NewMySQLStore(db)
	internalHandler := handler.NewInternal(userStore)
	userHandler := handler.NewUser(userStore)

	router := server.NewRouter(internalHandler, userHandler, jwtVerifier)

	httpServer := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("user-service listening on :%s", cfg.Port)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
