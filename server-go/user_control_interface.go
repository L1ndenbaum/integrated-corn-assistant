package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"server-env.com/server/models"
)

// RegisterUser 注册用户
func RegisterUser(ctx *gin.Context) {
	username := ctx.PostForm("username")
	password := ctx.PostForm("password")
	// 获取头像文件
	file, _, err := ctx.Request.FormFile("avatar")

	if username == "" || password == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "用户名和密码为必填项"})
		return
	}

	var existingUser models.Users
	result := DB.Where("username = ?", username).First(&existingUser)
	if result.Error == nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "用户已存在"})
		return
	} else if result.Error != gorm.ErrRecordNotFound {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询出错"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
		return
	}

	// 创建新用户
	newUser := models.Users{
		Username: username,
		Password: string(hashedPassword),
		Avatar:   "", // 默认头像为空
	}

	// 如果有上传头像文件，则保存头像
	if file != nil {
		defer file.Close()

		// 生成头像文件名
		avatarFileName := fmt.Sprintf("%s_%d%s", username, time.Now().Unix(), ".jpg")
		avatarPath := filepath.Join("static", "avatars", avatarFileName)

		// 确保头像目录存在
		err = os.MkdirAll(filepath.Dir(avatarPath), 0755)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "头像目录创建失败"})
			return
		}

		// 保存头像文件
		dst, err := os.Create(avatarPath)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "头像保存失败"})
			return
		}
		defer dst.Close()

		// 复制文件内容
		_, err = io.Copy(dst, file)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "头像保存失败"})
			return
		}

		// 更新用户头像路径
		newUser.Avatar = avatarPath
	}

	// 保存到数据库
	result = DB.Create(&newUser)
	if result.Error != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "用户注册失败"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "用户注册成功！"})
}

// LoginUser 用户登录
func LoginUser(ctx *gin.Context) {
	// 解析JSON请求体
	var requestData struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := ctx.ShouldBindJSON(&requestData); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "请求数据格式错误"})
		return
	}

	// 检查用户名和密码是否为空
	if requestData.Username == "" || requestData.Password == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "未提供用户名和密码"})
		return
	}

	// 查询用户
	var user models.Users
	result := DB.Where("username = ?", requestData.Username).First(&user)
	if result.Error == gorm.ErrRecordNotFound {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "用户不存在"})
		return
	} else if result.Error != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询出错"})
		return
	}

	// 验证密码
	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(requestData.Password))
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "密码错误"})
		return
	}

	// 登录成功
	ctx.JSON(http.StatusOK, gin.H{"message": "登录成功"})
}

// GetUserInfo 获取用户信息
func GetUserInfo(ctx *gin.Context) {
	username := ctx.Param("username")

	// 查询用户
	var user models.Users
	result := DB.Where("username = ?", username).First(&user)
	if result.Error == gorm.ErrRecordNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	} else if result.Error != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询出错"})
		return
	}

	// 返回用户信息
	ctx.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取用户信息成功",
		"data": gin.H{
			"username": user.Username,
			"avatar":   user.Avatar,
		},
	})
}

// ChangePassword 修改用户密码
func ChangePassword(ctx *gin.Context) {
	// 解析JSON请求体
	var requestData struct {
		Username        string `json:"username"`
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}

	if err := ctx.ShouldBindJSON(&requestData); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "请求数据格式错误"})
		return
	}

	// 检查必要字段
	if requestData.Username == "" || requestData.CurrentPassword == "" || requestData.NewPassword == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "用户名、当前密码和新密码都为必填项"})
		return
	}

	// 验证新密码长度
	if len(requestData.NewPassword) < 6 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "新密码长度至少为6位"})
		return
	}

	// 查询用户
	var user models.Users
	result := DB.Where("username = ?", requestData.Username).First(&user)
	if result.Error == gorm.ErrRecordNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	} else if result.Error != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询出错"})
		return
	}

	// 验证当前密码
	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(requestData.CurrentPassword))
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "当前密码错误"})
		return
	}

	// 加密新密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(requestData.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
		return
	}

	// 更新密码
	user.Password = string(hashedPassword)
	result = DB.Save(&user)
	if result.Error != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "密码修改失败"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "密码修改成功"})
}

// UpdateUserAvatar 更新用户头像
func UpdateUserAvatar(ctx *gin.Context) {
	// 从表单数据获取用户名和头像文件
	username := ctx.PostForm("username")
	file, header, err := ctx.Request.FormFile("avatar")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "头像文件上传失败"})
		return
	}
	defer file.Close()

	// 验证文件类型
	if header.Header.Get("Content-Type") != "image/jpeg" && header.Header.Get("Content-Type") != "image/png" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "只允许上传JPEG或PNG格式的图片"})
		return
	}

	// 生成头像文件名
	avatarFileName := fmt.Sprintf("%s_%d%s", username, time.Now().Unix(), filepath.Ext(header.Filename))
	avatarPath := filepath.Join("static", "avatars", avatarFileName)

	// 确保头像目录存在
	err = os.MkdirAll(filepath.Dir(avatarPath), 0755)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "头像目录创建失败"})
		return
	}

	// 保存头像文件
	dst, err := os.Create(avatarPath)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "头像保存失败"})
		return
	}
	defer dst.Close()

	// 复制文件内容
	_, err = io.Copy(dst, file)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "头像保存失败"})
		return
	}

	// 更新数据库中的头像路径
	var user models.Users
	result := DB.Where("username = ?", username).First(&user)
	if result.Error != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	user.Avatar = avatarPath
	result = DB.Save(&user)
	if result.Error != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "头像更新失败"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message":   "头像更新成功",
		"avatarUrl": "/" + avatarPath,
	})
}

// ServeLogin 提供登录页面
func ServeLogin(ctx *gin.Context) {
	baseDir := filepath.Dir(os.Args[0])
	staticDir := filepath.Join(baseDir, "static", "out")
	filePath := filepath.Join(staticDir, "auth", "login.html")

	ctx.File(filePath)
}

// ServeLoginTxt 提供登录页面文本文件
func ServeLoginTxt(ctx *gin.Context) {
	baseDir := filepath.Dir(os.Args[0])
	staticDir := filepath.Join(baseDir, "static", "out")
	filePath := filepath.Join(staticDir, "auth", "login.txt")

	ctx.File(filePath)
}

// ServeRegister 提供注册页面
func ServeRegister(ctx *gin.Context) {
	baseDir := filepath.Dir(os.Args[0])
	staticDir := filepath.Join(baseDir, "static", "out")
	filePath := filepath.Join(staticDir, "auth", "register.html")

	ctx.File(filePath)
}

// ServeRegisterTxt 提供注册页面文本文件
func ServeRegisterTxt(ctx *gin.Context) {
	baseDir := filepath.Dir(os.Args[0])
	staticDir := filepath.Join(baseDir, "static", "out")
	filePath := filepath.Join(staticDir, "auth", "register.txt")

	ctx.File(filePath)
}

// ServeDashboardTxt 提供Dashboard页面文本文件
func ServeDashboardTxt(ctx *gin.Context) {
	baseDir := filepath.Dir(os.Args[0])
	staticDir := filepath.Join(baseDir, "static", "out")
	filePath := filepath.Join(staticDir, "dashboard.txt")

	ctx.File(filePath)
}
