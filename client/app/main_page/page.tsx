'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function MainPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col items-center justify-center p-4">
      {/* 背景装饰元素 */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-green-200 opacity-20"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 100 + 20}px`,
              height: `${Math.random() * 100 + 20}px`,
            }}
            animate={{
              y: [0, -20, 0],
              x: [0, Math.random() * 20 - 10, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="max-w-6xl w-full text-center mb-12">
        <motion.h1 
          className="text-4xl md:text-6xl font-bold text-emerald-800 mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={isMounted ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          玉米智诊助手
        </motion.h1>
        <motion.p 
          className="text-lg md:text-xl text-emerald-600 max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          animate={isMounted ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          智能农业诊断与知识问答平台
        </motion.p>
      </div>

      {/* 主要功能区域 */}
      <motion.div 
        className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={isMounted ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        {/* 智能诊断决策 */}
        <Link href="/diagnosis" passHref>
          <motion.div 
            className="bg-white rounded-2xl shadow-xl p-8 cursor-pointer border border-emerald-100 hover:border-emerald-300 transition-all duration-300"
            whileHover={{ scale: 1.03, y: -10 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={isMounted ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <div className="flex flex-col items-center">
              <motion.div 
                className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6"
                whileHover={{ scale: 1.2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </motion.div>
              <h2 className="text-2xl font-bold text-emerald-800 mb-3">智能诊断决策</h2>
              <p className="text-gray-600 text-center mb-4">
                通过图像识别和AI分析，快速诊断玉米病虫害问题
              </p>
              <div className="inline-flex items-center text-emerald-600 font-medium group">
                开始诊断
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </motion.div>
        </Link>

        {/* 知识问答 */}
        <Link href="/qa_page" passHref>
          <motion.div 
            className="bg-white rounded-2xl shadow-xl p-8 cursor-pointer border border-emerald-100 hover:border-emerald-300 transition-all duration-300"
            whileHover={{ scale: 1.03, y: -10 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={isMounted ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            <div className="flex flex-col items-center">
              <motion.div 
                className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6"
                whileHover={{ scale: 1.2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </motion.div>
              <h2 className="text-2xl font-bold text-emerald-800 mb-3">知识问答</h2>
              <p className="text-gray-600 text-center mb-4">
                获取专业的玉米种植知识和解决方案
              </p>
              <div className="inline-flex items-center text-emerald-600 font-medium group">
                提问知识库
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* 底部说明 */}
      <motion.div 
        className="mt-16 text-center text-gray-500 max-w-2xl"
        initial={{ opacity: 0 }}
        animate={isMounted ? { opacity: 1 } : {}}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        <p className="mb-2">© 2025 玉米智诊助手 - 智能农业解决方案</p>
        <p className="text-sm">为现代农业提供专业支持</p>
      </motion.div>
    </div>
  );
}
