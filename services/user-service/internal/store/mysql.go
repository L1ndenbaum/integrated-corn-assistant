package store

import (
	"context"
	"database/sql"
	"strconv"
	"time"

	userdb "github.com/L1ndenbaum/integrated-corn-assistant/services/user-service/internal/db"
)

const defaultAvatarKey = "/avatar/placeholder-user.jpg"

type MySQLStore struct {
	queries *userdb.Queries
}

func NewMySQLStore(db *sql.DB) *MySQLStore {
	return &MySQLStore{queries: userdb.New(db)}
}

func (s *MySQLStore) GetActiveUserByUsername(ctx context.Context, username string) (UserRecord, error) {
	user, err := s.queries.GetActiveUserByUsername(ctx, username)
	if err != nil {
		return UserRecord{}, err
	}
	return toUserRecord(user), nil
}

func (s *MySQLStore) GetUserByUsername(ctx context.Context, username string) (UserRecord, error) {
	user, err := s.queries.GetUserByUsername(ctx, username)
	if err != nil {
		return UserRecord{}, err
	}
	return toUserRecord(user), nil
}

func (s *MySQLStore) GetActiveUserByEmail(ctx context.Context, email string) (UserRecord, error) {
	user, err := s.queries.GetActiveUserByEmail(ctx, toNullString(email))
	if err != nil {
		return UserRecord{}, err
	}
	return toUserRecord(user), nil
}

func (s *MySQLStore) GetActiveUserByPhone(ctx context.Context, phone string) (UserRecord, error) {
	user, err := s.queries.GetActiveUserByPhone(ctx, toNullString(phone))
	if err != nil {
		return UserRecord{}, err
	}
	return toUserRecord(user), nil
}

func (s *MySQLStore) GetUserByUUID(ctx context.Context, uuidBytes []byte) (UserRecord, error) {
	user, err := s.queries.GetUserByUUID(ctx, uuidBytes)
	if err != nil {
		return UserRecord{}, err
	}
	return toUserRecord(user), nil
}

func (s *MySQLStore) CreateUser(ctx context.Context, params CreateUserParams) (int64, error) {
	avatarPath := normalizeAvatarPath(params.AvatarPath)
	result, err := s.queries.CreateUser(ctx, userdb.CreateUserParams{
		UserUuid:      params.UserUUID,
		Username:      params.Username,
		Email:         toNullStringPtr(params.Email),
		Phone:         toNullStringPtr(params.Phone),
		PasswordHash:  params.PasswordHash,
		UserPrivilege: int8(params.UserPrivilege),
		UserBalance:   strconv.FormatFloat(params.UserBalance, 'f', 2, 64),
		UserStatus:    int8(params.UserStatus),
		AvatarPath:    avatarPath,
		MfaEnabled:    boolToTinyInt(params.MFAEnabled),
	})
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (s *MySQLStore) UpdatePasswordHash(ctx context.Context, userID int64, passwordHash string) error {
	return s.queries.UpdatePasswordHash(ctx, userdb.UpdatePasswordHashParams{
		PasswordHash: passwordHash,
		UserID:       int32(userID),
	})
}

func (s *MySQLStore) UpdateAvatarPath(ctx context.Context, userID int64, avatarPath *string) error {
	return s.queries.UpdateAvatarPath(ctx, userdb.UpdateAvatarPathParams{
		AvatarPath: normalizeAvatarPath(avatarPath),
		UserID:     int32(userID),
	})
}

func (s *MySQLStore) UpdateLoginSuccess(ctx context.Context, userID int64, ip string) error {
	return s.queries.UpdateLoginSuccess(ctx, userdb.UpdateLoginSuccessParams{
		LastLoginIp: toNullString(ip),
		UserID:      int32(userID),
	})
}

func (s *MySQLStore) IncrementFailedLoginAttempts(ctx context.Context, userID int64) (int, error) {
	if err := s.queries.IncrementFailedLoginAttempts(ctx, int32(userID)); err != nil {
		return 0, err
	}
	user, err := s.queries.GetUserByID(ctx, int32(userID))
	if err != nil {
		return 0, err
	}
	return int(user.FailedLoginAttempts), nil
}

func (s *MySQLStore) SetLockedUntil(ctx context.Context, userID int64, lockedUntil time.Time) error {
	return s.queries.SetLockedUntil(ctx, userdb.SetLockedUntilParams{
		LockedUntil: sql.NullTime{Time: lockedUntil, Valid: true},
		UserID:      int32(userID),
	})
}

func toUserRecord(user userdb.User) UserRecord {
	record := UserRecord{
		UserID:        int64(user.UserID),
		UserUUID:      user.UserUuid,
		Username:      user.Username,
		PasswordHash:  user.PasswordHash,
		UserPrivilege: int32(user.UserPrivilege),
		UserStatus:    int32(user.UserStatus),
		MFAEnabled:    user.MfaEnabled != 0,
	}

	if user.Email.Valid {
		record.Email = &user.Email.String
	}
	if user.Phone.Valid {
		record.Phone = &user.Phone.String
	}
	if user.AvatarPath != "" {
		record.AvatarPath = &user.AvatarPath
	}
	if user.LastLoginAt.Valid {
		record.LastLoginAt = &user.LastLoginAt.Time
	}
	if user.LastLoginIp.Valid {
		record.LastLoginIP = &user.LastLoginIp.String
	}
	if user.LockedUntil.Valid {
		record.LockedUntil = &user.LockedUntil.Time
	}

	return record
}

func toNullString(value string) sql.NullString {
	if value == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: value, Valid: true}
}

func toNullStringPtr(value *string) sql.NullString {
	if value == nil || *value == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: *value, Valid: true}
}

func boolToTinyInt(value bool) int8 {
	if value {
		return 1
	}
	return 0
}

func normalizeAvatarPath(avatarPath *string) string {
	if avatarPath == nil || *avatarPath == "" {
		return defaultAvatarKey
	}
	return *avatarPath
}
