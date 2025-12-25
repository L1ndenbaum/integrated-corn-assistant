package store

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type RefreshToken struct {
	RefreshTokenID uuid.UUID
	UserUUID       uuid.UUID
	TokenHash      []byte
	IssuedAt       time.Time
	ExpiresAt      time.Time
	RevokedAt      *time.Time
	LastUsedAt     *time.Time
	ReplacedByID   *uuid.UUID
	CreatedIP      *string
	UserAgent      *string
}

type RefreshTokenStore interface {
	CreateRefreshToken(ctx context.Context, token RefreshToken) error
	GetActiveRefreshTokenByHash(ctx context.Context, hash []byte) (RefreshToken, error)
	GetRefreshTokenByID(ctx context.Context, tokenID uuid.UUID) (RefreshToken, error)
	UpdateRefreshTokenLastUsed(ctx context.Context, tokenID uuid.UUID) error
	RotateRefreshToken(ctx context.Context, tokenID uuid.UUID, replacedBy uuid.UUID) error
	RevokeRefreshToken(ctx context.Context, tokenID uuid.UUID) error
	RevokeRefreshTokensForUser(ctx context.Context, userUUID uuid.UUID) error
	DeleteExpiredRefreshTokens(ctx context.Context) error
}
