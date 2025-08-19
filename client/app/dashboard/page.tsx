'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, User, Lock, ImageUp, Save, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthGuard } from '@/components/auth-guard';

interface UserInfo {
  username: string;
  avatar: string;
}

export default function DashboardPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingPassword, setIsEditingPassword] = useState<boolean>(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingAvatar, setIsChangingAvatar] = useState<boolean>(false);
  const [newAvatar, setNewAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

  // 获取用户信息
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const storedUsername = localStorage.getItem("username");
        if (!storedUsername) {
          setError('未找到用户信息');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/user/info/${storedUsername}`);
        const data = await response.json();

        if (response.ok) {
          setUserInfo({
            username: data.data.username,
            avatar: data.data.avatar || ''
          });
        } else {
          setError(data.message || '获取用户信息失败');
        }
      } catch (err) {
        setError('网络错误，请稍后重试');
        console.error('获取用户信息失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  // 处理密码修改
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('新密码和确认密码不匹配');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('新密码长度至少为6位');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/user/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: userInfo?.username,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('密码修改成功');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setIsEditingPassword(false);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.message || '密码修改失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('密码修改失败:', err);
    }
  };

  // 处理头像上传
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewAvatar(file);
      
      // 创建预览
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 保存头像
  const saveAvatar = async () => {
    if (!newAvatar || !userInfo?.username) {
      setError('请选择头像文件');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('avatar', newAvatar);
      formData.append('username', userInfo.username);

      const response = await fetch(`${API_BASE_URL}/api/user/update-avatar`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('头像更新成功');
        setUserInfo(prev => prev ? { ...prev, avatar: data.avatarUrl } : null);
        setIsChangingAvatar(false);
        setNewAvatar(null);
        setAvatarPreview(null);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.message || '头像更新失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('头像更新失败:', err);
    }
  };

  // 取消头像更改
  const cancelAvatarChange = () => {
    setIsChangingAvatar(false);
    setNewAvatar(null);
    setAvatarPreview(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-2 text-sm text-gray-600">加载用户信息中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={() => window.location.href = '/auth/login'} 
            className="w-full mt-4"
          >
            返回登录页面
          </Button>
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
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Alert variant="default" className="bg-emerald-50 border-emerald-200 text-emerald-800">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 用户头像卡片 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card className="shadow-lg h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  用户头像
                </CardTitle>
                <CardDescription>管理您的个人头像</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative mb-4">
                  <Avatar className="w-32 h-32 ring-2 ring-blue-100">
                    {userInfo?.avatar ? (
                      <AvatarImage 
                        src={userInfo.avatar} 
                        alt="用户头像"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-yellow-100 to-green-100 text-emerald-800 text-2xl">
                        {userInfo?.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  {isChangingAvatar && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                
                {!isChangingAvatar ? (
                  <Button 
                    onClick={() => setIsChangingAvatar(true)}
                    className="w-full"
                  >
                    <ImageUp className="w-4 h-4 mr-2" />
                    更换头像
                  </Button>
                ) : (
                  <div className="w-full space-y-3">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <Input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarUpload}
                        className="hidden"
                        id="avatar-upload"
                      />
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center">
                          <Camera className="w-6 h-6 text-gray-500 mb-2" />
                          <span className="text-sm text-gray-600">点击选择头像文件</span>
                        </div>
                      </Label>
                    </div>
                    
                    {avatarPreview && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 mb-2">预览:</p>
                        <img 
                          src={avatarPreview} 
                          alt="头像预览" 
                          className="w-16 h-16 rounded-full object-cover mx-auto"
                        />
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={saveAvatar}
                        className="flex-1"
                        disabled={!newAvatar}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        保存
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={cancelAvatarChange}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* 用户信息卡片 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-2"
          >
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
                  <div>
                    <Label>用户名</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                      {userInfo?.username}
                    </div>
                  </div>
                  
                  <div>
                    <Label>注册时间</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                      {new Date().toLocaleString('zh-CN')}
                    </div>
                  </div>
                  
                  <div>
                    <Label>账户状态</Label>
                    <div className="mt-1 p-3 bg-green-50 text-green-800 rounded-md">
                      正常
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* 密码修改卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                修改密码
              </CardTitle>
              <CardDescription>更新您的账户密码</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditingPassword ? (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <Label>当前密码</Label>
                    <Input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>新密码</Label>
                    <Input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>确认新密码</Label>
                    <Input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button type="submit" disabled={loading}>
                      {loading ? (
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
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsEditingPassword(false)}
                    >
                      取消
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex justify-end">
                  <Button onClick={() => setIsEditingPassword(true)}>
                    <Lock className="w-4 h-4 mr-2" />
                    修改密码
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 说明卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-8 text-center text-gray-600 text-sm"
        >
          <p>© 2025 玉米智能助手 - 智能农业诊断平台</p>
        </motion.div>
      </div>
    </div>
  </AuthGuard>
  );
}
