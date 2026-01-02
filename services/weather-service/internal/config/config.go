package config

import (
	"errors"
	"os"
)

type Config struct {
	Port      string
	AMapKey   string
	JWTSecret string
	JWTIssuer string
}

func Load() (Config, error) {
	cfg := Config{
		Port:      getEnvOrDefault("PORT", "8084"),
		AMapKey:   getEnvOrDefault("AMAP_KEY", os.Getenv("AMapKey")),
		JWTSecret: os.Getenv("JWT_SECRET"),
		JWTIssuer: getEnvOrDefault("JWT_ISSUER", "corn-assistant"),
	}

	if cfg.AMapKey == "" {
		return Config{}, errors.New("AMAP_KEY is required")
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
