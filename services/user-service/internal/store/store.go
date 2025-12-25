package store

import (
	"context"
	"time"
)

type UserRecord struct {
	UserID        int64
	UserUUID      []byte
	Username      string
	Email         *string
	Phone         *string
	PasswordHash  string
	UserPrivilege int32
	UserStatus    int32
	AvatarPath    *string
	MFAEnabled    bool
	LastLoginAt   *time.Time
	LastLoginIP   *string
	LockedUntil   *time.Time
}

type UserStore interface {
	GetActiveUserByUsername(ctx context.Context, username string) (UserRecord, error)
	GetActiveUserByEmail(ctx context.Context, email string) (UserRecord, error)
	GetActiveUserByPhone(ctx context.Context, phone string) (UserRecord, error)
	GetUserByUUID(ctx context.Context, uuidBytes []byte) (UserRecord, error)
	UpdateLoginSuccess(ctx context.Context, userID int64, ip string) error
	IncrementFailedLoginAttempts(ctx context.Context, userID int64) (int, error)
	SetLockedUntil(ctx context.Context, userID int64, lockedUntil time.Time) error
}
