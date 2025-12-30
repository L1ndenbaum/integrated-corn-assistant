package handler

import (
	"database/sql"
	"errors"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-sql-driver/mysql"
	"github.com/google/uuid"

	"github.com/L1ndenbaum/integrated-corn-assistant/common/jwtauth"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/user-service/internal/avatar"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/user-service/internal/crypto"
	"github.com/L1ndenbaum/integrated-corn-assistant/services/user-service/internal/store"
)

type UserHandler struct {
	users     store.UserStore
	avatarDir string
}

type userProfilePayload struct {
	UserUUID      string `json:"user_uuid"`
	Username      string `json:"username"`
	UserPrivilege int32  `json:"user_privilege"`
	UserStatus    int32  `json:"user_status"`
	MFAEnabled    bool   `json:"mfa_enabled"`
	AvatarURL     string `json:"avatar_url"`
}

type userProfileResponse struct {
	User userProfilePayload `json:"user"`
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

type updateAvatarResponse struct {
	AvatarURL string `json:"avatar_url"`
}

func NewUser(users store.UserStore, avatarDir string) *UserHandler {
	return &UserHandler{
		users:     users,
		avatarDir: avatarDir,
	}
}

func (h *UserHandler) Profile(c *gin.Context) {
	claims, ok := jwtauth.GetClaims(c)
	if !ok || claims.Subject == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	parsed, err := parseUserUUID(claims.Subject)
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

	avatarURL := ""
	if user.AvatarPath != nil {
		avatarURL = avatar.GetAvatarURL(*user.AvatarPath)
	}

	c.JSON(http.StatusOK, userProfileResponse{
		User: userProfilePayload{
			UserUUID:      uuid.Must(uuid.FromBytes(user.UserUUID)).String(),
			Username:      user.Username,
			UserPrivilege: user.UserPrivilege,
			UserStatus:    user.UserStatus,
			MFAEnabled:    user.MFAEnabled,
			AvatarURL:     avatarURL,
		},
	})
}

func (h *UserHandler) Register(c *gin.Context) {
	username := strings.TrimSpace(c.PostForm("username"))
	password := c.PostForm("password")

	if username == "" || password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户名和密码不能为空"})
		return
	}

	if err := validateUsername(username); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := validatePassword(password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userUUID, err := uuid.NewV7()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成用户标识失败"})
		return
	}

	var avatarKey *string
	fileHeader, err := c.FormFile("avatar")
	if err == nil && fileHeader != nil {
		key, err := h.saveAvatarFile(c, fileHeader)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		avatarKey = &key
	} else if err != nil && !errors.Is(err, http.ErrMissingFile) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "读取头像失败"})
		return
	}

	passwordHash, err := crypto.HashPassword(password)
	if err != nil {
		h.cleanupAvatarFile(avatarKey)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
		return
	}

	params := store.CreateUserParams{
		UserUUID:      userUUID[:],
		Username:      username,
		Email:         nil,
		Phone:         nil,
		PasswordHash:  passwordHash,
		UserPrivilege: 0,
		UserBalance:   0,
		UserStatus:    1,
		AvatarPath:    avatarKey,
		MFAEnabled:    false,
	}

	if _, err := h.users.CreateUser(c.Request.Context(), params); err != nil {
		h.cleanupAvatarFile(avatarKey)
		if message, ok := describeDuplicate(err); ok {
			c.JSON(http.StatusConflict, gin.H{"error": message})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "用户注册失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "注册成功"})
}

func (h *UserHandler) ChangePassword(c *gin.Context) {
	claims, ok := jwtauth.GetClaims(c)
	if !ok || claims.Subject == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	var req changePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.CurrentPassword == "" || req.NewPassword == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "密码不能为空"})
		return
	}

	if err := validatePassword(req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parsed, err := parseUserUUID(claims.Subject)
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

	if !crypto.ComparePasswordHash(user.PasswordHash, req.CurrentPassword) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "当前密码不正确"})
		return
	}

	if crypto.ComparePasswordHash(user.PasswordHash, req.NewPassword) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "新密码不能与当前密码相同"})
		return
	}

	newHash, err := crypto.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
		return
	}

	if err := h.users.UpdatePasswordHash(c.Request.Context(), user.UserID, newHash); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "密码更新失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "密码修改成功"})
}

