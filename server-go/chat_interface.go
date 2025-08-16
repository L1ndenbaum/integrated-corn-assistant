package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-resty/resty/v2"
)

var (
	DIFY_API_KEY  = os.Getenv("DIFY_API_KEY")
	DIFY_BASE_URL = getEnvOrDefault("DIFY_BASE_URL", "https://api.dify.ai/v1")
	ALL_PROXY     = os.Getenv("ALL_PROXY")
	USE_PROXY     = ALL_PROXY != ""
	PAGE_LIMIT    = 20
	difyClient    = resty.New()
)

func init() {
	// 配置Dify客户端
	difyClient.SetBaseURL(DIFY_BASE_URL)

	// 配置代理
	if USE_PROXY && ALL_PROXY != "" {
		difyClient.SetProxy(ALL_PROXY)
	}

	// 设置超时时间
	difyClient.SetTimeout(10 * time.Minute)
}

// getEnvOrDefault 获取环境变量，如果不存在则返回默认值
func getEnvOrDefault(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// ChatRequest 是前端发来的请求调用聊天接口的结构体
type ChatRequest struct {
	Message        string   `json:"message"`
	Username       string   `json:"username"`
	ConversationID string   `json:"conversation_id"`
	FileIDs        []string `json:"file_ids"`
}

// ChatMessageRequest 是向Dify发送的聊天消息请求结构体
type ChatMessageRequest struct {
	Query          string                 `json:"query"`
	User           string                 `json:"user"`
	Inputs         map[string]interface{} `json:"inputs"`
	Files          []map[string]string    `json:"files"`
	ConversationID string                 `json:"conversation_id"`
	Stream         string                 `json:"response_mode"`
}

// ChatMessageResponseChunk 是转发给前端的SSE Message
type ChatMessageResponseChunk struct {
	Event  string  `json:"event"`
	Answer *string `json:"answer"`
}

// 聊天接口
func Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求数据格式错误"})
		return
	}
	if req.Message == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "消息内容不能为空"})
		return
	}
	files := make([]map[string]string, len(req.FileIDs))
	for i, fileID := range req.FileIDs {
		files[i] = map[string]string{
			"type":            "image",
			"transfer_method": "local_file",
			"upload_file_id":  fileID,
		}
	}

	// 构建Dify请求
	chatReq := ChatMessageRequest{
		Query:          req.Message,
		User:           req.Username,
		Inputs:         make(map[string]interface{}),
		Files:          files,
		ConversationID: req.ConversationID,
		Stream:         "streaming",
	}
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Transfer-Encoding", "chunked")
	c.Writer.Flush()
	resp, err := difyClient.R().
		SetHeader("Authorization", "Bearer "+DIFY_API_KEY).
		SetHeader("Content-Type", "application/json").
		SetBody(chatReq).
		SetDoNotParseResponse(true).
		Post("/chat-messages")
	if err != nil {
		c.String(http.StatusOK, "data: [ERROR] AI服务异常: %v\n\n", err)
		c.Writer.Flush()
		return
	}
	if resp.IsError() {
		c.String(http.StatusOK, "data: [ERROR] AI服务异常: %s\n\n", resp.Status())
		c.Writer.Flush()
		return
	}

	// 转发消息流给前端
	reader := bufio.NewReader(resp.RawResponse.Body)
	var messageID string
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Read error:%v", err)})
			break
		}

		line = strings.TrimSpace(line)
		if line == "" || !strings.HasPrefix(line, "data:") {
			continue
		}
		// 移除SSE Message的 "data:" 并解析对应的JSON转发
		jsonStr := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		var payload map[string]interface{}
		if err := json.Unmarshal([]byte(jsonStr), &payload); err != nil {
			fmt.Println("JSON parse error:", err)
			continue
		}
		switch event := payload["event"].(string); event {
		case "message":
			answer := payload["answer"].(string)
			messageID = payload["message_id"].(string)
			fmt.Fprintf(c.Writer, "%s", answer)
			c.Writer.Flush()
		case "message_end":
			fmt.Fprintf(c.Writer, "[MESSAGE_ID:%s]", messageID)
			c.Writer.Flush()
		}
	}
}

