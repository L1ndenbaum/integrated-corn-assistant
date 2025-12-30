package proxy

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"
)

type Proxy struct {
	Reverse *httputil.ReverseProxy
	Target  *url.URL
}

func New(target string) (*Proxy, error) {
	if target == "" {
		return nil, errors.New("proxy target is empty")
	}

	parsed, err := url.Parse(target)
	if err != nil {
		return nil, err
	}

	reverse := httputil.NewSingleHostReverseProxy(parsed)
	originalDirector := reverse.Director
	reverse.Director = func(req *http.Request) {
		originalDirector(req)
		req.Host = parsed.Host
	}
	reverse.FlushInterval = 100 * time.Millisecond

	reverse.ErrorHandler = func(w http.ResponseWriter, _ *http.Request, _ error) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "upstream unavailable",
		})
	}

	return &Proxy{
		Reverse: reverse,
		Target:  parsed,
	}, nil
}
