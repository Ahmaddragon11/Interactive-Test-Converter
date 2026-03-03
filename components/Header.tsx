import React, { useState } from 'react';
import { BookOpenIcon, SunIcon, MoonIcon, ShareIcon } from './Icons';

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
        // Silently catch user cancellation
        console.log('Share was cancelled or failed', err);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Hide message after 2 seconds
      } catch (err) {
        console.error('Failed to copy URL:', err);
        alert('لم نتمكن من نسخ الرابط. يرجى نسخه يدويًا.');
      }
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <BookOpenIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mr-3">
              محول الاختبارات التفاعلي المتقدم
            </h1>
          </div>
          <div className="flex items-center gap-2">
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
