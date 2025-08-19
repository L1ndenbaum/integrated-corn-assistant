"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, ImageIcon, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ImageUploadDiagnosisProps {
  onUpload: (files: File[]) => void
  disabled?: boolean
  multiple?: boolean
  maxFiles?: number
  uploadedFiles?: File[]
  onRemoveFile?: (index: number) => void
}

export function ImageUploadDiagnosis({
  onUpload,
  disabled = false,
  multiple = true,
  maxFiles = 10,
  uploadedFiles = [],
  onRemoveFile,
}: ImageUploadDiagnosisProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  const handleFiles = (files: FileList | null) => {
    if (!files) return

    const validFiles: File[] = []
    const maxSize = 10 * 1024 * 1024 // 10MB
    const newPreviewUrls: string[] = []

    for (let i = 0; i < files.length && validFiles.length < maxFiles; i++) {
      const file = files[i]

      // Check file type
      if (!file.type.startsWith("image/")) {
        continue
      }

      // Check file size
      if (file.size > maxSize) {
        continue
      }

      validFiles.push(file)
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      newPreviewUrls.push(previewUrl)
    }

    if (validFiles.length > 0) {
      setPreviewUrls((prev) => [...prev, ...newPreviewUrls])
      onUpload([...uploadedFiles, ...validFiles])
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled) return

    const files = e.dataTransfer.files
    handleFiles(files)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const removeFile = (index: number) => {
    // Revoke the preview URL to free memory
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index])
    }

    const newPreviewUrls = previewUrls.filter((_, i) => i !== index)
    setPreviewUrls(newPreviewUrls)

    if (onRemoveFile) {
      onRemoveFile(index)
    }
  }

  return (
    <div className="w-full space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
          ${dragActive ? "border-emerald-400 bg-emerald-50" : "border-gray-300 hover:border-emerald-400"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-emerald-50"}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-emerald-600" />
          </div>

          <div>
            <p className="text-sm font-medium text-emerald-700">点击上传或拖拽图片到此处</p>
            <p className="text-xs text-emerald-600 mt-1">支持 JPG、PNG 格式，单张图片不超过10MB</p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="mt-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-transparent"
            onClick={(e) => {
              e.stopPropagation()
              openFileDialog()
            }}
          >
            <Upload className="w-4 h-4 mr-2" />
            选择文件
          </Button>
        </div>
      </div>

      {/* Image Previews */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h3 className="font-medium text-emerald-800">已选择的图片 ({uploadedFiles.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {uploadedFiles.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="relative group"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-emerald-200">
                    {previewUrls[index] ? (
                      <img
                        src={previewUrls[index] || "/placeholder.svg"}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* File name */}
                  <p className="mt-1 text-xs text-emerald-700 truncate text-center">{file.name}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
