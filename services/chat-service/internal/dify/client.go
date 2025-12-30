package dify

import (
	"errors"
	"time"

	"github.com/go-resty/resty/v2"
)

type Client struct {
	apiKey string
	resty  *resty.Client
}

func New(apiKey, baseURL, proxy string) (*Client, error) {
	if apiKey == "" {
		return nil, errors.New("dify api key is empty")
	}
	if baseURL == "" {
		return nil, errors.New("dify base url is empty")
	}

	client := resty.New().
		SetBaseURL(baseURL).
		SetTimeout(10 * time.Minute)

	if proxy != "" {
		client.SetProxy(proxy)
	}

	return &Client{
		apiKey: apiKey,
		resty:  client,
	}, nil
}

func (c *Client) NewRequest() *resty.Request {
	return c.resty.R().
		SetHeader("Authorization", "Bearer "+c.apiKey)
}

func (c *Client) Raw() *resty.Client {
	return c.resty
}
