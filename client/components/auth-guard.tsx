"use client"

import type React from "react"
import { useLayoutEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useLayoutEffect(() => {
    const token = document.cookie.split("; ").find(row => row.startsWith("auth_token="))

    if (token) {
      setIsAuthenticated(true)
      setIsLoading(false)
    } else {
      const currentPath = window.location.pathname + window.location.search
      // 用 replace 避免污染历史记录
      router.replace(`/auth/login?returnUrl=${encodeURIComponent(currentPath)}`)
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-sm text-gray-600">正在验证身份...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
