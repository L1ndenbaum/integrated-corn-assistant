package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type MySQLStore struct {
	db *sql.DB
}

func NewMySQLStore(db *sql.DB) *MySQLStore {
	return &MySQLStore{db: db}
}

func (s *MySQLStore) CreateRefreshToken(ctx context.Context, token RefreshToken) error {
	query := `INSERT INTO auth_refresh_tokens (
    refresh_token_id,
    user_uuid,
    token_hash,
    expires_at,
    created_ip,
    user_agent
) VALUES (?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(
		ctx,
		query,
		token.RefreshTokenID[:],
		token.UserUUID[:],
		token.TokenHash,
		token.ExpiresAt,
		token.CreatedIP,
		token.UserAgent,
	)
	return err
}

func (s *MySQLStore) GetActiveRefreshTokenByHash(ctx context.Context, hash []byte) (RefreshToken, error) {
	query := `SELECT
    refresh_token_id,
    user_uuid,
    token_hash,
    issued_at,
    expires_at,
    revoked_at,
    last_used_at,
    replaced_by_id,
    created_ip,
    user_agent
FROM auth_refresh_tokens
WHERE token_hash = ?
    AND revoked_at IS NULL
    AND expires_at > NOW()`

	row := s.db.QueryRowContext(ctx, query, hash)
	return scanRefreshToken(row)
}

func (s *MySQLStore) GetRefreshTokenByID(ctx context.Context, tokenID uuid.UUID) (RefreshToken, error) {
	query := `SELECT
    refresh_token_id,
    user_uuid,
    token_hash,
    issued_at,
    expires_at,
    revoked_at,
    last_used_at,
    replaced_by_id,
    created_ip,
    user_agent
FROM auth_refresh_tokens
WHERE refresh_token_id = ?`

	row := s.db.QueryRowContext(ctx, query, tokenID[:])
	return scanRefreshToken(row)
}

func (s *MySQLStore) UpdateRefreshTokenLastUsed(ctx context.Context, tokenID uuid.UUID) error {
	query := `UPDATE auth_refresh_tokens
SET last_used_at = NOW()
WHERE refresh_token_id = ?`

	_, err := s.db.ExecContext(ctx, query, tokenID[:])
	return err
}

func (s *MySQLStore) RotateRefreshToken(ctx context.Context, tokenID uuid.UUID, replacedBy uuid.UUID) error {
	query := `UPDATE auth_refresh_tokens
SET revoked_at = NOW(),
    replaced_by_id = ?,
    last_used_at = NOW()
WHERE refresh_token_id = ?
    AND revoked_at IS NULL`

	_, err := s.db.ExecContext(ctx, query, replacedBy[:], tokenID[:])
	return err
}

func (s *MySQLStore) RevokeRefreshToken(ctx context.Context, tokenID uuid.UUID) error {
	query := `UPDATE auth_refresh_tokens
SET revoked_at = NOW()
WHERE refresh_token_id = ?
    AND revoked_at IS NULL`

	_, err := s.db.ExecContext(ctx, query, tokenID[:])
	return err
}

func (s *MySQLStore) RevokeRefreshTokensForUser(ctx context.Context, userUUID uuid.UUID) error {
	query := `UPDATE auth_refresh_tokens
SET revoked_at = NOW()
WHERE user_uuid = ?
    AND revoked_at IS NULL`

	_, err := s.db.ExecContext(ctx, query, userUUID[:])
	return err
}

func (s *MySQLStore) DeleteExpiredRefreshTokens(ctx context.Context) error {
	query := `DELETE FROM auth_refresh_tokens
WHERE expires_at < NOW()`

	_, err := s.db.ExecContext(ctx, query)
	return err
}

type scanner interface {
	Scan(dest ...any) error
}

func scanRefreshToken(row scanner) (RefreshToken, error) {
	var (
		refreshTokenID []byte
		userUUID       []byte
		tokenHash      []byte
		issuedAt       time.Time
		expiresAt      time.Time
		revokedAt      sql.NullTime
		lastUsedAt     sql.NullTime
		replacedByID   []byte
		createdIP      sql.NullString
		userAgent      sql.NullString
	)

	if err := row.Scan(
		&refreshTokenID,
		&userUUID,
		&tokenHash,
		&issuedAt,
		&expiresAt,
		&revokedAt,
		&lastUsedAt,
		&replacedByID,
		&createdIP,
		&userAgent,
	); err != nil {
		return RefreshToken{}, err
	}

	refreshUUID, err := uuid.FromBytes(refreshTokenID)
	if err != nil {
		return RefreshToken{}, fmt.Errorf("invalid refresh_token_id: %w", err)
	}

	userUUIDParsed, err := uuid.FromBytes(userUUID)
	if err != nil {
		return RefreshToken{}, fmt.Errorf("invalid user_uuid: %w", err)
	}

	var replacedUUID *uuid.UUID
	if len(replacedByID) > 0 {
		parsed, err := uuid.FromBytes(replacedByID)
		if err != nil {
			return RefreshToken{}, fmt.Errorf("invalid replaced_by_id: %w", err)
		}
		replacedUUID = &parsed
	}

	token := RefreshToken{
		RefreshTokenID: refreshUUID,
		UserUUID:       userUUIDParsed,
		TokenHash:      tokenHash,
		IssuedAt:       issuedAt,
		ExpiresAt:      expiresAt,
	}

	if revokedAt.Valid {
		token.RevokedAt = &revokedAt.Time
	}
	if lastUsedAt.Valid {
		token.LastUsedAt = &lastUsedAt.Time
	}
	if replacedUUID != nil {
		token.ReplacedByID = replacedUUID
	}
	if createdIP.Valid {
		token.CreatedIP = &createdIP.String
	}
	if userAgent.Valid {
		token.UserAgent = &userAgent.String
	}

	return token, nil
}

func isNotFound(err error) bool {
	return errors.Is(err, sql.ErrNoRows)
}
