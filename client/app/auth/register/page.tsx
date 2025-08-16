"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

  // 计算字符串的字节长度（UTF-8编码）
  const getByteLength = (str: string): number => {
    return new Blob([str]).size
  }

  // 用户名校验
  const validateUsername = (username: string) => {
    const errors = []

    if (!username.trim()) {
      errors.push("用户名不能为空")
    } else {
      const byteLength = getByteLength(username.trim())
      if (byteLength > 50) {
        errors.push("用户名过长（最多50字节，约16个中文字符或50个英文字符）")
      }
      if (username.trim().length < 2) {
        errors.push("用户名至少需要2个字符")
      }
    }

    return errors
  }

  // 密码校验
  const validatePassword = (password: string) => {
    const errors = []

    if (!password) {
      errors.push("密码不能为空")
      return errors
    }

    if (password.length < 6) {
      errors.push("密码长度至少为6位")
    }

    if (password.length > 20) {
      errors.push("密码长度不能超过20位")
    }

    // 检查是否包含大写字母
    if (!/[A-Z]/.test(password)) {
      errors.push("密码必须包含至少一个大写字母")
    }

    // 检查是否包含小写字母
    if (!/[a-z]/.test(password)) {
      errors.push("密码必须包含至少一个小写字母")
    }

    // 检查是否包含数字
    if (!/[0-9]/.test(password)) {
      errors.push("密码必须包含至少一个数字")
    }

    // 检查是否包含中文字符
    if (/[\u4e00-\u9fa5]/.test(password)) {
      errors.push("密码不能包含中文字符")
    }

    return errors
  }

  // 获取密码强度指示器
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, text: "", color: "" }

    let score = 0
    const checks = [
      /[A-Z]/.test(password), // 大写字母
      /[a-z]/.test(password), // 小写字母
      /[0-9]/.test(password), // 数字
      password.length >= 8, // 长度>=8
      /[!@#$%^&*(),.?":{}|<>]/.test(password), // 特殊字符
    ]

    score = checks.filter(Boolean).length

    if (score <= 2) return { score, text: "弱", color: "text-red-500" }
    if (score <= 3) return { score, text: "中等", color: "text-yellow-500" }
    if (score <= 4) return { score, text: "强", color: "text-green-500" }
    return { score, text: "很强", color: "text-green-600" }
  }

  const usernameErrors = validateUsername(username)
  const passwordErrors = validatePassword(password)
  const passwordStrength = getPasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    // 前端校验
    const allErrors = [...usernameErrors, ...passwordErrors]

    if (!confirmPassword.trim()) {
      allErrors.push("请确认密码")
    } else if (password !== confirmPassword) {
      allErrors.push("两次输入的密码不一致")
    }

    if (allErrors.length > 0) {
      setError(allErrors.join("；"))
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append("username", username.trim())
      formData.append("password", password)

      const response = await fetch(`${API_BASE_URL}/api/user/register`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("注册成功！正在跳转到登录页面...")
        setTimeout(() => {
          router.push("/auth/login")
        }, 2000)
      } else {
        setError(data.message || "注册失败")
      }
    } catch (error) {
      console.error("Register error:", error)
      setError("网络错误，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-br from-yellow-100 to-green-100 p-2">
            <img
              src="/images/corn-avatar.jpeg"
              alt="玉米问答助手"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">注册玉米问答助手</h2>
          <p className="mt-2 text-sm text-gray-600">创建您的账户，开始智能对话</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>用户注册</CardTitle>
            <CardDescription>请填写以下信息创建您的账户</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription className="text-green-600">{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名（2-50字节）"
                  disabled={isLoading}
                  required
                  className={usernameErrors.length > 0 ? "border-red-300 focus:border-red-500" : ""}
                />
                <div className="text-xs text-gray-500">当前长度: {getByteLength(username.trim())} / 50 字节</div>
                {usernameErrors.length > 0 && (
                  <div className="space-y-1">
                    {usernameErrors.map((error, index) => (
                      <div key={index} className="flex items-center gap-1 text-xs text-red-500">
                        <XCircle className="w-3 h-3" />
                        {error}
                      </div>
                    ))}
                  </div>
                )}
                {username && usernameErrors.length === 0 && (
                  <div className="flex items-center gap-1 text-xs text-green-500">
                    <CheckCircle className="w-3 h-3" />
                    用户名格式正确
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码（6-20位，包含大小写字母和数字）"
                  disabled={isLoading}
                  required
                  className={passwordErrors.length > 0 ? "border-red-300 focus:border-red-500" : ""}
                />
                {password && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">长度: {password.length} / 20</span>
                    <span className={`font-medium ${passwordStrength.color}`}>强度: {passwordStrength.text}</span>
                  </div>
                )}
                <div className="space-y-1 text-xs">
                  <div className="text-gray-600 font-medium">密码要求：</div>
                  <div
                    className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? "text-green-500" : "text-gray-400"}`}
                  >
                    {/[A-Z]/.test(password) ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    包含大写字母
                  </div>
                  <div
                    className={`flex items-center gap-1 ${/[a-z]/.test(password) ? "text-green-500" : "text-gray-400"}`}
                  >
                    {/[a-z]/.test(password) ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    包含小写字母
                  </div>
                  <div
                    className={`flex items-center gap-1 ${/[0-9]/.test(password) ? "text-green-500" : "text-gray-400"}`}
                  >
                    {/[0-9]/.test(password) ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    包含数字
                  </div>
                  <div
                    className={`flex items-center gap-1 ${password.length >= 6 && password.length <= 20 ? "text-green-500" : "text-gray-400"}`}
                  >
                    {password.length >= 6 && password.length <= 20 ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    长度6-20位
                  </div>
                  <div
                    className={`flex items-center gap-1 ${!/[\u4e00-\u9fa5]/.test(password) ? "text-green-500" : "text-red-500"}`}
                  >
                    {!/[\u4e00-\u9fa5]/.test(password) ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    不包含中文字符
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                  disabled={isLoading}
                  required
                  className={
                    confirmPassword && password !== confirmPassword ? "border-red-300 focus:border-red-500" : ""
                  }
                />
                {confirmPassword && (
                  <div
                    className={`flex items-center gap-1 text-xs ${password === confirmPassword ? "text-green-500" : "text-red-500"}`}
                  >
                    {password === confirmPassword ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {password === confirmPassword ? "密码匹配" : "密码不匹配"}
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={
                  isLoading || usernameErrors.length > 0 || passwordErrors.length > 0 || password !== confirmPassword
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    注册中...
                  </>
                ) : (
                  "注册"
                )}
              </Button>

              <div className="text-center text-sm text-gray-600">
                已有账户？{" "}
                <Link href="/auth/login" className="text-blue-600 hover:text-blue-500 font-medium">
                  立即登录
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