// 获取下一个问题建议接口
func GetNextProblemSuggestion(c *gin.Context) {
	messageID := c.Param("message_id")
	username := c.Query("username")

	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户名不能为空"})
		return
	}

	// 发送请求到Dify API
	resp, err := difyClient.R().
		SetHeader("Authorization", "Bearer "+DIFY_API_KEY).
		SetHeader("Content-Type", "application/json").
		SetQueryParam("user", username).
		Get(fmt.Sprintf("/messages/%s/suggested", messageID))

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.IsError() {
		c.JSON(http.StatusInternalServerError, gin.H{"error": resp.Status()})
		return
	}

	// 解析响应
	var result map[string]interface{}
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 返回数据字段
	data, ok := result["data"]
	if !ok {
		c.JSON(http.StatusOK, gin.H{"data": []interface{}{}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": data})
}

// 获取用户会话列表接口
func ListConversations(c *gin.Context) {
	username := c.Param("username")

	// 发送请求到Dify API
	resp, err := difyClient.R().
		SetHeader("Authorization", "Bearer "+DIFY_API_KEY).
		SetHeader("Content-Type", "application/json").
		SetQueryParam("user", username).
		SetQueryParam("limit", "20").
		Get("/conversations")

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.IsError() {
		c.JSON(http.StatusInternalServerError, gin.H{"error": resp.Status()})
		return
	}

	// 解析响应
	var result map[string]interface{}
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 获取数据字段
	data, ok := result["data"]
	if !ok {
		c.JSON(http.StatusOK, gin.H{"conversations": []interface{}{}})
		return
	}

	// 转换为前端需要的格式
	conversations, ok := data.([]interface{})
	if !ok {
		c.JSON(http.StatusOK, gin.H{"conversations": []interface{}{}})
		return
	}

	// 按创建时间倒序排序
	sort.Slice(conversations, func(i, j int) bool {
		convI, okI := conversations[i].(map[string]interface{})
		convJ, okJ := conversations[j].(map[string]interface{})

		if !okI || !okJ {
			return false
		}

		createdAtI, okI := convI["created_at"].(string)
		createdAtJ, okJ := convJ["created_at"].(string)

		if !okI || !okJ {
			return false
		}

		return createdAtI > createdAtJ
	})

	c.JSON(http.StatusOK, gin.H{"conversations": conversations})
}

// 获取聊天历史接口
func GetChatHistory(c *gin.Context) {
	conversationID := c.Param("conversation_id")
	username := c.Query("username")

	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户名不能为空"})
		return
	}

	// 获取所有消息
	allMessages := []map[string]interface{}{}
	firstID := ""

	for {
		// 构建请求参数
		params := map[string]string{
			"conversation_id": conversationID,
			"user":            username,
			"limit":           fmt.Sprintf("%d", PAGE_LIMIT),
		}

		if firstID != "" {
			params["first_id"] = firstID
		}

		// 发送请求到Dify API
		resp, err := difyClient.R().
			SetHeader("Authorization", "Bearer "+DIFY_API_KEY).
			SetHeader("Content-Type", "application/json").
			SetQueryParams(params).
			Get("/messages")

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if resp.IsError() {
			c.JSON(http.StatusInternalServerError, gin.H{"error": resp.Status()})
			return
		}

		// 解析响应
		var result map[string]interface{}
		if err := json.Unmarshal(resp.Body(), &result); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 获取数据字段
		data, ok := result["data"]
		if !ok {
			break
		}

		// 转换为消息切片
		messages, ok := data.([]interface{})
		if !ok {
			break
		}

		// 转换为map格式并添加到结果中
		for _, msg := range messages {
			if msgMap, ok := msg.(map[string]interface{}); ok {
				allMessages = append([]map[string]interface{}{msgMap}, allMessages...)
			}
		}

		// 检查是否还有更多消息
		hasMore, hasMoreOk := result["has_more"].(bool)
		if !hasMoreOk || !hasMore || len(messages) == 0 {
			break
		}

		// 设置下一次请求的first_id
		if len(messages) > 0 {
			if firstMsg, ok := messages[0].(map[string]interface{}); ok {
				if id, idOk := firstMsg["id"].(string); idOk {
					firstID = id
				}
			}
		}
	}

	// 转换为前端需要的格式
	history := make([]map[string]interface{}, len(allMessages))
	for i, msg := range allMessages {
		history[i] = map[string]interface{}{
			"query":         msg["query"],
			"answer":        msg["answer"],
			"message_files": msg["message_files"],
			"created_at":    msg["created_at"],
		}
	}

	c.JSON(http.StatusOK, history)
}

// 删除会话接口
func DeleteConversation(c *gin.Context) {
	conversationID := c.Param("conversation_id")
	username := c.Query("username")

	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户名不能为空"})
		return
	}

	// 发送删除请求到Dify API
	resp, err := difyClient.R().
		SetHeader("Authorization", "Bearer "+DIFY_API_KEY).
		SetHeader("Content-Type", "application/json").
		SetBody(map[string]string{"user": username}).
		Delete(fmt.Sprintf("/conversations/%s", conversationID))

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 检查响应状态
	if resp.StatusCode() == 204 {
		c.JSON(http.StatusOK, gin.H{
			"message":         "对话已删除",
			"conversation_id": conversationID,
		})
	} else {
		c.JSON(http.StatusNotFound, gin.H{"error": "对话不存在"})
	}
}

// 文件上传接口
func UploadFiles(ctx *gin.Context) {
	form, err := ctx.MultipartForm()
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "文件上传失败"})
		return
	}

	files := form.File["files"]
	username := ctx.PostForm("username")
	if username == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "用户名不能为空"})
		return
	}

	fileIDs := []string{}
	// 上传每个文件到Dify API
	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("无法打开文件: %v", err)})
			return
		}
		fileContent, err := io.ReadAll(file)
		file.Close()
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("无法读取文件: %v", err)})
			return
		}

		var buf bytes.Buffer
		writer := multipart.NewWriter(&buf)
		fileField, err := writer.CreateFormFile("file", fileHeader.Filename)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("创建表单文件字段失败: %v", err)})
			return
		}

		_, err = fileField.Write(fileContent)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("写入文件内容失败: %v", err)})
			return
		}

		err = writer.WriteField("user", username)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("写入用户字段失败: %v", err)})
			return
		}

		err = writer.Close()
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("关闭表单写入器失败: %v", err)})
			return
		}

		// 发送请求到Dify API
		resp, err := difyClient.R().
			SetHeader("Authorization", "Bearer "+DIFY_API_KEY).
			SetHeader("Content-Type", writer.FormDataContentType()).
			SetBody(buf.Bytes()).
			Post("/files/upload")

		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("文件上传失败: %v", err)})
			return
		}
		if resp.IsError() {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("文件上传失败: %s", resp.Status())})
			return
		}

		// 解析响应
		var uploadResp map[string]interface{}
		if err := json.Unmarshal(resp.Body(), &uploadResp); err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("响应解析失败: %v", err)})
			return
		}

		// 获取文件ID
		if id, ok := uploadResp["id"].(string); ok {
			fileIDs = append(fileIDs, id)
		}
	}

	ctx.JSON(http.StatusOK, gin.H{"file_ids": fileIDs})
}
