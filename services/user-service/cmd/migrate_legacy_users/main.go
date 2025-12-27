package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"regexp"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
)

const (
	defaultLegacySchema = "crop_chat_db"
	defaultLegacyTable  = "users"
	defaultTargetSchema = "corn_assistant_user"
)

func main() {
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		log.Fatal("MYSQL_DSN is required")
	}

	legacySchema := getEnvOrDefault("LEGACY_SCHEMA", defaultLegacySchema)
	legacyTable := getEnvOrDefault("LEGACY_TABLE", defaultLegacyTable)
	targetSchema := getEnvOrDefault("TARGET_SCHEMA", defaultTargetSchema)
	legacyAvatarColumn := os.Getenv("LEGACY_AVATAR_COLUMN")

	if err := validateIdentifier("LEGACY_SCHEMA", legacySchema); err != nil {
		log.Fatal(err)
	}
	if err := validateIdentifier("LEGACY_TABLE", legacyTable); err != nil {
		log.Fatal(err)
	}
	if err := validateIdentifier("TARGET_SCHEMA", targetSchema); err != nil {
		log.Fatal(err)
	}

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("open mysql: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("ping mysql: %v", err)
	}

	avatarColumn, err := resolveLegacyAvatarColumn(ctx, db, legacySchema, legacyTable, legacyAvatarColumn)
	if err != nil {
		log.Fatalf("resolve avatar column: %v", err)
	}

	legacyQuery := fmt.Sprintf(
		"SELECT username, password, %s FROM `%s`.`%s`",
		avatarColumn,
		legacySchema,
		legacyTable,
	)

	rows, err := db.QueryContext(ctx, legacyQuery)
	if err != nil {
		log.Fatalf("query legacy users: %v", err)
	}
	defer rows.Close()

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		log.Fatalf("begin tx: %v", err)
	}

	insertSQL := fmt.Sprintf(
		"INSERT INTO `%s`.users "+
			"(user_uuid, username, email, phone, password_hash, user_privilege, user_balance, user_status, avatar_path, mfa_enabled, created_at, updated_at, deleted_at, last_login_at, last_login_ip, password_updated_at, failed_login_attempts, locked_until) "+
			"VALUES (?, ?, NULL, NULL, ?, 0, 0.00, 1, ?, 0, NOW(), NOW(), NULL, NULL, NULL, NOW(), 0, NULL)",
		targetSchema,
	)
	stmt, err := tx.PrepareContext(ctx, insertSQL)
	if err != nil {
		_ = tx.Rollback()
		log.Fatalf("prepare insert: %v", err)
	}
	defer stmt.Close()

	count := 0
	for rows.Next() {
		var username string
		var passwordHash string
		var avatar sql.NullString

		if err := rows.Scan(&username, &passwordHash, &avatar); err != nil {
			_ = tx.Rollback()
			log.Fatalf("scan legacy row: %v", err)
		}

		newUUID, err := uuid.NewV7()
		if err != nil {
			_ = tx.Rollback()
			log.Fatalf("uuidv7: %v", err)
		}

		var avatarValue interface{}
		if avatar.Valid {
			avatarValue = avatar.String
		} else {
			avatarValue = nil
		}

		if _, err := stmt.ExecContext(ctx, newUUID[:], username, passwordHash, avatarValue); err != nil {
			_ = tx.Rollback()
			log.Fatalf("insert user %s: %v", username, err)
		}
		count++
	}
	if err := rows.Err(); err != nil {
		_ = tx.Rollback()
		log.Fatalf("rows error: %v", err)
	}

	if err := tx.Commit(); err != nil {
		log.Fatalf("commit: %v", err)
	}

	log.Printf("migrated %d users", count)
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func validateIdentifier(label, value string) error {
	ok, err := regexp.MatchString(`^[A-Za-z0-9_]+$`, value)
	if err != nil {
		return fmt.Errorf("validate %s: %w", label, err)
	}
	if !ok {
		return fmt.Errorf("%s contains invalid characters: %s", label, value)
	}
	return nil
}

func resolveLegacyAvatarColumn(ctx context.Context, db *sql.DB, schema, table, forced string) (string, error) {
	if forced != "" {
		if err := validateIdentifier("LEGACY_AVATAR_COLUMN", forced); err != nil {
			return "", err
		}
		return forced, nil
	}

	rows, err := db.QueryContext(ctx,
		`SELECT COLUMN_NAME
		 FROM INFORMATION_SCHEMA.COLUMNS
		 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
		schema,
		table,
	)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	columns := map[string]bool{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return "", err
		}
		columns[name] = true
	}
	if err := rows.Err(); err != nil {
		return "", err
	}

	if columns["avatar_path"] {
		return "avatar_path", nil
	}
	if columns["avatar"] {
		return "avatar", nil
	}

	return "", errors.New("legacy avatar column not found (expected avatar_path or avatar)")
}
