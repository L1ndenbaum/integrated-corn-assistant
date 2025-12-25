package config

import (
	"errors"
	"os"
)

type Config struct {
	Port        string
	DatabaseDSN string
}

func Load() (Config, error) {
	cfg := Config{
		Port:        getEnvOrDefault("PORT", "8081"),
		DatabaseDSN: os.Getenv("USER_DB_DSN"),
	}

	if cfg.DatabaseDSN == "" {
		return Config{}, errors.New("USER_DB_DSN is required")
	}

	return cfg, nil
}

func getEnvOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
