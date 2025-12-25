"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut } from "lucide-react"

export function UserMenu() {
  const [username, setUsername] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  const router = useRouter()
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ""

  useEffect(() => {
    let isActive = true
    const storedUsername = localStorage.getItem("username")
    const storedAvatar = localStorage.getItem("user_avatar")

    if (storedUsername) {
      setUsername(storedUsername)
    }
    if (storedAvatar) {
      setAvatar(storedAvatar)
    }

    const loadSession = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/auth/session`, {
          credentials: "include",
        })

        if (!isActive) {
          return
        }

        if (response.ok) {
          const data = await response.json().catch(() => null)
          const resolvedUsername = data?.user?.username || storedUsername
          const resolvedAvatar = data?.user?.avatar_path || storedAvatar

          if (resolvedUsername) {
            localStorage.setItem("username", resolvedUsername)
            setUsername(resolvedUsername)
          }

          if (resolvedAvatar) {
            localStorage.setItem("user_avatar", resolvedAvatar)
            setAvatar(resolvedAvatar)
          }
          return
        }
      } catch (error) {
        if (!isActive) {
          return
        }
      }

      setUsername(null)
      setAvatar(null)
    }

    loadSession()

    return () => {
      isActive = false
    }
  }, [apiBaseUrl])

  const handleLogout = () => {
    // 清除所有用户相关的localStorage
    localStorage.removeItem("username")
    localStorage.removeItem("user_avatar")
    router.push("/auth/login")
  }

  if (!username) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            {avatar ? (
              <AvatarImage src={avatar} alt="用户头像" />
            ) : (
              <AvatarFallback className="bg-blue-100 text-blue-600">{username.charAt(0).toUpperCase()}</AvatarFallback>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{username}</p>
            <p className="text-xs leading-none text-muted-foreground">用户</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
