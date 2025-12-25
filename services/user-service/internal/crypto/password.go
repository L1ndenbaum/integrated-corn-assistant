package crypto

import "golang.org/x/crypto/bcrypt"

func ComparePasswordHash(hashedPassword, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password)) == nil
}
