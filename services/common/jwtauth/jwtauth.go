package jwtauth

import (
	"errors"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID     int64  `json:"uid"`
	Username   string `json:"username"`
	Privilege  int32  `json:"privilege"`
	Status     int32  `json:"status"`
	MFAEnabled bool   `json:"mfa"`
	jwt.RegisteredClaims
}

type Verifier struct {
	secret []byte
	issuer string
}

type contextKey string

const claimsContextKey contextKey = "jwt_claims"

func NewVerifier(secret, issuer string) (*Verifier, error) {
	if secret == "" {
		return nil, errors.New("jwt secret cannot be empty")
	}
	if issuer == "" {
		return nil, errors.New("jwt issuer cannot be empty")
	}
	return &Verifier{
		secret: []byte(secret),
		issuer: issuer,
	}, nil
}

func (v *Verifier) Parse(token string) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return v.secret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid token")
	}
	if claims.Issuer != v.issuer {
		return nil, errors.New("invalid issuer")
	}
	return claims, nil
}

func Middleware(verifier *Verifier) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := tokenFromRequest(c)
		if token == "" {
			c.AbortWithStatusJSON(401, gin.H{"error": "未登录"})
			return
		}

		claims, err := verifier.Parse(token)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "令牌无效"})
			return
		}

		c.Set(string(claimsContextKey), claims)
		c.Next()
	}
}

func GetClaims(c *gin.Context) (*Claims, bool) {
	value, ok := c.Get(string(claimsContextKey))
	if !ok {
		return nil, false
	}
	claims, ok := value.(*Claims)
	return claims, ok
}

func tokenFromRequest(c *gin.Context) string {
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
