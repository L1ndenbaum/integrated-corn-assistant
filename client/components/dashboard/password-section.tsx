"use client";

import { useState } from "react";
import { Loader2, Lock, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordSectionProps {
  onSubmit: (values: PasswordFormValues) => Promise<boolean>;
  isSubmitting: boolean;
}

const INITIAL_FORM: PasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function PasswordSection({ onSubmit, isSubmitting }: PasswordSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState<PasswordFormValues>(INITIAL_FORM);

  const handleChange = (field: keyof PasswordFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = await onSubmit(formValues);
    if (success) {
      setFormValues(INITIAL_FORM);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setFormValues(INITIAL_FORM);
    setIsEditing(false);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          修改密码
        </CardTitle>
        <CardDescription>更新您的账户密码</CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="current-password">当前密码</Label>
              <Input
                id="current-password"
                type="password"
                value={formValues.currentPassword}
                onChange={handleChange("currentPassword")}
                required
              />
            </div>

            <div>
              <Label htmlFor="new-password">新密码</Label>
              <Input id="new-password" type="password" value={formValues.newPassword} onChange={handleChange("newPassword")} required />
            </div>

            <div>
              <Label htmlFor="confirm-password">确认新密码</Label>
              <Input
                id="confirm-password"
                type="password"
                value={formValues.confirmPassword}
                onChange={handleChange("confirmPassword")}
                required
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    修改中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存密码
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                取消
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex justify-end">
            <Button onClick={() => setIsEditing(true)}>
              <Lock className="w-4 h-4 mr-2" />
              修改密码
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
