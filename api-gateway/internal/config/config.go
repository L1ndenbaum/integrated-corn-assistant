package config

import (
	"errors"
	"os"
)

type Config struct {
	Port              string
	AuthServiceURL     string
	UserServiceURL     string
	ChatServiceURL     string
	WeatherServiceURL  string
	DiagnosisServiceURL string
}

func Load() (Config, error) {
	cfg := Config{
		Port:               getEnvOrDefault("PORT", "8080"),
		AuthServiceURL:     getEnvOrDefault("AUTH_SERVICE_BASE_URL", "http://auth-service:8082"),
		UserServiceURL:     getEnvOrDefault("USER_SERVICE_BASE_URL", "http://user-service:8081"),
		ChatServiceURL:     getEnvOrDefault("CHAT_SERVICE_BASE_URL", "http://chat-service:8083"),
		WeatherServiceURL:  getEnvOrDefault("WEATHER_SERVICE_BASE_URL", "http://weather-service:8084"),
		DiagnosisServiceURL: getEnvOrDefault("DIAGNOSIS_SERVICE_BASE_URL", "http://diagnosis-service:8085"),
	}

	if cfg.AuthServiceURL == "" {
		return Config{}, errors.New("AUTH_SERVICE_BASE_URL is required")
	}
	if cfg.UserServiceURL == "" {
		return Config{}, errors.New("USER_SERVICE_BASE_URL is required")
	}

	return cfg, nil
}

func getEnvOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
