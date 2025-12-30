package config

import (
	"errors"
	"os"
	"strconv"
)

type Config struct {
	Port        string
	DifyAPIKey  string
	DifyBaseURL string
	AllProxy    string
	PageLimit   int
}

func Load() (Config, error) {
	cfg := Config{
		Port:        getEnvOrDefault("PORT", "8083"),
		DifyAPIKey:  os.Getenv("DIFY_API_KEY"),
		DifyBaseURL: getEnvOrDefault("DIFY_BASE_URL", "https://api.dify.ai/v1"),
		AllProxy:    os.Getenv("ALL_PROXY"),
		PageLimit:   getEnvIntOrDefault("PAGE_LIMIT", 20),
	}

	if cfg.DifyAPIKey == "" {
		return Config{}, errors.New("DIFY_API_KEY is required")
	}

	return cfg, nil
}

func getEnvOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvIntOrDefault(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	if parsed <= 0 {
		return fallback
	}
	return parsed
}
