"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Lightbulb, Loader2 } from "lucide-react"

interface SuggestedQuestionsProps {
    messageId: string
    username: string
    onQuestionSelect: (question: string) => void
    disabled?: boolean
}

export function SuggestedQuestions({
    messageId,
    username,
    onQuestionSelect,
    disabled = false,
}: SuggestedQuestionsProps) {
    const [questions, setQuestions] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showQuestions, setShowQuestions] = useState(false)
    const [hasData, setHasData] = useState(false) // 添加状态跟踪是否有数据

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

    useEffect(() => {
        if (messageId && username) {
            fetchSuggestedQuestions()
        }
    }, [messageId, username])

    const fetchSuggestedQuestions = async () => {
        setIsLoading(true)
        setError(null)
        setHasData(false)

        try {
            const response = await fetch(`${API_BASE_URL}/api/chat/next_suggest/${messageId}?username=${username}`)

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()

            if (Array.isArray(data) && data.length > 0) {
                setQuestions(data)
                setHasData(true)
                // 延迟显示以创建更好的用户体验
                setTimeout(() => setShowQuestions(true), 300)
            } else {
                // 如果没有推荐问题，设置hasData为false，这样组件就不会显示
                setHasData(false)
                setQuestions([])
            }
        } catch (error) {
            console.error("Failed to fetch suggested questions:", error)
            setError("获取推荐问题失败")
            setHasData(false)
        } finally {
            setIsLoading(false)
        }
    }

    const handleQuestionClick = (question: string) => {
        if (!disabled) {
            onQuestionSelect(question)
        }
    }

    // 如果正在加载且还没有确定是否有数据，显示加载状态
    if (isLoading && !hasData) {
        return (
            <Card className="p-4 mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">正在生成推荐问题...</span>
                </div>
            </Card>
        )
    }

    // 如果有错误，显示错误信息
    if (error) {
        return (
            <Card className="p-4 mt-3 bg-red-50 border-red-200">
                <div className="flex items-center gap-2 text-red-600">
                    <span className="text-sm">{error}</span>
                </div>
            </Card>
        )
    }

    // 如果没有数据或问题列表为空，不显示任何内容
    if (!hasData || questions.length === 0) {
        return null
    }

    return (
        <div
            className={`mt-3 transition-all duration-500 ease-out ${showQuestions ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                }`}
        >
            <Card className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">推荐问题</span>
                </div>

                <div className="space-y-2">
                    {questions.map((question, index) => (
                        <Button
                            key={index}
                            variant="ghost"
                            onClick={() => handleQuestionClick(question)}
                            disabled={disabled}
                            className={`w-full text-left justify-start p-3 h-auto rounded-xl bg-white hover:bg-blue-50 hover:border-blue-200 border border-gray-200 text-gray-700 hover:text-blue-700 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] animate-in slide-in-from-bottom-1 ${disabled ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                            style={{
                                animationDelay: `${index * 100}ms`,
                                animationFillMode: "both",
                            }}
                        >
                            <span className="text-sm leading-relaxed whitespace-normal text-left break-words">{question}</span>
                        </Button>
                    ))}
                </div>

                <div className="mt-3 text-xs text-amber-600 opacity-75">💡 点击问题可以快速提问</div>
            </Card>
        </div>
    )
}
