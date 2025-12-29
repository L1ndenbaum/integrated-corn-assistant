"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, LogOut } from "lucide-react"

export function UserAuthButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [avatar, setAvatar] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ""

  useEffect(() => {
    let isActive = true

    const storedAvatar = localStorage.getItem("user_avatar")
    if (storedAvatar) {
      setAvatar(storedAvatar)
    }

    const loadSession = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/user/profile`, {
          credentials: "include",
        })

        if (!isActive) {
          return
        }

        if (response.ok) {
          const data = await response.json().catch(() => null)
          const username = data?.user?.username || localStorage.getItem("username")

          if (username) {
            localStorage.setItem("username", username)
          }
          if (storedAvatar) {
            setAvatar(storedAvatar)
          } else {
            setAvatar("/placeholder-user.jpg")
          }

          setIsLoggedIn(true)
          return
        }
      } catch (error) {
        if (!isActive) {
          return
        }
      }

      setIsLoggedIn(false)
    }

    loadSession()

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      isActive = false
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [apiBaseUrl])

  const handleDashboardNavigate = () => {
    setShowDropdown(false)
    router.push("/dashboard")
  }

  const handleLogout = () => {
    localStorage.removeItem("username")
    localStorage.removeItem("user_avatar")
    setIsLoggedIn(false)
    setShowDropdown(false)
    router.replace("/")
    router.refresh()
  }

  if (!isLoggedIn) {
    return (
      <Button
        onClick={() => router.push("/auth/login")}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
      >
        登录
      </Button>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-10 w-10 rounded-full p-0"
            onClick={() => setShowDropdown((prev) => !prev)}
          >
            <Avatar className="h-10 w-10">
              {avatar ? (
                <AvatarImage src={avatar} alt="用户头像" className="w-full h-full object-cover rounded-full" />
              ) : (
                <AvatarFallback className="bg-blue-100 text-blue-600">U</AvatarFallback>
              )}
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
            >
              <DropdownMenuContent className="w-56" align="end" forceMount onCloseAutoFocus={(e) => e.preventDefault()}>
                <DropdownMenuItem className="cursor-pointer" onClick={handleDashboardNavigate}>
                  <User className="mr-2 h-4 w-4" />
                  <span>查看个人信息</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </motion.div>
          )}
        </AnimatePresence>
      </DropdownMenu>
    </div>
  )
}
