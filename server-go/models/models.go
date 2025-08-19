package models

import (
	"gorm.io/gorm"
)

// Users 用户模型
type Users struct {
	Username string `gorm:"primaryKey;type:varchar(50);index" json:"username"`
	Password string `gorm:"type:varchar(255);not null" json:"password"`
	Avatar   string `gorm:"type:varchar(255)" json:"avatar"`
}

// TableName 指定表名
func (Users) TableName() string {
	return "users"
}

// BeforeCreate 在创建用户前执行的Hook
func (u *Users) BeforeCreate(tx *gorm.DB) error {
	return nil
}
