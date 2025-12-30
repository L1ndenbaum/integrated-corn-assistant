import { useCallback, useEffect, useState } from "react";
import { useStoredUsername } from "./use-stored-username";

export interface UserProfile {
  username: string;
  avatarUrl: string;
}

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export function useUserProfile() {
  const username = useStoredUsername();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/user/profile`, {
          credentials: "include",
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || data.message || "获取用户信息失败");
        }

        if (!isCancelled) {
          const user = data.user ?? {};
          setProfile({
            username: user.username || "",
            avatarUrl: user.avatar_url || "",
          });
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("获取用户信息失败:", err);
          setError((err as Error).message || "获取用户信息失败");
          setProfile(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProfile(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isCancelled = true;
    };
  }, []);

  const changePassword = useCallback(
    async ({ currentPassword, newPassword }: ChangePasswordPayload) => {
      const response = await fetch(`${API_BASE_URL}/api/v1/user/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "密码修改失败");
      }
    },
    [],
  );

  const updateAvatar = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch(`${API_BASE_URL}/api/v1/user/avatar`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "头像更新失败");
      }

      const avatarUrl = data.avatar_url || "";
      setProfile((prev) => (prev ? { ...prev, avatarUrl: avatarUrl || prev.avatarUrl } : prev));
    },
    [],
  );

  return {
    profile,
    username: username ?? null,
    isLoadingProfile,
    error,
    setError,
    changePassword,
    updateAvatar,
  };
}
