"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Upload } from "lucide-react"

interface DragDropZoneProps {
  onFilesDropped: (files: File[]) => void
  children: React.ReactNode
  disabled?: boolean
}

export function DragDropZone({ onFilesDropped, children, disabled = false }: DragDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const dragCounterRef = useRef(0)

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return

      dragCounterRef.current++

      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragOver(true)
        setIsDragActive(true)
      }
    },
    [disabled],
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return

      dragCounterRef.current--

      if (dragCounterRef.current === 0) {
        setIsDragOver(false)
        setIsDragActive(false)
      }
    },
    [disabled],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return

      // 设置拖拽效果
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy"
      }
    },
    [disabled],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return

      setIsDragOver(false)
      setIsDragActive(false)
      dragCounterRef.current = 0

      const files = Array.from(e.dataTransfer?.files || [])
      const imageFiles = files.filter((file) => file.type.startsWith("image/"))

      if (imageFiles.length > 0) {
        onFilesDropped(imageFiles)
      }
    },
    [disabled, onFilesDropped],
  )

  return (
    <div
      className="relative w-full h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* 拖拽覆盖层 */}
      {isDragActive && (
        <div className="fixed inset-0 z-50 bg-blue-500 bg-opacity-10 backdrop-blur-sm">
          <div className="flex items-center justify-center h-full">
            <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-dashed border-blue-400 max-w-md mx-4">
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">拖拽文件到这里上传</h3>
                <p className="text-sm text-gray-600">支持图片格式：JPG、PNG、GIF、WebP</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
