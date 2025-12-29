package handler

import (
	"database/sql"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/L1ndenbaum/integrated-corn-assistant/services/user-service/internal/crypto"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/user-service/internal/store"
)

type InternalHandler struct {
	users            store.UserStore
	lockoutThreshold int
	lockoutDuration  time.Duration
}

func NewInternal(users store.UserStore) *InternalHandler {
	return &InternalHandler{
		users:            users,
		lockoutThreshold: 5,
		lockoutDuration:  15 * time.Minute,
	}
}

type verifyUsernameRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type verifyEmailRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type verifyPhoneRequest struct {
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

type internalUserPayload struct {
	UserUUID      string `json:"user_uuid"`
	UserID        int64  `json:"user_id"`
	Username      string `json:"username"`
	UserPrivilege int32  `json:"user_privilege"`
	UserStatus    int32  `json:"user_status"`
	MFAEnabled    bool   `json:"mfa_enabled"`
}

type internalUserResponse struct {
	User internalUserPayload `json:"user"`
}

func (h *InternalHandler) VerifyUsername(c *gin.Context) {
	var req verifyUsernameRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Username == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户名和密码不能为空"})
		return
	}

	user, err := h.users.GetActiveUserByUsername(c.Request.Context(), req.Username)
	h.handleVerify(c, user, req.Password, err)
}

func (h *InternalHandler) VerifyEmail(c *gin.Context) {
	var req verifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Email == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "邮箱和密码不能为空"})
		return
	}

	user, err := h.users.GetActiveUserByEmail(c.Request.Context(), req.Email)
	h.handleVerify(c, user, req.Password, err)
}

func (h *InternalHandler) VerifyPhone(c *gin.Context) {
	var req verifyPhoneRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Phone == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "手机号和密码不能为空"})
		return
	}

	user, err := h.users.GetActiveUserByPhone(c.Request.Context(), req.Phone)
	h.handleVerify(c, user, req.Password, err)
}

func (h *InternalHandler) ProfileByUUID(c *gin.Context) {
	rawUUID := c.Param("user_uuid")
	if rawUUID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户标识不能为空"})
		return
	}

	parsed, err := uuid.Parse(rawUUID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户标识格式错误"})
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

	c.JSON(http.StatusOK, internalUserResponse{
		User: toInternalPayload(user),
	})
}

func (h *InternalHandler) handleVerify(c *gin.Context, user store.UserRecord, password string, err error) {
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "用户查询失败"})
		return
	}

	if user.LockedUntil != nil && user.LockedUntil.After(time.Now()) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "账号已被锁定"})
		return
	}

	if !crypto.ComparePasswordHash(user.PasswordHash, password) {
		if attempts, err := h.users.IncrementFailedLoginAttempts(c.Request.Context(), user.UserID); err == nil {
			if h.lockoutThreshold > 0 && attempts >= h.lockoutThreshold && user.LockedUntil == nil && user.UserStatus == 1 {
				lockedUntil := time.Now().Add(h.lockoutDuration)
				_ = h.users.SetLockedUntil(c.Request.Context(), user.UserID, lockedUntil)
			}
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	_ = h.users.UpdateLoginSuccess(c.Request.Context(), user.UserID, c.ClientIP())

	c.JSON(http.StatusOK, internalUserResponse{
		User: toInternalPayload(user),
	})
}

func toInternalPayload(user store.UserRecord) internalUserPayload {
	return internalUserPayload{
		UserUUID:      uuid.Must(uuid.FromBytes(user.UserUUID)).String(),
		UserID:        user.UserID,
		Username:      user.Username,
		UserPrivilege: user.UserPrivilege,
		UserStatus:    user.UserStatus,
		MFAEnabled:    user.MFAEnabled,
	}
}
