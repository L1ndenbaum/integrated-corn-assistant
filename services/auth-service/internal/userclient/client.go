package userclient

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

type Client struct {
	baseURL string
	client  *http.Client
}

type UserProfile struct {
	UserUUID      string `json:"user_uuid"`
	UserID        int64  `json:"user_id"`
	Username      string `json:"username"`
	UserPrivilege int32  `json:"user_privilege"`
	UserStatus    int32  `json:"user_status"`
	MFAEnabled    bool   `json:"mfa_enabled"`
}

type verifyResponse struct {
	User UserProfile `json:"user"`
}

type profileResponse struct {
	User UserProfile `json:"user"`
}

var ErrInvalidCredentials = errors.New("invalid credentials")
var ErrUserNotFound = errors.New("user not found")

func New(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *Client) VerifyUsername(ctx context.Context, username, password string) (UserProfile, error) {
	payload := map[string]string{
		"username": username,
		"password": password,
	}
	return c.postVerify(ctx, "/internal/user/verify/username", payload)
}

func (c *Client) VerifyEmail(ctx context.Context, email, password string) (UserProfile, error) {
	payload := map[string]string{
		"email":    email,
		"password": password,
	}
	return c.postVerify(ctx, "/internal/user/verify/email", payload)
}

func (c *Client) VerifyPhone(ctx context.Context, phone, password string) (UserProfile, error) {
	payload := map[string]string{
		"phone":    phone,
		"password": password,
	}
	return c.postVerify(ctx, "/internal/user/verify/phone", payload)
}

func (c *Client) GetUserProfileByUUID(ctx context.Context, userUUID string) (UserProfile, error) {
	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		fmt.Sprintf("%s/internal/user/profile/uuid/%s", c.baseURL, userUUID),
		nil,
	)
	if err != nil {
		return UserProfile{}, err
	}

	response, err := c.client.Do(request)
	if err != nil {
		return UserProfile{}, err
	}
	defer response.Body.Close()

	if response.StatusCode == http.StatusNotFound {
		return UserProfile{}, ErrUserNotFound
	}
	if response.StatusCode != http.StatusOK {
		return UserProfile{}, fmt.Errorf("user-service error: %s", response.Status)
	}

	var payload profileResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return UserProfile{}, err
	}
	return payload.User, nil
}

func (c *Client) postVerify(ctx context.Context, path string, payload map[string]string) (UserProfile, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return UserProfile{}, err
	}

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+path,
		bytes.NewReader(body),
	)
	if err != nil {
		return UserProfile{}, err
	}
	request.Header.Set("Content-Type", "application/json")

	response, err := c.client.Do(request)
	if err != nil {
		return UserProfile{}, err
	}
	defer response.Body.Close()

	switch response.StatusCode {
	case http.StatusOK:
		var payload verifyResponse
		if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
			return UserProfile{}, err
		}
		return payload.User, nil
	case http.StatusUnauthorized:
		return UserProfile{}, ErrInvalidCredentials
	case http.StatusNotFound:
		return UserProfile{}, ErrUserNotFound
	default:
		return UserProfile{}, fmt.Errorf("user-service error: %s", response.Status)
	}
}
