import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { UploadCloudIcon } from './Icons';

interface PdfUploaderProps {
  onPdfUpload: (file: File) => void;
  disabled: boolean;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({ onPdfUpload, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onPdfUpload(e.target.files[0]);
    }
  };

  const handleDragEvents = useCallback((e: React.DragEvent<HTMLDivElement>, dragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(dragging);
  }, [disabled]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        if (e.dataTransfer.files[0].type === "application/pdf") {
            onPdfUpload(e.dataTransfer.files[0]);
        }
    }
  }, [handleDragEvents, onPdfUpload]);

  return (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        onDragEnter={(e: any) => handleDragEvents(e, true)}
        onDragLeave={(e: any) => handleDragEvents(e, false)}
        onDragOver={(e: any) => handleDragEvents(e, true)}
        onDrop={handleDrop}
        className={`relative block w-full border-2 ${isDragging ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-gray-700' : 'border-gray-300 dark:border-gray-600'} border-dashed rounded-lg p-12 text-center transition-colors duration-300 ${disabled ? 'cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer'}`}
    >
        <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
        <span className="mt-4 block text-lg font-medium text-gray-900 dark:text-gray-100">
        اسحب وأفلت ملف PDF هنا
        </span>
        <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">
        أو انقر لاختيار ملف
        </span>
        <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileChange}
        accept="application/pdf"
        disabled={disabled}
        />
    </motion.div>
  );
};
