"use client";

import { useEffect, useState } from "react";
import { Camera, ImageUp, Save } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserAvatarSectionProps {
  username?: string | null;
  avatarUrl?: string | null;
  isSaving: boolean;
  onSave: (file: File) => Promise<boolean>;
}

const INITIAL_FILE_STATE: [File | null, string | null] = [null, null];

export function UserAvatarSection({ username, avatarUrl, isSaving, onSave }: UserAvatarSectionProps) {
  const [[selectedFile, preview], setFileState] = useState(INITIAL_FILE_STATE);
  const [isEditing, setIsEditing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      setFileState(INITIAL_FILE_STATE);
      return;
    }

    const file = event.target.files[0];
    const previewUrl = URL.createObjectURL(file);

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFileState([file, previewUrl]);
    setLocalError(null);
  };

  const handleSave = async () => {
    if (!selectedFile) {
      setLocalError("请选择头像文件");
      return;
    }

    setLocalError(null);

    const success = await onSave(selectedFile);
    if (success) {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
      setFileState(INITIAL_FILE_STATE);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFileState(INITIAL_FILE_STATE);
    setIsEditing(false);
    setLocalError(null);
  };

  const displayAvatar = preview ?? avatarUrl ?? "";

  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageUp className="w-5 h-5" />
          用户头像
        </CardTitle>
        <CardDescription>管理您的个人头像</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative mb-4">
          <Avatar className="w-32 h-32 ring-2 ring-blue-100">
            {displayAvatar ? (
              <AvatarImage src={displayAvatar} alt="用户头像" className="w-full h-full object-cover rounded-full" />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-yellow-100 to-green-100 text-emerald-800 text-2xl">
                {username?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            )}
          </Avatar>

          {isEditing && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="w-full">
            <ImageUp className="w-4 h-4 mr-2" />
            更换头像
          </Button>
        ) : (
          <div className="w-full space-y-3">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <Input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="avatar-upload" />
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="flex flex-col items-center">
                  <Camera className="w-6 h-6 text-gray-500 mb-2" />
                  <span className="text-sm text-gray-600">点击选择头像文件</span>
                </div>
              </Label>
            </div>

            {preview && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-2">预览:</p>
                <img src={preview} alt="头像预览" className="w-16 h-16 rounded-full object-cover mx-auto" />
              </div>
            )}

            {localError && (
              <Alert variant="destructive">
                <AlertDescription>{localError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1" disabled={isSaving}>
                {isSaving ? (
                  "保存中..."
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                取消
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
