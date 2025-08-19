'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MapPin, Cloud, Upload, Send, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { ImageUpload } from '@/components/image-upload';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { useRouter } from "next/navigation";
import { AuthGuard } from '@/components/auth-guard';

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
}

interface DiagnosisResult {
  filename: string;
  predictedClass: string;
  confidence: number;
  classId: number;
}

export default function DiagnosisPage() {
  const [location, setLocation] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false);
  const [diagnosisResults, setDiagnosisResults] = useState<DiagnosisResult[]>([]);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.9042, 116.4074]); // 默认北京坐标
  const [suggestion, setSuggestion] = useState<string>('');
  const router = useRouter();

  // 获取用户地理位置
  const getLocation = () => {
    setIsLoadingLocation(true);
    setError(null);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setLocation(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
          setMapCenter([lat, lon]);
          setIsLoadingLocation(false);
          
          // 获取天气信息
          getWeatherInfo(lat, lon);
        },
        (err) => {
          setIsLoadingLocation(false);
          setError('无法获取您的位置信息，请手动输入位置或允许位置权限');
          console.error('获取位置失败:', err);
        }
      );
    } else {
      setIsLoadingLocation(false);
      setError('浏览器不支持地理位置服务');
    }
  };

  // 获取天气信息（使用高德API）
  const getWeatherInfo = async (lat: number, lon: number) => {
    setIsLoadingWeather(true);
    
    try {
      // 使用高德天气API获取天气信息
      const API_KEY = process.env.NEXT_PUBLIC_AMAP_API_KEY || 'YOUR_AMAP_API_KEY';
      const url = `https://restapi.amap.com/v3/weather/weatherInfo?location=${lon},${lat}&key=${API_KEY}&extensions=base`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === '1' && data.lives && data.lives.length > 0) {
        const liveWeather = data.lives[0];
        const weatherData: WeatherData = {
          location: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
          temperature: parseInt(liveWeather.temperature),
          condition: liveWeather.weather,
          humidity: parseInt(liveWeather.humidity),
          windSpeed: parseInt(liveWeather.windpower) || 0,
        };
        
        setWeather(weatherData);
      } else {
        throw new Error('天气信息获取失败');
      }
      
      setIsLoadingWeather(false);
    } catch (err) {
      setIsLoadingWeather(false);
      setError('获取天气信息失败: ' + (err as Error).message);
      console.error('获取天气信息失败:', err);
      // 直接抛出错误，不使用mock数据
      throw err;
    }
  };

  // 处理文件上传
  const handleFileUpload = (files: File[]) => {
    setUploadedFiles(files);
  };

  // 开始诊断
  const startDiagnosis = async () => {
    if (uploadedFiles.length === 0) {
      setError('请上传至少一张玉米图片');
      return;
    }

    setIsDiagnosing(true);
    setError(null);
    
    try {
      // 创建FormData对象
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('files', file);
      });

      // 调用诊断API
      const diagnosisResponse = await fetch('/api/diagnosis', {
        method: 'POST',
        body: formData,
      });
      
      if (!diagnosisResponse.ok) {
        throw new Error('诊断请求失败');
      }
      
      const diagnosisData = await diagnosisResponse.json();
      
      // 保存诊断结果
      setDiagnosisResults(diagnosisData.results);
      
      // 调用建议API获取诊断建议
      const suggestionResponse = await fetch('/api/diagnosis/suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          results: diagnosisData.results
        })
      });
      
      if (!suggestionResponse.ok) {
        throw new Error('获取诊断建议失败');
      }
      
      const suggestionData = await suggestionResponse.json();
      
      // 将建议保存到状态中
      setSuggestion(suggestionData.suggestion);
      
      setIsDiagnosing(false);
    } catch (err) {
      setIsDiagnosing(false);
      setError('诊断过程中出现错误，请重试: ' + (err as Error).message);
      console.error('诊断失败:', err);
    }
  };

  // 清除诊断结果
  const clearResults = () => {
    setDiagnosisResults([]);
    setUploadedFiles([]);
  };

  return (

  <AuthGuard>
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-emerald-800 mb-2">玉米病虫害诊断</h1>
          <p className="text-emerald-600">上传玉米图片，获取专业的病虫害诊断结果</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 地理位置和天气卡片 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  位置信息
                </CardTitle>
                <CardDescription>获取您的当前位置并查询天气</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={getLocation} 
                    disabled={isLoadingLocation}
                    className="flex items-center gap-2"
                  >
                    {isLoadingLocation ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        获取位置中...
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" />
                        获取当前位置
                      </>
                    )}
                  </Button>
                  <Input 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="手动输入经纬度 (纬度,经度)"
                    className="flex-1"
                  />
                </div>
                
                {location && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">当前位置:</p>
                    <p className="font-mono">{location}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 天气信息卡片 */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="w-5 h-5" />
                  天气信息
                </CardTitle>
                <CardDescription>基于您的位置获取的天气状况</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingWeather ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="ml-2">获取天气信息中...</span>
                  </div>
                ) : weather ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">地点:</span>
                      <span className="font-medium">{weather.location}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">温度:</span>
                      <span className="font-medium">{weather.temperature}°C</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">天气状况:</span>
                      <span className="font-medium">{weather.condition}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">湿度:</span>
                      <span className="font-medium">{weather.humidity}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">风速:</span>
                      <span className="font-medium">{weather.windSpeed} m/s</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">点击获取位置以查看天气</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* 地图展示区域 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-6"
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>位置地图</CardTitle>
                <CardDescription>您在这里↓</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative h-64 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg overflow-hidden border-2 border-dashed border-emerald-200 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                      <p className="text-emerald-700 font-medium">地图展示区域</p>
                      <p className="text-sm text-emerald-600">位置: {location || '未获取'}</p>
                    </div>
                  </div>
                  
                  {/* 模拟地图标记 */}
                  <div 
                    className="absolute w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* 图片上传和诊断区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mb-8"
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                图片诊断
              </CardTitle>
              <CardDescription>上传玉米图片进行病虫害诊断</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-6">
                <div>
                  <Label className="mb-2 block">选择玉米图片</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <ImageUpload onUpload={handleFileUpload} />
                    <p className="mt-2 text-sm text-gray-500">
                      支持 JPG、PNG 格式，单张图片不超过10MB
                    </p>
                  </div>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium">已选择的图片 ({uploadedFiles.length})</h3>
                    <div className="flex flex-wrap gap-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-100 rounded px-3 py-1">
                          <span className="text-sm truncate max-w-32">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button 
                    onClick={startDiagnosis} 
                    disabled={isDiagnosing || uploadedFiles.length === 0}
                    className="flex items-center gap-2"
                  >
                    {isDiagnosing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        诊断中...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        开始诊断
                      </>
                    )}
                  </Button>
                  
                  {diagnosisResults.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={clearResults}
                    >
                      清除结果
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 诊断结果区域 */}
        {diagnosisResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mb-8"
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>诊断结果</CardTitle>
                <CardDescription>分析结果和建议</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {diagnosisResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{result.filename}</h4>
                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded">
                          置信度: {(result.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">诊断结果:</p>
                          <p className="font-medium">{result.predictedClass}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">疾病类型:</p>
                          <p className="font-medium">
                            {result.predictedClass === '健康' ? '无病害' : 
                             result.predictedClass === '锈病' ? '锈病' :
                             result.predictedClass === '叶斑病' ? '叶斑病' : '纹枯病'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">建议措施:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
                          {result.predictedClass === '健康' ? (
                            <li>当前作物健康状况良好，继续保持良好的田间管理</li>
                          ) : result.predictedClass === '锈病' ? (
                            <li>及时喷洒杀菌剂，加强田间通风透光</li>
                          ) : result.predictedClass === '叶斑病' ? (
                            <li>清除病叶，使用合适的杀菌剂进行防治</li>
                          ) : (
                            <li>注意排水，避免积水，及时用药防治</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 诊断建议区域 */}
        {suggestion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="mb-8"
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>诊断建议</CardTitle>
                <CardDescription>基于诊断结果的专业建议</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <MarkdownRenderer content={suggestion} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 说明卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="text-center text-gray-600 text-sm"
        >
          <p>© 2025 玉米智诊助手 - 智能农业诊断平台</p>
          <p className="mt-1">准确率基于机器学习模型，仅供参考</p>
        </motion.div>
      </div>
      
      {/* 返回主页按钮 */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => router.push("/")}
        className="fixed bottom-6 left-6 bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-full shadow-lg z-10 active:scale-95 transition-all duration-150"
        aria-label="返回主页"
      >
        <Home className="w-6 h-6" />
      </motion.button>
    </div>
  </AuthGuard>
  );
}
