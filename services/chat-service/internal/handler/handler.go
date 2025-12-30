package handler

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/L1ndenbaum/integrated-corn-assistant/services/chat-service/internal/dify"
)

type Handler struct {
	dify      *dify.Client
	pageLimit int
}

func New(difyClient *dify.Client, pageLimit int) *Handler {
	return &Handler{
		dify:      difyClient,
		pageLimit: pageLimit,
	}
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

// Chat 聊天接口
func (h *Handler) Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求数据格式错误"})
		return
	}
	if strings.TrimSpace(req.Message) == "" {
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

	resp, err := h.dify.NewRequest().
		SetHeader("Content-Type", "application/json").
		SetBody(chatReq).
		SetDoNotParseResponse(true).
		Post("/chat-messages")
	if err != nil {
		fmt.Fprintf(c.Writer, "[ERROR] AI服务异常: %v", err)
		c.Writer.Flush()
		return
	}
	if resp.IsError() {
		fmt.Fprintf(c.Writer, "[ERROR] AI服务异常: %s", resp.Status())
		c.Writer.Flush()
		return
	}
	if resp.RawResponse != nil {
		defer resp.RawResponse.Body.Close()
	}

	reader := bufio.NewReader(resp.RawResponse.Body)
	var messageID string
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			fmt.Fprintf(c.Writer, "[ERROR] AI服务异常: %v", err)
			c.Writer.Flush()
			break
		}

		line = strings.TrimSpace(line)
		if line == "" || !strings.HasPrefix(line, "data:") {
			continue
		}

		jsonStr := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		var payload map[string]interface{}
		if err := json.Unmarshal([]byte(jsonStr), &payload); err != nil {
			continue
		}

		event, _ := payload["event"].(string)
		switch event {
		case "message":
			answer, _ := payload["answer"].(string)
			messageID, _ = payload["message_id"].(string)
			fmt.Fprintf(c.Writer, "%s", answer)
			c.Writer.Flush()
		case "message_end":
			if messageID != "" {
				fmt.Fprintf(c.Writer, "[MESSAGE_ID:%s]", messageID)
				c.Writer.Flush()
			}
		}
	}
}

// GetNextProblemSuggestion 获取下一个问题建议接口
func (h *Handler) GetNextProblemSuggestion(c *gin.Context) {
	messageID := c.Param("message_id")
	username := c.Query("username")

	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户名不能为空"})
		return
	}

	resp, err := h.dify.NewRequest().
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

	var result map[string]interface{}
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	data, ok := result["data"]
	if !ok {
		c.JSON(http.StatusOK, []interface{}{})
		return
	}

	if items, ok := data.([]interface{}); ok {
		c.JSON(http.StatusOK, items)
		return
	}

	c.JSON(http.StatusOK, []interface{}{})
}

// ListConversations 获取用户会话列表接口
func (h *Handler) ListConversations(c *gin.Context) {
	username := c.Param("username")

	resp, err := h.dify.NewRequest().
		SetHeader("Content-Type", "application/json").
		SetQueryParam("user", username).
		SetQueryParam("limit", fmt.Sprintf("%d", h.pageLimit)).
		Get("/conversations")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if resp.IsError() {
		c.JSON(http.StatusInternalServerError, gin.H{"error": resp.Status()})
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	data, ok := result["data"]
	if !ok {
		c.JSON(http.StatusOK, gin.H{"conversations": []interface{}{}})
		return
	}

	conversations, ok := data.([]interface{})
	if !ok {
		c.JSON(http.StatusOK, gin.H{"conversations": []interface{}{}})
		return
	}

	sort.Slice(conversations, func(i, j int) bool {
		convI, okI := conversations[i].(map[string]interface{})
		convJ, okJ := conversations[j].(map[string]interface{})
		if !okI || !okJ {
			return false
		}

		createdAtI, okI := convI["created_at"].(string)
		createdAtJ, okJ := convJ["created_at"].(string)
		if okI && okJ {
			return createdAtI > createdAtJ
		}

		createdAtIFloat, okIFloat := convI["created_at"].(float64)
		createdAtJFloat, okJFloat := convJ["created_at"].(float64)
		if okIFloat && okJFloat {
			return createdAtIFloat > createdAtJFloat
		}

		return false
	})

	c.JSON(http.StatusOK, gin.H{"conversations": conversations})
}

// GetChatHistory 获取聊天历史接口
func (h *Handler) GetChatHistory(c *gin.Context) {
	conversationID := c.Param("conversation_id")
	username := c.Query("username")

	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户名不能为空"})
		return
	}

	allMessages := []map[string]interface{}{}
	firstID := ""

	for {
		params := map[string]string{
			"conversation_id": conversationID,
			"user":            username,
			"limit":           fmt.Sprintf("%d", h.pageLimit),
		}

		if firstID != "" {
			params["first_id"] = firstID
		}

		resp, err := h.dify.NewRequest().
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

		var result map[string]interface{}
		if err := json.Unmarshal(resp.Body(), &result); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		data, ok := result["data"]
		if !ok {
			break
		}

		messages, ok := data.([]interface{})
		if !ok {
			break
		}

		for _, msg := range messages {
			if msgMap, ok := msg.(map[string]interface{}); ok {
				allMessages = append([]map[string]interface{}{msgMap}, allMessages...)
			}
		}

		hasMore, hasMoreOk := result["has_more"].(bool)
		if !hasMoreOk || !hasMore || len(messages) == 0 {
			break
		}

		if len(messages) > 0 {
			if firstMsg, ok := messages[0].(map[string]interface{}); ok {
				if id, idOk := firstMsg["id"].(string); idOk {
					firstID = id
				}
			}
		}
	}

	history := make([]map[string]interface{}, len(allMessages))
	for i, msg := range allMessages {
		history[i] = map[string]interface{}{
			"query":         msg["query"],
			"answer":        msg["answer"],
			"message_files": msg["message_files"],
			"created_at":    msg["created_at"],
			"id":            msg["id"],
		}
	}

	c.JSON(http.StatusOK, history)
}

// DeleteConversation 删除会话接口
func (h *Handler) DeleteConversation(c *gin.Context) {
	conversationID := c.Param("conversation_id")
	username := c.Query("username")

	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户名不能为空"})
		return
	}

	resp, err := h.dify.NewRequest().
		SetHeader("Content-Type", "application/json").
		SetBody(map[string]string{"user": username}).
		Delete(fmt.Sprintf("/conversations/%s", conversationID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.StatusCode() == http.StatusNoContent {
		c.JSON(http.StatusOK, gin.H{
			"message":         "对话已删除",
			"conversation_id": conversationID,
		})
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "对话不存在"})
}

// UploadFiles 文件上传接口
func (h *Handler) UploadFiles(ctx *gin.Context) {
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

		if _, err := fileField.Write(fileContent); err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("写入文件内容失败: %v", err)})
			return
		}

		if err := writer.WriteField("user", username); err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("写入用户字段失败: %v", err)})
			return
		}

		if err := writer.Close(); err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("关闭表单写入器失败: %v", err)})
			return
		}

		resp, err := h.dify.NewRequest().
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

		var uploadResp map[string]interface{}
		if err := json.Unmarshal(resp.Body(), &uploadResp); err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("响应解析失败: %v", err)})
			return
		}

		if id, ok := uploadResp["id"].(string); ok {
			fileIDs = append(fileIDs, id)
		}
	}

	ctx.JSON(http.StatusOK, gin.H{"file_ids": fileIDs})
}
