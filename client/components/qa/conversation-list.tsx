"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Trash2 } from "lucide-react"
import { useState } from "react"

interface Conversation {
  id: string
  name: string
  created_at: string
  updated_at: string
}

interface ConversationListProps {
  conversations: Conversation[]
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
}

export function ConversationList({
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
}: ConversationListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const formatDate = (dateString: string) => {
    // 检查是否为Unix时间戳（纯数字字符串）
    const isUnixTimestamp = /^\d+$/.test(dateString)
    const date = isUnixTimestamp
      ? new Date(Number.parseInt(dateString) * 1000) // Unix时间戳需要乘以1000
      : new Date(dateString) // ISO格式字符串

    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "今天"
    if (diffDays === 2) return "昨天"
    if (diffDays <= 7) return `${diffDays} 天前`
    return date.toLocaleDateString()
  }

  const formatTime = (dateString: string) => {
    // 检查是否为Unix时间戳（纯数字字符串）
    const isUnixTimestamp = /^\d+$/.test(dateString)
    const date = isUnixTimestamp
      ? new Date(Number.parseInt(dateString) * 1000) // Unix时间戳需要乘以1000
      : new Date(dateString) // ISO格式字符串

    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const truncateText = (text: string, maxChineseChars = 12) => {
    let length = 0
    let truncatedText = ""

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      // 中文字符计为1个长度，英文字符计为0.5个长度
      const charLength = /[\u4e00-\u9fa5]/.test(char) ? 1 : 0.5

      if (length + charLength > maxChineseChars) {
        return truncatedText + "..."
      }

      truncatedText += char
      length += charLength
    }

    return truncatedText
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {conversations.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">暂无对话记录</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group relative rounded-lg p-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${currentConversationId === conversation.id
                  ? "bg-blue-50 border border-blue-200 shadow-sm"
                  : "hover:bg-gray-50 hover:shadow-sm"
                }`}
              onMouseEnter={() => setHoveredId(conversation.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-500">{formatDate(conversation.updated_at)}</span>
                  </div>

                  <h3 className="text-sm font-medium text-gray-900 mb-1 leading-tight">
                    {truncateText(conversation.name)}
                  </h3>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="truncate">创建: {formatTime(conversation.created_at)}</span>
                    <span className="ml-2 flex-shrink-0">更新: {formatTime(conversation.updated_at)}</span>
                  </div>
                </div>

                {hoveredId === conversation.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 h-auto flex-shrink-0 hover:bg-red-50 active:scale-90"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteConversation(conversation.id)
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  )
}
