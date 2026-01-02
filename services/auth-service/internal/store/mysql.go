package store

import (
	"context"
	"database/sql"
	"fmt"

	authdb "github.com/L1ndenbaum/integrated-corn-assistant/services/auth-service/internal/db"
	"github.com/google/uuid"
)

type MySQLStore struct {
	queries *authdb.Queries
}

func NewMySQLStore(db *sql.DB) *MySQLStore {
	return &MySQLStore{queries: authdb.New(db)}
}

func (s *MySQLStore) CreateRefreshToken(ctx context.Context, token RefreshToken) error {
	return s.queries.CreateRefreshToken(ctx, authdb.CreateRefreshTokenParams{
		RefreshTokenID: token.RefreshTokenID[:],
		UserUuid:       token.UserUUID[:],
		TokenHash:      token.TokenHash,
		ExpiresAt:      token.ExpiresAt,
		CreatedIp:      toNullStringPtr(token.CreatedIP),
		UserAgent:      toNullStringPtr(token.UserAgent),
	})
}

func (s *MySQLStore) GetActiveRefreshTokenByHash(ctx context.Context, hash []byte) (RefreshToken, error) {
	record, err := s.queries.GetActiveRefreshTokenByHash(ctx, hash)
	if err != nil {
		return RefreshToken{}, err
	}
	return toRefreshToken(record)
}

func (s *MySQLStore) GetRefreshTokenByID(ctx context.Context, tokenID uuid.UUID) (RefreshToken, error) {
	record, err := s.queries.GetRefreshTokenByID(ctx, tokenID[:])
	if err != nil {
		return RefreshToken{}, err
	}
	return toRefreshToken(record)
}

func (s *MySQLStore) UpdateRefreshTokenLastUsed(ctx context.Context, tokenID uuid.UUID) error {
	return s.queries.UpdateRefreshTokenLastUsed(ctx, tokenID[:])
}

func (s *MySQLStore) RotateRefreshToken(ctx context.Context, tokenID uuid.UUID, replacedBy uuid.UUID) error {
	return s.queries.RotateRefreshToken(ctx, authdb.RotateRefreshTokenParams{
		ReplacedByID:   sql.NullString{String: string(replacedBy[:]), Valid: true},
		RefreshTokenID: tokenID[:],
	})
}

func (s *MySQLStore) RevokeRefreshToken(ctx context.Context, tokenID uuid.UUID) error {
	return s.queries.RevokeRefreshToken(ctx, tokenID[:])
}

func (s *MySQLStore) RevokeRefreshTokensForUser(ctx context.Context, userUUID uuid.UUID) error {
	return s.queries.RevokeRefreshTokensForUser(ctx, userUUID[:])
}

func (s *MySQLStore) DeleteExpiredRefreshTokens(ctx context.Context) error {
	return s.queries.DeleteExpiredRefreshTokens(ctx)
}

func toRefreshToken(record authdb.AuthRefreshToken) (RefreshToken, error) {
	refreshUUID, err := uuid.FromBytes(record.RefreshTokenID)
	if err != nil {
		return RefreshToken{}, fmt.Errorf("invalid refresh_token_id: %w", err)
	}

	userUUIDParsed, err := uuid.FromBytes(record.UserUuid)
	if err != nil {
		return RefreshToken{}, fmt.Errorf("invalid user_uuid: %w", err)
	}

	var replacedUUID *uuid.UUID
	if record.ReplacedByID.Valid && record.ReplacedByID.String != "" {
		replacedBytes := []byte(record.ReplacedByID.String)
		parsed, err := uuid.FromBytes(replacedBytes)
		if err != nil {
			return RefreshToken{}, fmt.Errorf("invalid replaced_by_id: %w", err)
		}
		replacedUUID = &parsed
	}

	token := RefreshToken{
		RefreshTokenID: refreshUUID,
		UserUUID:       userUUIDParsed,
		TokenHash:      record.TokenHash,
		IssuedAt:       record.IssuedAt,
		ExpiresAt:      record.ExpiresAt,
	}

	if record.RevokedAt.Valid {
		token.RevokedAt = &record.RevokedAt.Time
	}
	if record.LastUsedAt.Valid {
		token.LastUsedAt = &record.LastUsedAt.Time
	}
	if replacedUUID != nil {
		token.ReplacedByID = replacedUUID
	}
	if record.CreatedIp.Valid {
		token.CreatedIP = &record.CreatedIp.String
	}
	if record.UserAgent.Valid {
		token.UserAgent = &record.UserAgent.String
	}

	return token, nil
}

func toNullStringPtr(value *string) sql.NullString {
	if value == nil || *value == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: *value, Valid: true}
}
