import React from 'react';
import { motion } from 'motion/react';
import { LoaderIcon, CheckCircleIcon } from './Icons';

interface MultiStepLoaderProps {
    steps: string[];
    currentStep: number;
}

export const MultiStepLoader: React.FC<MultiStepLoaderProps> = ({ steps, currentStep }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-900 bg-opacity-75 flex flex-col items-center justify-center z-50 p-4" 
      role="status" 
      aria-live="polite"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md"
      >
        <h2 className="text-xl font-bold text-center text-gray-800 dark:text-white mb-6">جاري الإعداد...</h2>
        <ul className="space-y-4">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;
            
            return (
              <motion.li 
                key={index} 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center text-lg"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-indigo-500 mr-4 flex-shrink-0">
                  {isCompleted ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircleIcon className="w-6 h-6 text-indigo-500" /></motion.div>
                  ) : isActive ? (
                    <LoaderIcon className="w-5 h-5 text-indigo-500 animate-spin" />
                  ) : (
                    <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  )}
                </div>
                <span className={`font-medium ${isActive ? 'text-indigo-600 dark:text-indigo-400' : isCompleted ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                  {step}
                </span>
              </motion.li>
            );
          })}
        </ul>
      </motion.div>
    </motion.div>
  );
};
