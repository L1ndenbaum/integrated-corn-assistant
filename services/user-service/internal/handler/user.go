package handler

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/L1ndenbaum/integrated-corn-assistant/common/jwtauth"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/user-service/internal/store"
)

type UserHandler struct {
	users store.UserStore
}

type userProfilePayload struct {
	UserUUID      string `json:"user_uuid"`
	Username      string `json:"username"`
	UserPrivilege int32  `json:"user_privilege"`
	UserStatus    int32  `json:"user_status"`
	MFAEnabled    bool   `json:"mfa_enabled"`
}

type userProfileResponse struct {
	User userProfilePayload `json:"user"`
}

func NewUser(users store.UserStore) *UserHandler {
	return &UserHandler{users: users}
}

func (h *UserHandler) Profile(c *gin.Context) {
	claims, ok := jwtauth.GetClaims(c)
	if !ok || claims.Subject == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	parsed, err := uuid.Parse(claims.Subject)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "令牌无效"})
		return
	}

	user, err := h.users.GetUserByUUID(c.Request.Context(), parsed[:])
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "用户查询失败"})
		return
	}

	if user.UserStatus != 1 {
		c.JSON(http.StatusForbidden, gin.H{"error": "用户状态异常"})
		return
	}

	c.JSON(http.StatusOK, userProfileResponse{
		User: userProfilePayload{
			UserUUID:      uuid.Must(uuid.FromBytes(user.UserUUID)).String(),
			Username:      user.Username,
			UserPrivilege: user.UserPrivilege,
			UserStatus:    user.UserStatus,
			MFAEnabled:    user.MFAEnabled,
		},
	})
}
