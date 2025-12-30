"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Menu, Send, Plus, X, Home } from "lucide-react"
import { MessageBubble } from "@/components/common/chat/message-bubble"
import { ConversationList } from "@/components/qa/conversation-list"
import { ImageUpload } from "@/components/qa/image-upload"
import { AuthGuard } from "@/components/common/auth/auth-guard"
import { UserMenu } from "@/components/common/navigation/user-menu"
import { DragDropZone } from "@/components/common/upload/drag-drop-zone"
import { motion } from 'framer-motion';
import { useRouter } from "next/navigation";
import { useStoredUsername } from "@/hooks/use-stored-username";

interface Message {
  role: "user" | "assistant" // 消息归属方, 用户 或 AI助手
  content: string // 消息内容
  timestamp: string // 时间戳
  isStreaming?: boolean // 是否正在传输
  images?: string[]  // 图片文件ID
  messageId?: string // 消息ID
}

interface Conversation {
  id: string
  name: string
  created_at: string
  updated_at: string
}

interface UploadedFile {
  file: File
  fileId: string
  preview: string
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [currentConversationName, setCurrentConversationName] = useState<string>("")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [showSidebar, setShowSidebar] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const storedUsername = useStoredUsername()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadConversations = useCallback(async () => {
    if (!storedUsername) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/conversations/${storedUsername}`)
      const data = await response.json()
      setConversations(data.conversations || [])
    } catch (error) {
      console.error("Failed to load conversations:", error)
    }
  }, [API_BASE_URL, storedUsername])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const loadConversation = async (conversationId: string) => {
    if (!storedUsername) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/history?username=${storedUsername}`)
      const data = await response.json()

      // 将后端返回的数据转换为前端的 Message 格式
      const historyMessages: Message[] = []

      if (Array.isArray(data)) {
        data.forEach((item) => {
          // 添加用户消息
          if (item.query) {
            // 提取用户消息中的图片URLs
            const userImages: string[] = []
            if (item.message_files && Array.isArray(item.message_files)) {
              item.message_files.forEach((file: any) => {
                if (file.type === "image" && file.url && file.belongs_to === "user") {
                  userImages.push(file.url)
                }
              })
            }

            historyMessages.push({
              role: "user",
              content: item.query,
              timestamp: item.created_at,
              images: userImages.length > 0 ? userImages : undefined,
            })
          }

          // 添加AI回复
          if (item.answer) {
            historyMessages.push({
              role: "assistant",
              content: item.answer,
              timestamp: item.created_at,
              messageId: item.id, // 添加消息ID
            })
          }
        })
      }

      setMessages(historyMessages)
      setCurrentConversationId(conversationId)

      // 从对话列表中找到对话名称
      const conversation = conversations.find((conv) => conv.id === conversationId)
      setCurrentConversationName(conversation?.name || "对话")
    } catch (error) {
      console.error("Failed to load conversation:", error)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    if (!storedUsername) {
      return
    }

    try {
      await fetch(`${API_BASE_URL}/api/v1/chat/conversations/${conversationId}?username=${storedUsername}`, {
        method: "DELETE",
      })
      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId))
      if (currentConversationId === conversationId) {
        setMessages([])
        setCurrentConversationId(null)
        setCurrentConversationName("")
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error)
    }
  }

  const startNewConversation = () => {
    setMessages([])
    setCurrentConversationId(null)
    setCurrentConversationName("")
    setUploadedFiles([])
  }

  const handleFileUpload = (files: File[], fileIds: string[]) => {
    const newFiles: UploadedFile[] = files.map((file, index) => ({
      file,
      fileId: fileIds[index] || "",
      preview: URL.createObjectURL(file),
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])
  }

  // 处理拖拽上传的文件
  const handleDragDropUpload = async (files: File[]) => {
    if (files.length === 0 || !storedUsername) return

    try {
      // 创建FormData并上传文件
      const formData = new FormData()
      files.forEach((file) => {
        formData.append("files", file)
      })
      formData.append("username", storedUsername)
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/files/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      const result = await response.json()
      const fileIds = result.file_ids || []

      // 调用现有的文件上传处理函数
      handleFileUpload(files, fileIds)
    } catch (error) {
      console.error("Drag drop upload error:", error)
      // 上传失败时传递空的fileIds数组
      handleFileUpload(files, [])
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  // 处理推荐问题选择
  const handleQuestionSelect = (question: string) => {
    setInput(question)
    // 可以选择自动发送或让用户确认
    // sendMessageWithText(question)
  }

  // 发送消息的通用函数
  const sendMessageWithText = async (messageText: string) => {
    if (!storedUsername) {
      console.error("Username is required to send messages")
      return
    }

    if (!messageText.trim() && uploadedFiles.length === 0) return

    // 创建用户消息，包含上传的图片预览URLs
    const userImages = uploadedFiles.map((file) => file.preview)
    const userMessage: Message = {
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
      images: userImages.length > 0 ? userImages : undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    const currentFiles = uploadedFiles
    setInput("")
    setUploadedFiles([])
    setIsLoading(true)

    const assistantMessage: Message = {
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      isStreaming: true,
    }

    setMessages((prev) => [...prev, assistantMessage])
    abortControllerRef.current = new AbortController()

    try {
      // 添加用户名字段到请求数据
      const requestData = {
        message: messageText,
        conversation_id: currentConversationId,
        file_ids: currentFiles.map((f) => f.fileId).filter((id) => id),
        username: storedUsername, // 添加用户名字段
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/chat/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error("Response body is null")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ""
      let messageId: string | undefined

      try {
        while (true) 
        {
          const { done, value } = await reader.read()
          if (done) { break }

          let chunk = decoder.decode(value, { stream: true })
          if (chunk.startsWith("[ERROR]")) 
            {
            setMessages((prev) =>
              prev.map((msg, index) =>
                index === prev.length - 1
                  ? {
                    ...msg,
                    content: chunk,
                    isStreaming: false,
                  }
                  : msg,
              ),
            )
            break
          }

          // 检查并提取messageId，但不将其添加到显示内容中
          if (chunk.includes("[MESSAGE_ID:")) {
            const match = chunk.match(/\[MESSAGE_ID:([^\]]+)\]/)
            if (match) {
              messageId = match[1]
              // 从chunk中移除MESSAGE_ID标记，避免显示在消息内容中
              chunk = chunk.replace(/\[MESSAGE_ID:[^\]]+\]/g, "")
            }
          }

          // 只有在chunk不为空时才添加到内容中
          if (chunk.trim()) {
            accumulatedContent += chunk
          }

          setMessages((prev) =>
            prev.map((msg, index) =>
              index === prev.length - 1
                ? {
                  ...msg,
                  content: accumulatedContent,
                  isStreaming: true,
                  messageId: messageId,
                }
                : msg,
            ),
          )
        }

        setMessages((prev) =>
          prev.map((msg, index) =>
            index === prev.length - 1
              ? {
                ...msg,
                isStreaming: false,
                messageId: messageId,
              }
              : msg,
          ),
        )

        currentFiles.forEach((file) => {
          URL.revokeObjectURL(file.preview)
        })

        await loadConversations()

        // 如果是新对话，可能需要更新当前对话信息
        if (!currentConversationId) {
          // 重新获取对话列表，找到新创建的对话
          const updatedResponse = await fetch(`${API_BASE_URL}/api/v1/chat/conversations/${storedUsername}`)
          const updatedData = await updatedResponse.json()
          const updatedConversations = updatedData.conversations || []

          // 更新对话列表
          setConversations(updatedConversations)

          // 找到最新的对话（通常是第一个，因为按时间排序）
          if (updatedConversations.length > 0) {
            const latestConv = updatedConversations[0]
            setCurrentConversationId(latestConv.id)
            setCurrentConversationName(latestConv.name)
          }
        } else {
          // 如果是现有对话，只需要刷新对话列表，不改变当前对话ID
          await loadConversations()
        }
      } catch (streamError) {
        if (streamError instanceof Error && streamError.name === "AbortError") {
          console.log("Request was aborted")
        } else {
          console.error("Stream reading error:", streamError)
          setMessages((prev) =>
            prev.map((msg, index) =>
              index === prev.length - 1
                ? {
                  ...msg,
                  content: "流式传输出现错误，请重试。",
                  isStreaming: false,
                }
                : msg,
            ),
          )
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      setMessages((prev) =>
        prev.map((msg, index) =>
          index === prev.length - 1
            ? {
              ...msg,
              content: "发送消息失败，请检查网络连接后重试。",
              isStreaming: false,
            }
            : msg,
        ),
      )
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const sendMessage = async () => {
    await sendMessageWithText(input)
  }

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (isLoading) {
        stopGeneration()
      } else {
        sendMessage()
      }
    }
  }

  const router = useRouter();

  return (
    <AuthGuard>
      <DragDropZone onFilesDropped={handleDragDropUpload} disabled={isLoading}>
        <div className="flex h-screen bg-gray-50">
          {/* 侧边栏 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${showSidebar ? "w-80 opacity-100" : "w-0 opacity-0 overflow-hidden"
              }`}
          >
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <Button
                onClick={startNewConversation}
                className="w-full justify-start gap-2 bg-transparent hover:bg-blue-50 active:scale-95 transition-all duration-150"
                variant="outline"
              >
                <Plus className="w-4 h-4" />
                新建对话
              </Button>
            </div>

            <ConversationList
              conversations={conversations}
              currentConversationId={currentConversationId}
              onSelectConversation={loadConversation}
              onDeleteConversation={deleteConversation}
            />
          </motion.div>

          {/* 主聊天区域 */}
          <div className="flex-1 flex flex-col">
            {/* 头部 */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white border-b border-gray-200 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="hover:bg-gray-100 active:scale-95 transition-all duration-150"
                >
                  <Menu className="w-4 h-4" />
                </Button>
                <h1 className="text-lg font-semibold">{currentConversationName || "玉米问答助手"}</h1>
              </div>
            </motion.div>

            {/* 消息区域 */}
            <ScrollArea className="flex-1 p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex-1 p-4"
              >
                <div className="max-w-4xl mx-auto space-y-4">
                  {messages.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-center text-gray-500 mt-20"
                    >
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-br from-yellow-100 to-green-100 p-2">
                        <img
                          src="/images/corn-avatar.jpeg"
                          alt="玉米问答助手"
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                      <p className="text-lg mb-2 text-gray-700">我是玉米问答助手</p>
                      <p className="text-sm text-gray-600">有什么可以帮忙的😀？</p>
                      <p className="text-xs text-gray-400 mt-2">💡 提示：可以直接拖拽图片到窗口中上传</p>
                    </motion.div>
                  ) : (
                    messages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <MessageBubble
                          key={index}
                          message={message}
                          isLoading={message.isStreaming}
                          username={storedUsername ?? undefined}
                          onQuestionSelect={handleQuestionSelect}
                          showSuggestions={true}
                          isLastMessage={index === messages.length - 1}
                        />
                      </motion.div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </motion.div>
            </ScrollArea>

            {/* 输入区域 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white border-t border-gray-200 p-4"
            >
              <div className="max-w-4xl mx-auto">
                {/* 文件预览 */}
                {uploadedFiles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mb-3 flex flex-wrap gap-2"
                  >
                    {uploadedFiles.map((uploadedFile, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={uploadedFile.preview || "/placeholder.svg"}
                          alt={`Upload ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border"
                        />
                        {!uploadedFile.fileId && (
                          <div className="absolute inset-0 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                            <span className="text-xs text-red-600 font-medium">上传失败</span>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-90"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </motion.div>
                )}

                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={isLoading ? "玉米问答助手正在回复中... 按Enter停止" : "输入消息..."}
                      className="pr-20 min-h-[44px] resize-none"
                      disabled={false}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <ImageUpload onUpload={handleFileUpload} disabled={isLoading} />
                    </div>
                  </div>
                  <Button
                    onClick={isLoading ? stopGeneration : sendMessage}
                    disabled={!isLoading && !input.trim() && uploadedFiles.length === 0}
                    size="sm"
                    className="h-[44px] px-4 active:scale-95 transition-all duration-150"
                    variant={isLoading ? "destructive" : "default"}
                  >
                    {isLoading ? "停止" : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* 返回主页按钮 */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push("/")}
            className="fixed bottom-6 left-6 bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-full shadow-lg z-10 active:scale-95 transition-all duration-150"
            aria-label="返回主页"
          >
            <Home className="w-6 h-6" />
          </motion.button>
        </div>
      </DragDropZone>
    </AuthGuard>
  )
}
