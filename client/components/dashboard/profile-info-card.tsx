"use client";

import { ReactNode, useMemo } from "react";
import { User } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface InfoRow {
  label: string;
  value: ReactNode;
  accent?: "muted" | "success";
}

interface ProfileInfoCardProps {
  username?: string | null;
  registrationTimeLabel?: string;
  statusText?: string;
}

export function ProfileInfoCard({ username, registrationTimeLabel, statusText = "正常" }: ProfileInfoCardProps) {
  const formattedRegistration = useMemo(() => {
    if (registrationTimeLabel) {
      return registrationTimeLabel;
    }
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  }, [registrationTimeLabel]);

  const rows: InfoRow[] = [
    { label: "用户名", value: username ?? "-" },
    { label: "注册时间", value: formattedRegistration, accent: "muted" },
    { label: "账户状态", value: statusText, accent: "success" },
  ];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          用户信息
        </CardTitle>
        <CardDescription>您的基本信息</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.label}>
              <Label>{row.label}</Label>
              <div
                className={`mt-1 p-3 rounded-md ${
                  row.accent === "success"
                    ? "bg-green-50 text-green-800"
                    : row.accent === "muted"
                    ? "bg-gray-50 text-gray-700"
                    : "bg-gray-50"
                }`}
              >
                {row.value}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
