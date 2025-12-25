package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type TokenManager struct {
	secret        []byte
	issuer        string
	accessTTL     time.Duration
	refreshTTL    time.Duration
	refreshLength int
}

type AccessTokenClaims struct {
	UserID     int64  `json:"uid"`
	Username   string `json:"username"`
	Privilege  int32  `json:"privilege"`
	Status     int32  `json:"status"`
	MFAEnabled bool   `json:"mfa"`
	jwt.RegisteredClaims
}

type UserTokenPayload struct {
	UserUUID   string
	UserID     int64
	Username   string
	Privilege  int32
	Status     int32
	MFAEnabled bool
}

type RefreshTokenData struct {
	TokenID   uuid.UUID
	Token     string
	TokenHash []byte
	ExpiresAt time.Time
}

func NewTokenManager(secret, issuer string, accessTTL, refreshTTL time.Duration) (*TokenManager, error) {
	if secret == "" {
		return nil, errors.New("jwt secret cannot be empty")
	}
	if issuer == "" {
		return nil, errors.New("jwt issuer cannot be empty")
	}
	return &TokenManager{
		secret:        []byte(secret),
		issuer:        issuer,
		accessTTL:     accessTTL,
		refreshTTL:    refreshTTL,
		refreshLength: 32,
	}, nil
}

func (m *TokenManager) GenerateAccessToken(payload UserTokenPayload) (string, time.Time, error) {
	now := time.Now()
	expiresAt := now.Add(m.accessTTL)

	claims := AccessTokenClaims{
		UserID:     payload.UserID,
		Username:   payload.Username,
		Privilege:  payload.Privilege,
		Status:     payload.Status,
		MFAEnabled: payload.MFAEnabled,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   payload.UserUUID,
			Issuer:    m.issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(m.secret)
	if err != nil {
		return "", time.Time{}, err
	}
	return signed, expiresAt, nil
}

func (m *TokenManager) ParseAccessToken(token string) (*AccessTokenClaims, error) {
	parsed, err := jwt.ParseWithClaims(token, &AccessTokenClaims{}, func(t *jwt.Token) (interface{}, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return m.secret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := parsed.Claims.(*AccessTokenClaims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid token")
	}
	if claims.Issuer != m.issuer {
		return nil, errors.New("invalid issuer")
	}
	return claims, nil
}

func (m *TokenManager) GenerateRefreshToken() (RefreshTokenData, error) {
	raw := make([]byte, m.refreshLength)
	if _, err := rand.Read(raw); err != nil {
		return RefreshTokenData{}, err
	}

	token := base64.RawURLEncoding.EncodeToString(raw)
	hash := sha256.Sum256([]byte(token))
	tokenID, err := uuid.NewV7()
	if err != nil {
		return RefreshTokenData{}, err
	}

	return RefreshTokenData{
		TokenID:   tokenID,
		Token:     token,
		TokenHash: hash[:],
		ExpiresAt: time.Now().Add(m.refreshTTL),
	}, nil
}
