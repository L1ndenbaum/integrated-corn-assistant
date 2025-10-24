"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Brain } from "lucide-react"

interface ThinkingSectionProps {
  content: string
  isStreaming?: boolean
}

export function ThinkingSection({ content, isStreaming = false }: ThinkingSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="border-dashed border-gray-300 bg-gray-50/50 mb-2">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-start gap-2 p-3 h-auto text-left font-normal"
      >
        <Brain className="w-4 h-4 text-purple-600 flex-shrink-0" />
        <span className="text-purple-700 font-medium text-sm">
          深度思考
          {isStreaming && <span className="ml-2 text-xs text-gray-500">正在思考中...</span>}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 ml-auto text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 ml-auto text-gray-500" />
        )}
      </Button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-dashed border-gray-200 mt-2 pt-3">
          <div className="text-xs text-gray-600 bg-white rounded-md p-3 border border-gray-200 leading-relaxed">
            <div className="whitespace-pre-wrap break-words relative">
              {content}
              {isStreaming && (
                <span className="inline-flex items-center ml-1">
                  <div className="w-1 h-3 bg-purple-500 animate-pulse"></div>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
