"use client"

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
  messageId?: string // 添加消息ID字段
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

  // 时间格式化函数，兼容Unix时间戳和ISO格式
  const formatTimestamp = (timestamp: string) => {
    // 检查是否为Unix时间戳（纯数字字符串）
    const isUnixTimestamp = /^\d+$/.test(timestamp)
    const date = isUnixTimestamp
      ? new Date(Number.parseInt(timestamp) * 1000) // Unix时间戳需要乘以1000
      : new Date(timestamp) // ISO格式字符串

    return date.toLocaleTimeString()
  }

  // 解析思考部分和正常内容（支持流式解析）
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
        // 当前不在思考模式
        if (thinkStartIndex === -1) {
          // 没有找到开始标签，剩余都是普通内容
          normalContent += content.slice(currentIndex)
          break
        } else {
          // 找到开始标签
          normalContent += content.slice(currentIndex, thinkStartIndex)
          if (normalContent.trim()) {
            parts.push({ type: "content", content: normalContent.trim(), isComplete: true })
            normalContent = ""
          }
          inThinking = true
          currentIndex = thinkStartIndex + 7 // '<think>'.length
        }
      } else {
        // 当前在思考模式
        if (thinkEndIndex === -1) {
          // 没有找到结束标签，剩余都是思考内容（可能还在流式输出中）
          thinkingContent += content.slice(currentIndex)
          parts.push({ type: "thinking", content: thinkingContent, isComplete: false })
          break
        } else {
          // 找到结束标签
          thinkingContent += content.slice(currentIndex, thinkEndIndex)
          parts.push({ type: "thinking", content: thinkingContent, isComplete: true })
          thinkingContent = ""
          inThinking = false
          currentIndex = thinkEndIndex + 8 // '</think>'.length
        }
      }
    }

    // 处理剩余的普通内容
    if (normalContent.trim()) {
      parts.push({ type: "content", content: normalContent.trim(), isComplete: true })
    }

    return { parts }
  }

  const { parts } = isUser
    ? { parts: [{ type: "content" as const, content: message.content, isComplete: true }] }
    : parseStreamContent(message.content)

  // 判断是否应该显示推荐问题
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
                  {/* 用户消息显示图片 */}
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

        {/* 推荐问题组件 */}
        {shouldShowSuggestions && (
          <SuggestedQuestions
            messageId={message.messageId!}
            username={username!}
            onQuestionSelect={onQuestionSelect!}
            disabled={isLoading}
          />
        )}

        {/* 如果没有任何内容但正在流式传输，显示占位符 */}
        {parts.length === 0 && isStreaming && (
          <Card className="p-4 bg-white border-gray-200 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-4 bg-blue-500 animate-pulse rounded-sm"></div>
              <span className="text-sm text-gray-500">玉米问答助手正在思考...</span>
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
          <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
