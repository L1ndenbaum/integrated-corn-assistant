package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port               string
	DatabaseDSN        string
	UserServiceBaseURL string
	JWTSecret          string
	JWTIssuer          string
	AccessTokenTTL     time.Duration
	RefreshTokenTTL    time.Duration
	CookieDomain       string
	CookieSecure       bool
	CookieSameSite     string
}

func Load() (Config, error) {
	cfg := Config{
		Port:               getEnvOrDefault("PORT", "8082"),
		DatabaseDSN:        os.Getenv("AUTH_DB_DSN"),
		UserServiceBaseURL: strings.TrimRight(os.Getenv("USER_SERVICE_BASE_URL"), "/"),
		JWTSecret:          os.Getenv("JWT_SECRET"),
		JWTIssuer:          getEnvOrDefault("JWT_ISSUER", "corn-assistant"),
		AccessTokenTTL:     parseDuration("ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTokenTTL:    parseDuration("REFRESH_TOKEN_TTL", 720*time.Hour),
		CookieDomain:       os.Getenv("COOKIE_DOMAIN"),
		CookieSecure:       parseBool("COOKIE_SECURE", false),
		CookieSameSite:     getEnvOrDefault("COOKIE_SAMESITE", "lax"),
	}

	if cfg.DatabaseDSN == "" {
		return Config{}, errors.New("AUTH_DB_DSN is required")
	}
	if cfg.UserServiceBaseURL == "" {
		return Config{}, errors.New("USER_SERVICE_BASE_URL is required")
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

func parseDuration(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func parseBool(key string, fallback bool) bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}
