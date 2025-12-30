package store

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type MySQLStore struct {
	db *sql.DB
}

func NewMySQLStore(db *sql.DB) *MySQLStore {
	return &MySQLStore{db: db}
}

func (s *MySQLStore) GetActiveUserByUsername(ctx context.Context, username string) (UserRecord, error) {
	query := `SELECT
    user_id,
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_status,
    avatar_path,
    mfa_enabled,
    last_login_at,
    last_login_ip,
    locked_until
FROM users
WHERE username = ?
    AND user_status = 1`

	row := s.db.QueryRowContext(ctx, query, username)
	return scanUser(row)
}

func (s *MySQLStore) GetUserByUsername(ctx context.Context, username string) (UserRecord, error) {
	query := `SELECT
    user_id,
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_status,
    avatar_path,
    mfa_enabled,
    last_login_at,
    last_login_ip,
    locked_until
FROM users
WHERE username = ?`

	row := s.db.QueryRowContext(ctx, query, username)
	return scanUser(row)
}

func (s *MySQLStore) GetActiveUserByEmail(ctx context.Context, email string) (UserRecord, error) {
	query := `SELECT
    user_id,
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_status,
    avatar_path,
    mfa_enabled,
    last_login_at,
    last_login_ip,
    locked_until
FROM users
WHERE email = ?
    AND user_status = 1`

	row := s.db.QueryRowContext(ctx, query, email)
	return scanUser(row)
}

func (s *MySQLStore) GetActiveUserByPhone(ctx context.Context, phone string) (UserRecord, error) {
	query := `SELECT
    user_id,
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_status,
    avatar_path,
    mfa_enabled,
    last_login_at,
    last_login_ip,
    locked_until
FROM users
WHERE phone = ?
    AND user_status = 1`

	row := s.db.QueryRowContext(ctx, query, phone)
	return scanUser(row)
}

func (s *MySQLStore) GetUserByUUID(ctx context.Context, uuidBytes []byte) (UserRecord, error) {
	query := `SELECT
    user_id,
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_status,
    avatar_path,
    mfa_enabled,
    last_login_at,
    last_login_ip,
    locked_until
FROM users
WHERE user_uuid = ?`

	row := s.db.QueryRowContext(ctx, query, uuidBytes)
	return scanUser(row)
}

func (s *MySQLStore) CreateUser(ctx context.Context, params CreateUserParams) (int64, error) {
	query := `INSERT INTO users (
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_balance,
    user_status,
    avatar_path,
    mfa_enabled
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	result, err := s.db.ExecContext(
		ctx,
		query,
		params.UserUUID,
		params.Username,
		params.Email,
		params.Phone,
		params.PasswordHash,
		params.UserPrivilege,
		params.UserBalance,
		params.UserStatus,
		params.AvatarPath,
		params.MFAEnabled,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (s *MySQLStore) UpdatePasswordHash(ctx context.Context, userID int64, passwordHash string) error {
	query := `UPDATE users
SET password_hash = ?, password_updated_at = NOW()
WHERE user_id = ?`

	_, err := s.db.ExecContext(ctx, query, passwordHash, userID)
	return err
}

func (s *MySQLStore) UpdateAvatarPath(ctx context.Context, userID int64, avatarPath *string) error {
	query := `UPDATE users
SET avatar_path = ?
WHERE user_id = ?`

	_, err := s.db.ExecContext(ctx, query, avatarPath, userID)
	return err
}

func (s *MySQLStore) UpdateLoginSuccess(ctx context.Context, userID int64, ip string) error {
	query := `UPDATE users
SET last_login_at = NOW(),
    last_login_ip = ?,
    failed_login_attempts = 0,
    locked_until = NULL
WHERE user_id = ?`

	_, err := s.db.ExecContext(ctx, query, ip, userID)
	return err
}

func (s *MySQLStore) IncrementFailedLoginAttempts(ctx context.Context, userID int64) (int, error) {
	query := `UPDATE users
SET failed_login_attempts = failed_login_attempts + 1
WHERE user_id = ?`

	if _, err := s.db.ExecContext(ctx, query, userID); err != nil {
		return 0, err
	}

	row := s.db.QueryRowContext(ctx, "SELECT failed_login_attempts FROM users WHERE user_id = ?", userID)
	var attempts int
	if err := row.Scan(&attempts); err != nil {
		return 0, err
	}
	return attempts, nil
}

func (s *MySQLStore) SetLockedUntil(ctx context.Context, userID int64, lockedUntil time.Time) error {
	query := `UPDATE users
SET locked_until = ?
WHERE user_id = ?`

	_, err := s.db.ExecContext(ctx, query, lockedUntil, userID)
	return err
}

type scanner interface {
	Scan(dest ...any) error
}

func scanUser(row scanner) (UserRecord, error) {
	var (
		userID        int64
		userUUID      []byte
		username      string
		email         sql.NullString
		phone         sql.NullString
		passwordHash  string
		userPrivilege int32
		userStatus    int32
		avatarPath    sql.NullString
		mfaEnabled    bool
		lastLoginAt   sql.NullTime
		lastLoginIP   sql.NullString
		lockedUntil   sql.NullTime
	)

	if err := row.Scan(
		&userID,
		&userUUID,
		&username,
		&email,
		&phone,
		&passwordHash,
		&userPrivilege,
		&userStatus,
		&avatarPath,
		&mfaEnabled,
		&lastLoginAt,
		&lastLoginIP,
		&lockedUntil,
	); err != nil {
		return UserRecord{}, err
	}

	record := UserRecord{
		UserID:        userID,
		UserUUID:      userUUID,
		Username:      username,
		PasswordHash:  passwordHash,
		UserPrivilege: userPrivilege,
		UserStatus:    userStatus,
		MFAEnabled:    mfaEnabled,
	}

	if email.Valid {
		record.Email = &email.String
	}
	if phone.Valid {
		record.Phone = &phone.String
	}
	if avatarPath.Valid {
		record.AvatarPath = &avatarPath.String
	}
	if lastLoginAt.Valid {
		record.LastLoginAt = &lastLoginAt.Time
	}
	if lastLoginIP.Valid {
		record.LastLoginIP = &lastLoginIP.String
	}
	if lockedUntil.Valid {
		record.LockedUntil = &lockedUntil.Time
	}

	return record, nil
}

func isNotFound(err error) bool {
	return errors.Is(err, sql.ErrNoRows)
}
