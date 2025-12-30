package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	apiKey string
	client *http.Client
}

func New(apiKey string) *Handler {
	return &Handler{
		apiKey: apiKey,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// IP定位响应结构体
type ipLocationResponse struct {
	Status    string `json:"status"`
	Info      string `json:"info"`
	InfoCode  string `json:"infocode"`
	Province  string `json:"province"`
	City      string `json:"city"`
	Adcode    string `json:"adcode"`
	Rectangle string `json:"rectangle"`
	IP        string `json:"ip"`
}

// 预报单天
type cast struct {
	Date         string `json:"date"`
	Week         string `json:"week"`
	DayWeather   string `json:"dayweather"`
	NightWeather string `json:"nightweather"`
	DayTemp      string `json:"daytemp"`
	NightTemp    string `json:"nighttemp"`
	DayWind      string `json:"daywind"`
	NightWind    string `json:"nightwind"`
	DayPower     string `json:"daypower"`
	NightPower   string `json:"nightpower"`
}

// 预报天气
type forecast struct {
	City       string `json:"city"`
	Adcode     string `json:"adcode"`
	Province   string `json:"province"`
	ReportTime string `json:"reporttime"`
	Casts      []cast `json:"casts"`
}

// 实况天气
type live struct {
	Province      string `json:"province"`
	City          string `json:"city"`
	Adcode        string `json:"adcode"`
	Weather       string `json:"weather"`
	Temperature   string `json:"temperature"`
	WindDirection string `json:"winddirection"`
	WindPower     string `json:"windpower"`
	Humidity      string `json:"humidity"`
	ReportTime    string `json:"reporttime"`
}

// 高德统一响应
type weatherResponse struct {
	Status    string     `json:"status"`
	Info      string     `json:"info"`
	Lives     []live     `json:"lives"`
	Forecasts []forecast `json:"forecasts"`
}

// GetIPLocation 获取IP定位信息
func (h *Handler) GetIPLocation(c *gin.Context) {
	ip := c.ClientIP()
	url := "https://restapi.amap.com/v3/ip?key=" + h.apiKey + "&ip=" + ip

	resp, err := h.client.Get(url)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取IP定位失败"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result ipLocationResponse
	_ = json.Unmarshal(body, &result)

	if result.Status == "1" {
		c.JSON(http.StatusOK, gin.H{
			"status":    "success",
			"province":  result.Province,
			"city":      result.City,
			"adcode":    result.Adcode,
			"rectangle": result.Rectangle,
			"ip":        ip,
		})
		return
	}

	c.JSON(http.StatusInternalServerError, gin.H{"error": result.Info})
}

// GetWeather 获取天气
func (h *Handler) GetWeather(c *gin.Context) {
	cityAdcode := c.Query("city")
	extensions := c.DefaultQuery("extensions", "base")

	url := "https://restapi.amap.com/v3/weather/weatherInfo?key=" + h.apiKey +
		"&city=" + cityAdcode + "&extensions=" + extensions

	resp, err := h.client.Get(url)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取天气失败"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result weatherResponse
	_ = json.Unmarshal(body, &result)

	if result.Status == "1" {
		if extensions == "base" && len(result.Lives) > 0 {
			live := result.Lives[0]
			c.JSON(http.StatusOK, gin.H{
				"status":      "success",
				"type":        "live",
				"province":    live.Province,
				"city":        live.City,
				"weather":     live.Weather,
				"temperature": live.Temperature,
				"wind":        live.WindDirection + " 风力" + live.WindPower + "级",
				"humidity":    live.Humidity,
				"report_time": live.ReportTime,
			})
			return
		}

		if extensions == "all" && len(result.Forecasts) > 0 {
			c.JSON(http.StatusOK, gin.H{
				"status":   "success",
				"type":     "forecast",
				"forecast": result.Forecasts[0],
			})
			return
		}
	}

	c.JSON(http.StatusInternalServerError, gin.H{"error": result.Info})
}
