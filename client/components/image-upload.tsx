"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ImageIcon, Loader2 } from "lucide-react"

interface ImageUploadProps {
  onUpload: (files: File[], fileIds: string[]) => void
  disabled?: boolean
}

export function ImageUpload({ onUpload, disabled = false }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const imageFiles = files.filter((file) => file.type.startsWith("image/"))
    const username: string = localStorage.getItem("username") as string
    if (imageFiles.length === 0) return

    setIsUploading(true)

    try {
      // 创建FormData并上传文件
      const formData = new FormData()
      imageFiles.forEach((file) => {
        formData.append("files", file)
      })
      formData.append("username", username)
      const response = await fetch(`${API_BASE_URL}/api/file/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      const result = await response.json()
      const fileIds = result.file_ids || []

      // 调用onUpload回调，传递files和fileIds
      onUpload(imageFiles, fileIds)
    } catch (error) {
      console.error("File upload error:", error)
      // 上传失败时传递空的fileIds数组
      onUpload(imageFiles, [])
    } finally {
      setIsUploading(false)
    }

    // 清空input值，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className="p-2 h-auto hover:bg-blue-50 active:scale-90 transition-all duration-150"
        disabled={disabled || isUploading}
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
        ) : (
          <ImageIcon className="w-5 h-5 text-gray-500" />
        )}
      </Button>
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
    </>
  )
}
