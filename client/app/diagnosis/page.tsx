"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, MapPin, Cloud, Upload, Send, Home, RotateCcw, CheckCircle, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { ImageUploadDiagnosis } from "@/components/image-upload-diagnosis"
import { MessageBubble } from "@/components/message-bubble"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"

interface WeatherData {
  location: string // x市, x省
  temperature: string // 温度 单位摄氏度
  weather: string // 天气现象 汉字描述
  humidity: string // 空气湿度
  wind: string // 风向 x级
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
  const [input, setInput] = useState("")
  const [location, setLocation] = useState<string>("")
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false)
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false)
  const [diagnosisResults, setDiagnosisResults] = useState<DiagnosisResult[]>([])
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.9042, 116.4074])
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getLocation = () => {
    setIsLoadingLocation(true)
    setError(null)

    fetch("/api/geo/location")
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          const lat = Number.parseFloat(data.city)
          const lon = Number.parseFloat(data.rectangle)

          setLocation(`${lat.toFixed(4)}, ${lon.toFixed(4)}`)
          setMapCenter([lat, lon])
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
  }

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
          wind: liveWeather.wind
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
  
  // 处理推荐问题选择
  const handleQuestionSelect = (question: string) => {
    setInput(question)
    // 可以选择自动发送或让用户确认
    // sendMessageWithText(question)
  }

  const handleFileUpload = (files: File[]) => {
    if (files.length > 0) {
      setUploadedFiles([files[files.length - 1]]) // 只保留最后选择的
    }
  }


  const handleRemoveFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(newFiles)
  }

  const startDiagnosis = async () => {
    if (uploadedFiles.length === 0) {
      setError("请上传至少一张玉米图片")
      return
    }

    setIsDiagnosing(true)
    setError(null)

    try {
      const formData = new FormData()
      uploadedFiles.forEach((file) => {
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
        weather ? 
          `- 位置：${weather.location}
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
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: diagnosisContext,
          username: "____FORDIAGNOSIS____"
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

          // 检查并提取messageId，但不将其添加到显示内容中
          if (chunk.includes("[MESSAGE_ID:")) {
            const match = chunk.match(/\[MESSAGE_ID:([^\]]+)\]/)
            if (match) {
              // 从chunk中移除MESSAGE_ID标记，避免显示在消息内容中
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100">
        <div className="flex h-screen">
          <div className="w-full lg:w-1/2 p-4 md:p-8 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-emerald-800 mb-2">玉米病虫害诊断</h1>
                <p className="text-emerald-600">上传玉米图片，获取专业的病虫害诊断结果</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card className="shadow-lg border-emerald-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm text-emerald-800">
                        <MapPin className="w-4 h-4" />
                        位置信息
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {isLoadingLocation ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                          <span className="ml-2 text-sm text-emerald-700">获取位置中...</span>
                        </div>
                      ) : weather ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-emerald-600">地点:</span>
                            <span className="font-medium text-emerald-800">{weather.location}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-emerald-500 text-center py-4 text-sm">位置信息获取中...</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card className="shadow-lg border-emerald-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm text-emerald-800">
                        <Cloud className="w-4 h-4" />
                        天气信息
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {isLoadingWeather ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                          <span className="ml-2 text-sm text-emerald-700">获取天气中...</span>
                        </div>
                      ) : weather ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-emerald-600">温度:</span>
                            <span className="font-medium text-emerald-800">{weather.temperature}°C</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-emerald-600">天气状况:</span>
                            <span className="font-medium text-emerald-800">{weather.weather}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-emerald-600">湿度:</span>
                            <span className="font-medium text-emerald-800">{weather.humidity}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-emerald-600">风向和风速:</span>
                            <span className="font-medium text-emerald-800">{weather.wind}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-emerald-500 text-center py-4 text-sm">天气信息获取中...</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card className="shadow-lg border-emerald-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-emerald-800">
                      <Upload className="w-5 h-5" />
                      图片诊断
                    </CardTitle>
                    <CardDescription className="text-emerald-600">上传玉米图片进行病虫害诊断</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {error && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-6">
                      <div>
                        <Label className="mb-2 block text-emerald-800">选择玉米图片</Label>
                        <ImageUploadDiagnosis
                          onUpload={handleFileUpload}
                          uploadedFiles={uploadedFiles}
                          onRemoveFile={handleRemoveFile}
                        />
                      </div>

                      <div className="flex gap-3">
                        {!hasStartedDiagnosis ? (
                          <Button
                            onClick={startDiagnosis}
                            disabled={isDiagnosing || uploadedFiles.length === 0}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                          >
                            {isDiagnosing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                诊断中...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                开始诊断
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={continueDiagnosis}
                            variant="outline"
                            className="flex items-center gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-transparent"
                          >
                            <RotateCcw className="w-4 h-4" />
                            继续诊断
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>

          <div className="hidden lg:flex lg:w-1/2 flex-col bg-gradient-to-br from-emerald-50 to-green-100 border-l border-emerald-200">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-4 flex items-center justify-between round-lg"
            >
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold">诊断建议</h1>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex-1 overflow-hidden"
            >
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {diagnosisResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="space-y-3"
                    >
                      <h3 className="font-semibold text-emerald-800 border-b border-emerald-200 pb-2">图片诊断结果</h3>
                      {diagnosisResults.map((result, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="bg-white rounded-lg p-4 border border-emerald-200 shadow-sm"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-emerald-800 text-sm truncate flex-1">{result.filename}</h4>
                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded ml-2">
                              {(result.confidence * 100).toFixed(1)}%
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {result.predicted_class === "健康" ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-orange-500" />
                            )}
                            <span className="font-semibold text-emerald-700">{result.predicted_class}</span>
                          </div>
                        </motion.div>
                      ))}

                      <div className="border-t border-emerald-200 pt-4">
                        <h3 className="font-semibold text-emerald-800 mb-3">AI 专业建议</h3>
                      </div>
                    </motion.div>
                  )}

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
                              alt="玉米智能助手"
                              className="w-full h-full object-cover rounded-full"
                            />
                          </div>
                          <p className="text-lg mb-2 text-gray-700">我是玉米诊断助手</p>
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
                              username={"____FORDIAGNOSIS____"}
                              onQuestionSelect={handleQuestionSelect}
                              showSuggestions={false}
                              isLastMessage={index === messages.length - 1}
                            />
                          </motion.div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </motion.div>
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </motion.div>
          </div>
        </div>

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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="fixed bottom-4 right-4 text-center text-gray-600 text-xs bg-white/80 backdrop-blur-sm rounded-lg p-2 shadow-sm"
        >
          <p>© 2025 玉米智能助手</p>
          <p className="mt-1">准确率基于深度学习模型，仅供参考</p>
        </motion.div>
      </div>
    </AuthGuard>
  )
}
