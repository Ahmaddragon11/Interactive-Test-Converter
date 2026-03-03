import React, { useState } from 'react';
import { BookOpenIcon, SunIcon, MoonIcon, ShareIcon, SettingsIcon } from './Icons';
import { motion } from 'motion/react';

interface HeaderProps {
    theme: string;
    setTheme: (theme: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, setTheme }) => {
  const [copied, setCopied] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleShare = async () => {
    const shareData = {
      title: 'محول الاختبارات التفاعلي المتقدم',
      text: 'حوّل اختباراتك إلى تجارب تفاعلية ذكية باستخدام الذكاء الاصطناعي!',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share was cancelled or failed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy URL:', err);
        alert('لم نتمكن من نسخ الرابط. يرجى نسخه يدويًا.');
      }
    }
  };

  const handleOpenSettings = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
    } else {
        alert('ميزة إعدادات API غير مدعومة حاليًا.');
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <motion.div
                whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
            >
                <BookOpenIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </motion.div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mr-3">
              محول الاختبارات التفاعلي المتقدم
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
                whileHover={{ rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleOpenSettings}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                title="إعدادات API"
            >
                <SettingsIcon className="w-6 h-6" />
            </motion.button>
            <div className="relative">
                <button
                    onClick={handleShare}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                    title="مشاركة التطبيق"
                >
                    <ShareIcon className="w-6 h-6" />
                </button>
                 {copied && (
                    <div className="absolute bottom-full mb-2 right-1/2 translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md shadow-lg whitespace-nowrap transition-opacity duration-300"
                         role="status">
                        تم نسخ الرابط!
                    </div>
                )}
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
              title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            >
              {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
