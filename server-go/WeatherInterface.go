package main

import (
	"encoding/json"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// 高德地图API密钥
var AMapKey string = os.Getenv("AMapKey")

// IP定位响应结构体
type IPLocationResponse struct {
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
type Cast struct {
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
type Forecast struct {
	City       string `json:"city"`
	Adcode     string `json:"adcode"`
	Province   string `json:"province"`
	ReportTime string `json:"reporttime"`
	Casts      []Cast `json:"casts"`
}

// 实况天气
type Live struct {
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
type WeatherResponse struct {
	Status    string     `json:"status"`
	Info      string     `json:"info"`
	Lives     []Live     `json:"lives"`     // 实况天气
	Forecasts []Forecast `json:"forecasts"` // 预报天气
}

// 获取IP定位信息
func GetIPLocation(c *gin.Context) {
	ip := c.ClientIP()
	url := "https://restapi.amap.com/v3/ip?key=" + AMapKey + "&ip=" + ip

	resp, err := http.Get(url)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取IP定位失败"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result IPLocationResponse
	json.Unmarshal(body, &result)

	if result.Status == "1" {
		c.JSON(http.StatusOK, gin.H{
			"status":    "success",
			"province":  result.Province,
			"city":      result.City,
			"adcode":    result.Adcode,
			"rectangle": result.Rectangle,
			"ip":        ip,
		})
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Info})
	}
}

func GetWeather(c *gin.Context) {
	cityAdcode := c.Query("city")                      // 城市编码
	extensions := c.DefaultQuery("extensions", "base") // 默认实时天气

	url := "https://restapi.amap.com/v3/weather/weatherInfo?key=" + AMapKey +
		"&city=" + cityAdcode + "&extensions=" + extensions

	resp, err := http.Get(url)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取天气失败"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result WeatherResponse
	_ = json.Unmarshal(body, &result)

	// 成功返回
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
				"forecast": result.Forecasts[0], // 返回第一个城市的预报
			})
			return
		}
	}

	// 失败
	c.JSON(http.StatusInternalServerError, gin.H{"error": result.Info})
}
