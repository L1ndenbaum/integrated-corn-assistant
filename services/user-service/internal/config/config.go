package config

import (
	"errors"
	"os"
)

type Config struct {
	Port        string
	DatabaseDSN string
	JWTSecret   string
	JWTIssuer   string
}

func Load() (Config, error) {
	cfg := Config{
		Port:        getEnvOrDefault("PORT", "8081"),
		DatabaseDSN: os.Getenv("USER_DB_DSN"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		JWTIssuer:   getEnvOrDefault("JWT_ISSUER", "corn-assistant"),
	}

	if cfg.DatabaseDSN == "" {
		return Config{}, errors.New("USER_DB_DSN is required")
	}
	if cfg.JWTSecret == "" {
		return Config{}, errors.New("JWT_SECRET is required")
	}

	return cfg, nil
}

func getEnvOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
