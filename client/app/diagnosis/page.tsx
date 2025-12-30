"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Loader2,
  MapPin,
  Cloud,
  Upload,
  Send,
  Home,
  RotateCcw,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { motion } from "framer-motion"
import { ImageUploadDiagnosis } from "@/components/diagnosis/image-upload"
import { MessageBubble } from "@/components/common/chat/message-bubble"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/common/auth/auth-guard"
import { DragDropZone } from "@/components/common/upload/drag-drop-zone"

interface WeatherData {
  location: string
  temperature: string
  weather: string
  humidity: string
  wind: string
}

interface DiagnosisResult {
  filename: string
  predicted_class: string
  confidence: number
  class_id: number
}

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: string
  isStreaming?: boolean
}

export default function DiagnosisPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false)
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false)
  const [diagnosisResults, setDiagnosisResults] = useState<DiagnosisResult[]>([])
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [isGeneratingResponse, setIsGeneratingResponse] = useState<boolean>(false)
  const [hasStartedDiagnosis, setHasStartedDiagnosis] = useState<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"
  const DIAGNOSIS_BASE_URL = process.env.NEXT_PUBLIC_DIAGNOSIS_BASE_URL || "http://localhost:8080"

  useEffect(() => {
    getLocation()
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const getLocation = useCallback(() => {
    setIsLoadingLocation(true)
    setError(null)

    fetch("/api/geo/location")
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          setIsLoadingLocation(false)
          getWeatherInfo(data.adcode)
        } else {
          throw new Error(data.error || "位置信息获取失败")
        }
      })
      .catch((err) => {
        setIsLoadingLocation(false)
        setError("无法获取您的位置信息，请手动输入位置或允许位置权限")
        console.error("获取位置失败:", err)
      })
  }, [])

  const getWeatherInfo = async (cityAdcode: string) => {
    setIsLoadingWeather(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/geo/weather?city=${cityAdcode}`)
      const data = await response.json()

      if (data.status === "success" && data.type === "live") {
        const liveWeather = data
        const weatherData: WeatherData = {
          location: `${liveWeather.city},${liveWeather.province}`,
          temperature: liveWeather.temperature,
          weather: liveWeather.weather,
          humidity: liveWeather.humidity,
          wind: liveWeather.wind,
        }

        setWeather(weatherData)
      } else {
        throw new Error("天气信息获取失败")
      }

      setIsLoadingWeather(false)
    } catch (err) {
      setIsLoadingWeather(false)
      setError("获取天气信息失败: " + (err as Error).message)
      console.error("获取天气信息失败:", err)
      throw err
    }
  }

  const uniqFiles = (files: File[]) => {
    const seen = new Set<string>()
    const deduped: File[] = []

    for (const file of files) {
      const key = `${file.name}::${file.size}::${file.lastModified}`
      if (!seen.has(key)) {
        seen.add(key)
        deduped.push(file)
      }
    }

    return deduped
  }

  const handleFileUpload = useCallback((files: File[]) => {
    setUploadedFiles(uniqFiles(files))
  }, [])

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDragDropUpload = useCallback((files: File[]) => {
    if (files.length === 0) {
      return
    }

    setUploadedFiles((prev) => uniqFiles([...prev, ...files]))
  }, [])

  const startDiagnosis = async () => {
    if (uploadedFiles.length === 0) {
      setError("请上传至少一张玉米图片")
      return
    }

    setIsDiagnosing(true)
    setError(null)

    try {
      const formData = new FormData()
      uniqFiles(uploadedFiles).forEach((file) => {
        formData.append("files", file)
      })

      const diagnosisResponse = await fetch(`${DIAGNOSIS_BASE_URL}/api/diagnosis`, {
        method: "POST",
        body: formData,
      })

      if (!diagnosisResponse.ok) {
        throw new Error("诊断请求失败")
      }

      const diagnosisData = await diagnosisResponse.json()

      setDiagnosisResults(diagnosisData.predictions || [])
      setIsDiagnosing(false)
      await generateDiagnosisResponse(diagnosisData.predictions || [])
    } catch (err) {
      setIsDiagnosing(false)
      setError("诊断过程中出现错误，请重试: " + (err as Error).message)
      console.error("诊断失败:", err)
    }
  }

  const continueDiagnosis = () => {
    setDiagnosisResults([])
    setUploadedFiles([])
    setMessages([])
    setIsDiagnosing(false)
    setHasStartedDiagnosis(false)
    setError(null)
  }

  const generateDiagnosisResponse = async (results: DiagnosisResult[]) => {
    setIsGeneratingResponse(true)
    setHasStartedDiagnosis(true)

    const diagnosisContext = `
      基于以下玉米病虫害诊断结果，请提供专业的分析和建议：

      诊断结果：
      ${results
        .map(
          (result) =>
            `- 文件：${result.filename}
        - 诊断结果：${result.predicted_class}
        - 置信度：${(result.confidence * 100).toFixed(1)}%`,
        )
        .join("\n")}

      当前环境信息：
      ${
        weather
          ? `- 位置：${weather.location}
          - 温度：${weather.temperature}°C
          - 天气：${weather.weather}
          - 湿度：${weather.humidity}
          - 风向和风速：${weather.wind}`
          : "- 环境信息暂不可用"
      }

      请提供：
      1. 详细的病虫害分析
      2. 针对当前环境条件的防治建议
      3. 预防措施和后续管理建议
      `

    const assistantMessage: Message = {
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      isStreaming: true,
    }

    setMessages([assistantMessage])

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: diagnosisContext,
          username: "____FORDIAGNOSIS____",
        }),
      })

      if (!response.ok) {
        throw new Error("获取诊断建议失败")
      }

      if (!response.body) {
        throw new Error("Response body is null")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ""

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          let chunk = decoder.decode(value, { stream: true })

          if (chunk.startsWith("[ERROR]")) {
            setMessages([
              {
                ...assistantMessage,
                content: chunk,
                isStreaming: false,
              },
            ])
            break
          }

          if (chunk.includes("[MESSAGE_ID:")) {
            const match = chunk.match(/\[MESSAGE_ID:([^\]]+)\]/)
            if (match) {
              chunk = chunk.replace(/\[MESSAGE_ID:[^\]]+\]/g, "")
            }
          }

          if (chunk.trim()) {
            accumulatedContent += chunk
          }

          setMessages([
            {
              ...assistantMessage,
              content: accumulatedContent,
              isStreaming: true,
            },
          ])
        }

        setMessages([
          {
            ...assistantMessage,
            content: accumulatedContent,
            isStreaming: false,
          },
        ])
      } catch (streamError) {
        console.error("Stream reading error:", streamError)
        setMessages([
          {
            ...assistantMessage,
            content: "流式传输出现错误，请重试。",
            isStreaming: false,
          },
        ])
      }
    } catch (error) {
      console.error("Failed to generate diagnosis response:", error)
      setMessages([
        {
          ...assistantMessage,
          content: "生成诊断建议失败，请检查网络连接后重试。",
          isStreaming: false,
        },
      ])
    } finally {
      setIsGeneratingResponse(false)
    }
  }

  return (
    <AuthGuard>
      <DragDropZone onFilesDropped={handleDragDropUpload} disabled={isDiagnosing || isGeneratingResponse}>
        <div className="flex h-screen bg-gray-50">
          <div className="w-full lg:w-[420px] bg-white border-r border-gray-200 flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="p-6 border-b border-gray-200"
            >
              <h1 className="text-xl font-semibold text-gray-900">玉米病虫害诊断</h1>
              <p className="mt-2 text-sm text-gray-600">上传玉米图片，结合当前位置天气信息生成专业诊断建议。</p>
            </motion.div>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
                  <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm text-gray-900">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        位置信息
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {isLoadingLocation ? (
                        <div className="flex items-center justify-center py-4 text-sm text-gray-600">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-emerald-600" />
                          正在获取位置信息...
                        </div>
                      ) : weather ? (
                        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                          <span className="text-gray-600">地点</span>
                          <span className="font-medium text-gray-900">{weather.location}</span>
                        </div>
                      ) : (
                        <p className="py-4 text-center text-sm text-gray-500">位置信息暂不可用，请稍后重试。</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
                  <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm text-gray-900">
                        <Cloud className="w-4 h-4 text-emerald-600" />
                        天气信息
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2 text-sm">
                      {isLoadingWeather ? (
                        <div className="flex items-center justify-center py-4 text-sm text-gray-600">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-emerald-600" />
                          正在获取天气信息...
                        </div>
                      ) : weather ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">温度</span>
                            <span className="font-medium text-gray-900">{weather.temperature}°C</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">天气状况</span>
                            <span className="font-medium text-gray-900">{weather.weather}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">湿度</span>
                            <span className="font-medium text-gray-900">{weather.humidity}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">风向/风速</span>
                            <span className="font-medium text-gray-900">{weather.wind}</span>
                          </div>
                        </>
                      ) : (
                        <p className="py-4 text-center text-sm text-gray-500">天气信息暂不可用，请稍后重试。</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
                  <Card className="border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-gray-900">
                        <Upload className="h-4 w-4 text-emerald-600" />
                        上传玉米图片
                      </CardTitle>
                      <CardDescription>支持拖拽或点击上传，最多可选择 10 张图片。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ImageUploadDiagnosis
                        onUpload={handleFileUpload}
                        uploadedFiles={uploadedFiles}
                        onRemoveFile={handleRemoveFile}
                        disabled={isDiagnosing || isGeneratingResponse}
                      />
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600"
                      >
                        💡 建议上传光线充足、清晰的叶片照片，以提高诊断准确度。
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            <div className="border-t border-gray-200 p-6">
              <div className="flex flex-col gap-3">
                <Button
                  onClick={hasStartedDiagnosis ? continueDiagnosis : startDiagnosis}
                  disabled={
                    isDiagnosing ||
                    isGeneratingResponse ||
                    (!hasStartedDiagnosis && uploadedFiles.length === 0)
                  }
                  className={`w-full justify-center gap-2 ${
                    hasStartedDiagnosis ? "bg-white text-gray-900 hover:bg-gray-100" : ""
                  }`}
                  variant={hasStartedDiagnosis ? "outline" : "default"}
                >
                  {hasStartedDiagnosis ? (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      继续诊断
                    </>
                  ) : isDiagnosing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      诊断中...
                    </>
                  ) : isGeneratingResponse ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      生成诊断建议中...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      开始诊断
                    </>
                  )}
                </Button>

                <Button
                  onClick={getLocation}
                  variant="ghost"
                  className="w-full justify-center text-sm text-gray-600 hover:text-gray-900"
                  disabled={isLoadingLocation}
                >
                  {isLoadingLocation ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" /> 刷新定位中...
                    </>
                  ) : (
                    "重新获取位置信息"
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-1 flex-col">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between border-b border-gray-200 bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">诊断建议</h2>
              </div>
            </motion.div>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-4">
                {diagnosisResults.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    <Card className="border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-gray-900">图片诊断结果</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {diagnosisResults.map((result, index) => (
                          <motion.div
                            key={`${result.filename}-${index}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                            className="flex items-start justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
                          >
                            <div className="flex-1 pr-3">
                              <p className="truncate text-sm font-medium text-gray-900">{result.filename}</p>
                              <div className="mt-1 flex items-center gap-2 text-sm">
                                {result.predicted_class === "健康" ? (
                                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-amber-500" />
                                )}
                                <span className="font-semibold text-gray-900">{result.predicted_class}</span>
                              </div>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                              {(result.confidence * 100).toFixed(1)}%
                            </span>
                          </motion.div>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
                  <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-gray-900">AI 专业建议</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {messages.length === 0 ? (
                          <div className="text-center text-gray-500">
                            <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-full bg-gradient-to-br from-yellow-100 to-green-100 p-2">
                              <img
                                src="/images/corn-avatar.jpeg"
                                alt="玉米诊断助手"
                                className="h-full w-full rounded-full object-cover"
                              />
                            </div>
                            <p className="text-base text-gray-700">我是玉米诊断助手</p>
                            <p className="mt-1 text-sm text-gray-600">上传图片后，我会为您生成诊断分析与建议。</p>
                          </div>
                        ) : (
                          messages.map((message, index) => (
                            <motion.div
                              key={`${message.timestamp}-${index}`}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2, delay: index * 0.05 }}
                            >
                              <MessageBubble
                                message={message}
                                isLoading={message.isStreaming}
                                username={"____FORDIAGNOSIS____"}
                                showSuggestions={false}
                                isLastMessage={index === messages.length - 1}
                              />
                            </motion.div>
                          ))
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </ScrollArea>
          </div>

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/")}
            className="fixed bottom-6 left-6 rounded-full bg-emerald-600 p-3 text-white shadow-lg transition-all duration-150 hover:bg-emerald-700"
            aria-label="返回主页"
          >
            <Home className="h-6 w-6" />
          </motion.button>
        </div>
      </DragDropZone>
    </AuthGuard>
  )
}
