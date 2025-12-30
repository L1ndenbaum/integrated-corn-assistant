"use client"

import { useEffect } from "react"

const isAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_AUTH_GUARD !== "false"
const refreshIntervalMs = 10 * 60 * 1000

export function TokenRefresher() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ""

  useEffect(() => {
    if (!isAuthEnabled) {
      return
    }

    let isActive = true

    const refresh = async () => {
      try {
        await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
          method: "POST",
          credentials: "include",
        })
      } catch (error) {
        if (!isActive) {
          return
        }
      }
    }

    const tick = () => {
      if (!isActive) {
        return
      }
      if (!localStorage.getItem("username")) {
        return
      }
      refresh()
    }

    tick()
    const timer = window.setInterval(tick, refreshIntervalMs)

    return () => {
      isActive = false
      window.clearInterval(timer)
    }
  }, [apiBaseUrl])

  return null
}
