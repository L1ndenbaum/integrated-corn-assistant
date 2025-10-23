import { useCallback, useEffect, useState } from "react";
import { useStoredUsername } from "./use-stored-username";

export interface UserProfile {
  username: string;
  avatar: string;
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
    if (username === undefined) {
      return;
    }

    if (!username) {
      setProfile(null);
      setError("未找到用户信息");
      setIsLoadingProfile(false);
      return;
    }

    let isCancelled = false;
    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/user/info/${username}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "获取用户信息失败");
        }

        if (!isCancelled) {
          setProfile({
            username: data.data.username,
            avatar: data.data.avatar || "",
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
  }, [username]);

  const changePassword = useCallback(
    async ({ currentPassword, newPassword }: ChangePasswordPayload) => {
      if (!username) {
        throw new Error("未找到用户信息");
      }

      const response = await fetch(`${API_BASE_URL}/api/user/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "密码修改失败");
      }
    },
    [username],
  );

  const updateAvatar = useCallback(
    async (file: File) => {
      if (!username) {
        throw new Error("未找到用户信息");
      }

      const formData = new FormData();
      formData.append("avatar", file);
      formData.append("username", username);

      const response = await fetch(`${API_BASE_URL}/api/user/update-avatar`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "头像更新失败");
      }

      setProfile((prev) => (prev ? { ...prev, avatar: data.avatarUrl || prev.avatar } : prev));
    },
    [username],
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
