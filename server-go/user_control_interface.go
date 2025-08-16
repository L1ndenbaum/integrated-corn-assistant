package main

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"server-env.com/server/models"
)

// RegisterUser 注册用户
func RegisterUser(ctx *gin.Context) {
	username := ctx.PostForm("username")
	password := ctx.PostForm("password")

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
	// 从路径参数获取用户名
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
		},
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
