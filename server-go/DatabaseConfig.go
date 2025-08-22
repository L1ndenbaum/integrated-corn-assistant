package main

import (
	"fmt"
	"os"
	"time"

	"server-env.com/server/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

// 数据库配置结构体
type DatabaseConfig struct {
	DBName   string
	DBAddr   string
	Username string
	Password string
}

// 获取数据库配置
func GetDatabaseConfig() (*DatabaseConfig, error) {
	config := &DatabaseConfig{
		DBName:   "crop_chat_db",
		DBAddr:   "localhost:3306",
		Username: "root",
		Password: os.Getenv("MySQLPassword"),
	}

	// 检查配置是否完整
	if config.DBName == "" || config.DBAddr == "" || config.Username == "" || config.Password == "" {
		return nil, fmt.Errorf("DB_NAME, DB_ADDR, DB_USERNAME, DB_PASSWORD 必须不为空")
	}

	return config, nil
}

// 初始化数据库连接
func InitDatabase() error {
	config, err := GetDatabaseConfig()
	if err != nil {
		return err
	}

	// 构建DSN
	dsn := fmt.Sprintf("%s:%s@tcp(%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		config.Username, config.Password, config.DBAddr, config.DBName)

	// 连接数据库
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		NowFunc: func() time.Time {
			return time.Now().Local()
		},
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// 配置连接池
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	// 设置连接池参数
	sqlDB.SetMaxIdleConns(10)           // 空闲连接数
	sqlDB.SetMaxOpenConns(100)          // 最大连接数
	sqlDB.SetConnMaxLifetime(time.Hour) // 连接最大生命周期

	// 自动迁移模型
	err = db.AutoMigrate(&models.Users{})
	if err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	DB = db
	return nil
}

// 获取数据库连接实例
func GetDB() *gorm.DB {
	return DB
}
