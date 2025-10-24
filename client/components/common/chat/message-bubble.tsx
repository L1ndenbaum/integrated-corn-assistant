"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { User } from "lucide-react"
import { MarkdownRenderer } from "./markdown-renderer"
import { ThinkingSection } from "./thinking-section"
import { SuggestedQuestions } from "./suggested-questions"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: string
  isStreaming?: boolean
  images?: string[]
  messageId?: string
}

interface MessageBubbleProps {
  message: Message
  isLoading?: boolean
  username?: string
  onQuestionSelect?: (question: string) => void
  showSuggestions?: boolean
  isLastMessage?: boolean
}

interface ParsedContent {
  parts: Array<{
    type: "thinking" | "content"
    content: string
    isComplete?: boolean
  }>
}

export function MessageBubble({
  message,
  isLoading,
  username,
  onQuestionSelect,
  showSuggestions = false,
  isLastMessage = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user"
  const isStreaming = message.isStreaming || isLoading

  const [avatarURL, setAvatarURL] = useState<string | null>(null)

  // 从 localStorage 读取头像
  useEffect(() => {
    const storedAvatar = localStorage.getItem("user_avatar")
    if (!storedAvatar) {
      setAvatarURL(null)
      return
    }

    try {
      // 尝试解析为 JSON，看是否是 Blob info
      const parsed = JSON.parse(storedAvatar)
      if (parsed && parsed.type === "file" && parsed.data) {
        // 如果是 File 对象的序列化信息，需要转成 Blob
        const byteCharacters = atob(parsed.data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: parsed.mimeType || "image/png" })
        const url = URL.createObjectURL(blob)
        setAvatarURL(url)
        return () => URL.revokeObjectURL(url)
      }
    } catch {
      // 如果不是 JSON，就当作 Base64 或 URL
      setAvatarURL(storedAvatar)
    }
  }, [])

  // 时间格式化
  const formatTimestamp = (timestamp: string) => {
    const isUnixTimestamp = /^\d+$/.test(timestamp)
    const date = isUnixTimestamp
      ? new Date(Number.parseInt(timestamp) * 1000)
      : new Date(timestamp)
    return date.toLocaleTimeString()
  }

  // 解析思考内容
  const parseStreamContent = (content: string): ParsedContent => {
    const parts: ParsedContent["parts"] = []
    let currentIndex = 0
    let inThinking = false
    let thinkingContent = ""
    let normalContent = ""

    while (currentIndex < content.length) {
      const thinkStartIndex = content.indexOf("<think>", currentIndex)
      const thinkEndIndex = content.indexOf("</think>", currentIndex)

      if (!inThinking) {
        if (thinkStartIndex === -1) {
          normalContent += content.slice(currentIndex)
          break
        } else {
          normalContent += content.slice(currentIndex, thinkStartIndex)
          if (normalContent.trim()) {
            parts.push({ type: "content", content: normalContent.trim(), isComplete: true })
            normalContent = ""
          }
          inThinking = true
          currentIndex = thinkStartIndex + 7
        }
      } else {
        if (thinkEndIndex === -1) {
          thinkingContent += content.slice(currentIndex)
          parts.push({ type: "thinking", content: thinkingContent, isComplete: false })
          break
        } else {
          thinkingContent += content.slice(currentIndex, thinkEndIndex)
          parts.push({ type: "thinking", content: thinkingContent, isComplete: true })
          thinkingContent = ""
          inThinking = false
          currentIndex = thinkEndIndex + 8
        }
      }
    }

    if (normalContent.trim()) {
      parts.push({ type: "content", content: normalContent.trim(), isComplete: true })
    }

    return { parts }
  }

  const { parts } = isUser
    ? { parts: [{ type: "content" as const, content: message.content, isComplete: true }] }
    : parseStreamContent(message.content)

  const shouldShowSuggestions =
    !isUser && !isStreaming && showSuggestions && isLastMessage && message.messageId && username && onQuestionSelect

  return (
    <div
      className={`flex gap-3 animate-in slide-in-from-bottom-2 duration-300 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <Avatar className="w-8 h-8 mt-1 ring-2 ring-yellow-100">
          <AvatarFallback className="bg-gradient-to-br from-yellow-100 to-green-100 p-1">
            <img
              src="/images/corn-avatar.jpeg"
              alt="玉米问答助手"
              className="w-full h-full object-cover rounded-full"
            />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`max-w-[85%] md:max-w-[70%] ${isUser ? "order-first" : ""}`}>
        {parts.map((part, index) => (
          <div key={index} className={part.type === "thinking" ? "mb-2" : ""}>
            {part.type === "thinking" ? (
              <ThinkingSection content={part.content} isStreaming={!part.isComplete && isStreaming} />
            ) : (
              part.content && (
                <Card
                  className={`p-4 transition-all duration-200 hover:shadow-md ${isUser
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600 shadow-lg"
                    : "bg-white border-gray-200 shadow-sm hover:shadow-md"
                    } mb-2`}
                >
                  {isUser && message.images && message.images.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {message.images.map((imageUrl, imgIndex) => (
                        <img
                          key={imgIndex}
                          src={imageUrl || "/placeholder.svg"}
                          alt={`Uploaded image ${imgIndex + 1}`}
                          className="max-w-full h-auto max-h-48 rounded-lg border border-white/20"
                        />
                      ))}
                    </div>
                  )}

                  {isUser ? (
                    <div className="whitespace-pre-wrap break-words">{part.content}</div>
                  ) : (
                    <div className="relative">
                      <MarkdownRenderer content={part.content} />
                      {!part.isComplete && isStreaming && (
                        <div className="inline-flex items-center ml-1">
                          <div className="w-2 h-4 bg-blue-500 animate-pulse rounded-sm"></div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )
            )}
          </div>
        ))}

        {shouldShowSuggestions && (
          <SuggestedQuestions
            messageId={message.messageId!}
            username={username!}
            onQuestionSelect={onQuestionSelect!}
            disabled={isLoading}
          />
        )}

        {parts.length === 0 && isStreaming && (
          <Card className="p-4 bg-white border-gray-200 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-4 bg-blue-500 animate-pulse rounded-sm"></div>
              <span className="text-sm text-gray-500">玉米智能助手正在思考...</span>
            </div>
          </Card>
        )}

        <div className={`text-xs text-gray-500 mt-2 ${isUser ? "text-right" : "text-left"}`}>
          {formatTimestamp(message.timestamp)}
          {isStreaming && !isUser && <span className="ml-2 text-blue-500 animate-pulse">正在输入...</span>}
        </div>
      </div>

      {isUser && (
        <Avatar className="w-8 h-8 mt-1 ring-2 ring-blue-100">
          {avatarURL ? (
            <img src={avatarURL} alt="用户头像" className="w-full h-full object-cover rounded-full" />
          ) : (
            <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
              <User className="w-4 h-4" />
            </AvatarFallback>
          )}
        </Avatar>
      )}
    </div>
  )
}
