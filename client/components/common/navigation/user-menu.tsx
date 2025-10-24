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

  useEffect(() => {
    // 从cookie中获取用户信息
    const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))
    if (token) {
      // 这里应该调用API获取用户详细信息，包括头像
      // 为了简化，我们先从localStorage获取用户名（实际应用中应该从API获取）
      const storedUsername = localStorage.getItem("username")
      setUsername(storedUsername)
      
      // 如果有头像信息，也获取它
      const storedAvatar = localStorage.getItem("user_avatar")
      setAvatar(storedAvatar)
    }
  }, [])

  const handleLogout = () => {
    // 清除所有用户相关的cookie和localStorage
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
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
