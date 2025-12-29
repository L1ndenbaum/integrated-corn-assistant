"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import Link from "next/link"

type LoginMethod = "username" | "email" | "phone"

export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("username")
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

  const resolveLoginRequest = (value: string) => {
    if (loginMethod === "email") {
      return {
        path: "/api/v1/auth/login/email",
        payload: { email: value },
      }
    }

    if (loginMethod === "phone") {
      return {
        path: "/api/v1/auth/login/phone",
        payload: { phone: value },
      }
    }

    return {
      path: "/api/v1/auth/login/username",
      payload: { username: value },
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!identifier.trim() || !password.trim()) {
      setError("请输入用户名/邮箱/手机号和密码")
      return
    }

    if (loginMethod !== "username") {
      setError("当前仅支持用户名登录")
      return
    }

    setIsLoading(true)

    try {
      const login = resolveLoginRequest(identifier.trim())
      const response = await fetch(`${API_BASE_URL}${login.path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...login.payload,
          password: password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const resolvedUsername =
          data?.user?.username || data?.username || identifier.trim()

        localStorage.setItem("username", resolvedUsername)
        
        // 获取返回URL，如果没有则默认跳转到主页
        const returnUrl = new URLSearchParams(window.location.search).get("returnUrl") || "/"
        router.push(returnUrl)
      } else {
        setError(data.message || "登录失败")
      }
    } catch (error) {
      console.error("Login error:", error)
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
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">登录到玉米智能助手</h2>
          <p className="mt-2 text-sm text-gray-600">开始与玉米问答助手的智能对话</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>用户登录</CardTitle>
            <CardDescription>请输入您的用户名和密码</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="loginMethod">登录方式</Label>
                <Select value={loginMethod} onValueChange={(value) => setLoginMethod(value as LoginMethod)}>
                  <SelectTrigger id="loginMethod">
                    <SelectValue placeholder="请选择登录方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="username">用户名登录</SelectItem>
                    <SelectItem value="email">邮箱登录（暂未开放）</SelectItem>
                    <SelectItem value="phone">手机登录（暂未开放）</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="identifier">
                  {loginMethod === "email" ? "邮箱" : loginMethod === "phone" ? "手机号" : "用户名"}
                </Label>
                <Input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    loginMethod === "email"
                      ? "请输入邮箱"
                      : loginMethod === "phone"
                        ? "请输入手机号"
                        : "请输入用户名"
                  }
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  disabled={isLoading}
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  "登录"
                )}
              </Button>

              <div className="text-center text-sm text-gray-600">
                还没有账户？{" "}
                <Link href="/auth/register" className="text-blue-600 hover:text-blue-500 font-medium">
                  立即注册
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
