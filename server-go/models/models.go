package models

import (
	"gorm.io/gorm"
)

// Users 用户模型
type Users struct {
	Username string `gorm:"primaryKey;type:varchar(50);index" json:"username"`
	Password string `gorm:"type:varchar(255);not null" json:"password"`
}

// TableName 指定表名
func (Users) TableName() string {
	return "users"
}

// BeforeCreate 在创建用户前执行的钩子函数
func (u *Users) BeforeCreate(tx *gorm.DB) error {
	// 可以在这里添加创建前的逻辑，比如密码加密等
	return nil
}
