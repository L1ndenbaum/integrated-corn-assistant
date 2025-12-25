package handler

import (
	"crypto/sha256"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/L1ndenbaum/integrated-corn-assistant/services/auth-service/internal/auth"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/auth-service/internal/config"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/auth-service/internal/store"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/auth-service/internal/userclient"
)

type Handler struct {
	tokens *auth.TokenManager
	store  store.RefreshTokenStore
	users  *userclient.Client
	cfg    config.Config
}

func New(tokens *auth.TokenManager, store store.RefreshTokenStore, users *userclient.Client, cfg config.Config) *Handler {
	return &Handler{
		tokens: tokens,
		store:  store,
		users:  users,
		cfg:    cfg,
	}
}

type loginUsernameRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginEmailRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginPhoneRequest struct {
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

type userPayload struct {
	UserUUID      string `json:"user_uuid"`
	Username      string `json:"username"`
	AvatarPath    string `json:"avatar_path"`
	UserPrivilege int32  `json:"user_privilege"`
}

type sessionResponse struct {
	User userPayload `json:"user"`
}

func (h *Handler) LoginUsername(c *gin.Context) {
	var req loginUsernameRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Username == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户名和密码不能为空"})
		return
	}

	user, err := h.users.VerifyUsername(c.Request.Context(), req.Username, req.Password)
	h.handleLoginResult(c, user, err)
}

func (h *Handler) LoginEmail(c *gin.Context) {
	var req loginEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Email == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "邮箱和密码不能为空"})
		return
	}

	user, err := h.users.VerifyEmail(c.Request.Context(), req.Email, req.Password)
	h.handleLoginResult(c, user, err)
}

func (h *Handler) LoginPhone(c *gin.Context) {
	var req loginPhoneRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Phone == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "手机号和密码不能为空"})
		return
	}

	user, err := h.users.VerifyPhone(c.Request.Context(), req.Phone, req.Password)
	h.handleLoginResult(c, user, err)
}

func (h *Handler) Session(c *gin.Context) {
	token := accessTokenFromRequest(c)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	claims, err := h.tokens.ParseAccessToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "令牌无效"})
		return
	}

	user, err := h.users.GetUserProfileByUUID(c.Request.Context(), claims.Subject)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户状态异常"})
		return
	}

	c.JSON(http.StatusOK, sessionResponse{
		User: toUserPayload(user),
	})
}

func (h *Handler) Refresh(c *gin.Context) {
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil || refreshToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "刷新令牌缺失"})
		return
	}

	refreshHash := authHash(refreshToken)
	record, err := h.store.GetActiveRefreshTokenByHash(c.Request.Context(), refreshHash)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "刷新令牌无效"})
		return
	}

	newRefresh, err := h.tokens.GenerateRefreshToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成刷新令牌失败"})
		return
	}

	userUUID := record.UserUUID.String()
	user, err := h.users.GetUserProfileByUUID(c.Request.Context(), userUUID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户状态异常"})
		return
	}

	accessToken, accessExpiry, err := h.tokens.GenerateAccessToken(toTokenPayload(user))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成访问令牌失败"})
		return
	}

	storeToken := store.RefreshToken{
		RefreshTokenID: newRefresh.TokenID,
		UserUUID:       record.UserUUID,
		TokenHash:      newRefresh.TokenHash,
		ExpiresAt:      newRefresh.ExpiresAt,
		CreatedIP:      stringPtr(c.ClientIP()),
		UserAgent:      stringPtr(c.GetHeader("User-Agent")),
	}

	if err := h.store.CreateRefreshToken(c.Request.Context(), storeToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存刷新令牌失败"})
		return
	}

	if err := h.store.RotateRefreshToken(c.Request.Context(), record.RefreshTokenID, newRefresh.TokenID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "刷新令牌轮换失败"})
		return
	}

	h.setTokenCookies(c, accessToken, accessExpiry, newRefresh.Token, newRefresh.ExpiresAt)
	c.JSON(http.StatusOK, sessionResponse{
		User: toUserPayload(user),
	})
}

