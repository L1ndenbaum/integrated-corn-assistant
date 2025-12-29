package avatar

import (
	"os"
	"strings"
)

func GetAvatarURL(avatarKey string) string {
	key := strings.TrimSpace(avatarKey)
	if key == "" {
		return ""
	}

	base := strings.TrimRight(os.Getenv("AVATAR_PUBLIC_BASE_URL"), "/")
	if base == "" {
		return key
	}

	if strings.HasPrefix(key, "/") {
		return base + key
	}
	return base + "/" + key
}
