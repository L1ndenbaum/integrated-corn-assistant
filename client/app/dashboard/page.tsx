"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { AuthGuard } from "@/components/common/auth/auth-guard";
import { UserAvatarSection } from "@/components/dashboard/user-avatar-section";
import { PasswordSection } from "@/components/dashboard/password-section";
import { ProfileInfoCard } from "@/components/dashboard/profile-info-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/hooks/use-user-profile";

export default function DashboardPage() {
  const router = useRouter();
  const { profile, username, isLoadingProfile, error, setError, changePassword, updateAvatar } = useUserProfile();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const clearMessages = useCallback(() => {
    setSuccessMessage(null);
    setError(null);
  }, [setError]);

  const showSuccessMessage = useCallback(
    (message: string) => {
      setSuccessMessage(message);
      setError(null);
      window.setTimeout(() => setSuccessMessage(null), 3000);
    },
    [setError],
  );

  const handlePasswordSubmit = useCallback(
    async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
      if (values.newPassword !== values.confirmPassword) {
        setError("新密码和确认密码不匹配");
        return false;
      }

      if (values.newPassword.length < 6) {
        setError("新密码长度至少为6位");
        return false;
      }

      setIsSubmittingPassword(true);
      try {
        await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
        showSuccessMessage("密码修改成功");
        return true;
      } catch (err) {
        setError((err as Error).message || "密码修改失败");
        return false;
      } finally {
        setIsSubmittingPassword(false);
      }
    },
    [changePassword, setError, showSuccessMessage],
  );

  const handleAvatarSave = useCallback(
    async (file: File) => {
      setIsSavingAvatar(true);
      try {
        await updateAvatar(file);
        showSuccessMessage("头像更新成功");
        return true;
      } catch (err) {
        setError((err as Error).message || "头像更新失败");
        return false;
      } finally {
        setIsSavingAvatar(false);
      }
    },
    [updateAvatar, setError, showSuccessMessage],
  );

  const handleRetry = useCallback(() => {
    clearMessages();
    router.refresh();
  }, [clearMessages, router]);

  const registrationTime = useMemo(() => {
    if (!profile) {
      return undefined;
    }
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  }, [profile]);

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-2 text-sm text-gray-600">加载用户信息中...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex gap-3">
            <Button onClick={() => router.push("/auth/login")} className="flex-1">
              返回登录页面
            </Button>
            <Button variant="outline" onClick={handleRetry} className="flex-1">
              重试
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-emerald-800 mb-2">用户信息中心</h1>
            <p className="text-emerald-600">管理您的个人信息和偏好设置</p>
          </motion.div>

          {successMessage && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <Alert variant="default" className="bg-emerald-50 border-emerald-200 text-emerald-800">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {error && profile && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <UserAvatarSection username={profile?.username ?? username} avatarUrl={profile?.avatar} isSaving={isSavingAvatar} onSave={handleAvatarSave} />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="lg:col-span-2">
              <ProfileInfoCard username={profile?.username ?? username} registrationTimeLabel={registrationTime} />
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}>
            <PasswordSection onSubmit={handlePasswordSubmit} isSubmitting={isSubmittingPassword} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }} className="mt-8 text-center text-gray-600 text-sm">
            <p>© 2025 玉米智能助手 - 智能农业诊断平台</p>
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
}
