package main

import (
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/gin-gonic/gin"
)

func newReverseProxy(target string) (*httputil.ReverseProxy, error) {
	targetURL, err := url.Parse(target)
	if err != nil {
		return nil, err
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.Host = targetURL.Host
	}

	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		http.Error(w, "upstream service unavailable", http.StatusBadGateway)
	}

	return proxy, nil
}

func proxyHandler(proxy *httputil.ReverseProxy) gin.HandlerFunc {
	return func(c *gin.Context) {
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}