func (h *UserHandler) UpdateAvatar(c *gin.Context) {
	claims, ok := jwtauth.GetClaims(c)
	if !ok || claims.Subject == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	fileHeader, err := c.FormFile("avatar")
	if err != nil || fileHeader == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "头像文件不能为空"})
		return
	}

	parsed, err := parseUserUUID(claims.Subject)
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

	key, err := h.saveAvatarFile(c, fileHeader)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.users.UpdateAvatarPath(c.Request.Context(), user.UserID, &key); err != nil {
		h.cleanupAvatarFile(&key)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "头像更新失败"})
		return
	}

	if user.AvatarPath != nil {
		h.removeAvatarFile(*user.AvatarPath)
	}

	c.JSON(http.StatusOK, updateAvatarResponse{
		AvatarURL: avatar.GetAvatarURL(key),
	})
}

func parseUserUUID(raw string) (uuid.UUID, error) {
	return uuid.Parse(raw)
}

func validateUsername(username string) error {
	if len([]byte(username)) > 50 {
		return errors.New("用户名过长（最多50字节）")
	}
	if len([]rune(username)) < 2 {
		return errors.New("用户名至少需要2个字符")
	}
	return nil
}

func validatePassword(password string) error {
	if len(password) < 6 {
		return errors.New("密码长度至少为6位")
	}
	if len(password) > 20 {
		return errors.New("密码长度不能超过20位")
	}

	if !regexp.MustCompile(`[A-Z]`).MatchString(password) {
		return errors.New("密码必须包含至少一个大写字母")
	}
	if !regexp.MustCompile(`[a-z]`).MatchString(password) {
		return errors.New("密码必须包含至少一个小写字母")
	}
	if !regexp.MustCompile(`[0-9]`).MatchString(password) {
		return errors.New("密码必须包含至少一个数字")
	}
	if regexp.MustCompile(`[\u4e00-\u9fa5]`).MatchString(password) {
		return errors.New("密码不能包含中文字符")
	}
	return nil
}

func describeDuplicate(err error) (string, bool) {
	var mysqlErr *mysql.MySQLError
	if !errors.As(err, &mysqlErr) || mysqlErr.Number != 1062 {
		return "", false
	}

	switch {
	case strings.Contains(mysqlErr.Message, "uk_users_username"):
		return "用户名已存在", true
	case strings.Contains(mysqlErr.Message, "uk_users_email"):
		return "邮箱已存在", true
	case strings.Contains(mysqlErr.Message, "uk_users_phone"):
		return "手机号已存在", true
	default:
		return "用户已存在", true
	}
}

func (h *UserHandler) saveAvatarFile(c *gin.Context, fileHeader *multipart.FileHeader) (string, error) {
	if h.avatarDir == "" {
		return "", errors.New("未配置头像存储目录")
	}
	if fileHeader.Size == 0 {
		return "", errors.New("头像文件为空")
	}
	if fileHeader.Size > 5<<20 {
		return "", errors.New("头像文件过大")
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	switch ext {
	case ".jpg", ".jpeg", ".png", ".webp":
	default:
		return "", errors.New("头像格式不支持")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return "", errors.New("读取头像失败")
	}

	sniff := make([]byte, 512)
	n, _ := file.Read(sniff)
	_ = file.Close()
	contentType := http.DetectContentType(sniff[:n])
	if !strings.HasPrefix(contentType, "image/") {
		return "", errors.New("头像格式不支持")
	}

	if err := os.MkdirAll(h.avatarDir, 0o755); err != nil {
		return "", errors.New("创建头像目录失败")
	}

	avatarID, err := uuid.NewV7()
	if err != nil {
		return "", errors.New("生成头像标识失败")
	}

	filename := avatarID.String() + ext
	targetPath := filepath.Join(h.avatarDir, filename)
	if err := c.SaveUploadedFile(fileHeader, targetPath); err != nil {
		return "", errors.New("保存头像失败")
	}

	return "/avatar/" + filename, nil
}

func (h *UserHandler) cleanupAvatarFile(avatarKey *string) {
	if avatarKey == nil || *avatarKey == "" {
		return
	}
	h.removeAvatarFile(*avatarKey)
}

func (h *UserHandler) removeAvatarFile(avatarKey string) {
	if h.avatarDir == "" || !strings.HasPrefix(avatarKey, "/avatar/") {
		return
	}

	filename := strings.TrimPrefix(avatarKey, "/avatar/")
	filename = filepath.Base(filename)
	if filename == "" || filename == "." || filename == "/" {
		return
	}

	_ = os.Remove(filepath.Join(h.avatarDir, filename))
}