func (h *Handler) Logout(c *gin.Context) {
	refreshToken, err := c.Cookie("refresh_token")
	if err == nil && refreshToken != "" {
		refreshHash := authHash(refreshToken)
		record, err := h.store.GetActiveRefreshTokenByHash(c.Request.Context(), refreshHash)
		if err == nil {
			_ = h.store.RevokeRefreshToken(c.Request.Context(), record.RefreshTokenID)
		}
	}

	h.clearTokenCookies(c)
	c.JSON(http.StatusOK, gin.H{"message": "已退出登录"})
}

func (h *Handler) handleLoginResult(c *gin.Context, user userclient.UserProfile, err error) {
	if err != nil {
		if errors.Is(err, userclient.ErrInvalidCredentials) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
			return
		}
		if errors.Is(err, userclient.ErrUserNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "用户不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "用户服务异常"})
		return
	}

	if user.UserStatus != 1 {
		c.JSON(http.StatusForbidden, gin.H{"error": "用户状态异常"})
		return
	}

	accessToken, accessExpiry, err := h.tokens.GenerateAccessToken(toTokenPayload(user))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成访问令牌失败"})
		return
	}

	refreshToken, err := h.tokens.GenerateRefreshToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成刷新令牌失败"})
		return
	}

	userUUID, err := uuid.Parse(user.UserUUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "用户标识异常"})
		return
	}

	storeToken := store.RefreshToken{
		RefreshTokenID: refreshToken.TokenID,
		UserUUID:       userUUID,
		TokenHash:      refreshToken.TokenHash,
		ExpiresAt:      refreshToken.ExpiresAt,
		CreatedIP:      stringPtr(c.ClientIP()),
		UserAgent:      stringPtr(c.GetHeader("User-Agent")),
	}

	if err := h.store.CreateRefreshToken(c.Request.Context(), storeToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存刷新令牌失败"})
		return
	}

	h.setTokenCookies(c, accessToken, accessExpiry, refreshToken.Token, refreshToken.ExpiresAt)
	c.JSON(http.StatusOK, sessionResponse{
		User: toUserPayload(user),
	})
}

func toUserPayload(user userclient.UserProfile) userPayload {
	return userPayload{
		UserUUID:      user.UserUUID,
		Username:      user.Username,
		AvatarPath:    user.AvatarPath,
		UserPrivilege: user.UserPrivilege,
	}
}

func toTokenPayload(user userclient.UserProfile) auth.UserTokenPayload {
	return auth.UserTokenPayload{
		UserUUID:   user.UserUUID,
		UserID:     user.UserID,
		Username:   user.Username,
		Privilege:  user.UserPrivilege,
		Status:     user.UserStatus,
		MFAEnabled: user.MFAEnabled,
	}
}

func accessTokenFromRequest(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
		return strings.TrimSpace(authHeader[7:])
	}

	token, err := c.Cookie("access_token")
	if err != nil {
		return ""
	}
	return token
}

func (h *Handler) setTokenCookies(c *gin.Context, accessToken string, accessExpiry time.Time, refreshToken string, refreshExpiry time.Time) {
	cookieSameSite := parseSameSite(h.cfg.CookieSameSite)
	accessMaxAge := int(time.Until(accessExpiry).Seconds())
	refreshMaxAge := int(time.Until(refreshExpiry).Seconds())

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		MaxAge:   accessMaxAge,
		Expires:  accessExpiry,
		HttpOnly: true,
		Secure:   h.cfg.CookieSecure,
		Domain:   h.cfg.CookieDomain,
		SameSite: cookieSameSite,
	})

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		MaxAge:   refreshMaxAge,
		Expires:  refreshExpiry,
		HttpOnly: true,
		Secure:   h.cfg.CookieSecure,
		Domain:   h.cfg.CookieDomain,
		SameSite: cookieSameSite,
	})
}

func (h *Handler) clearTokenCookies(c *gin.Context) {
	cookieSameSite := parseSameSite(h.cfg.CookieSameSite)

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.cfg.CookieSecure,
		Domain:   h.cfg.CookieDomain,
		SameSite: cookieSameSite,
	})

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.cfg.CookieSecure,
		Domain:   h.cfg.CookieDomain,
		SameSite: cookieSameSite,
	})
}

func parseSameSite(value string) http.SameSite {
	switch strings.ToLower(value) {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}

func authHash(token string) []byte {
	hash := sha256Sum(token)
	return hash[:]
}

func sha256Sum(token string) [32]byte {
	return sha256.Sum256([]byte(token))
}

func stringPtr(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
