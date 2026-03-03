import React, { useState } from 'react';
import { motion } from 'motion/react';

interface TopicGeneratorProps {
  onGenerate: (details: { subject: string; gradeLevel: string; topic: string; numQuestions: number }) => void;
  disabled: boolean;
}

export const TopicGenerator: React.FC<TopicGeneratorProps> = ({ onGenerate, disabled }) => {
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim() && gradeLevel.trim() && topic.trim() && numQuestions > 0) {
      onGenerate({ subject, gradeLevel, topic, numQuestions });
    }
  };

  const isFormValid = subject.trim() && gradeLevel.trim() && topic.trim() && numQuestions > 0;

  const commonInputClasses = "w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:opacity-50";

  return (
    <motion.form 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onSubmit={handleSubmit} 
      className="space-y-6 text-right" 
      dir="rtl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            المادة الدراسية
          </label>
          <input
            type="text"
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={commonInputClasses}
            placeholder="مثال: فيزياء، تاريخ، أدب عربي"
            required
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            المستوى الدراسي
          </label>
          <input
            type="text"
            id="gradeLevel"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className={commonInputClasses}
            placeholder="مثال: الصف العاشر، مستوى جامعي، للمبتدئين"
            required
            disabled={disabled}
          />
        </div>
      </div>
      <div>
        <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          الموضوع الرئيسي
        </label>
        <input
          type="text"
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className={commonInputClasses}
          placeholder="مثال: قوانين نيوتن للحركة، العصر العباسي، البلاغة في الشعر"
          required
          disabled={disabled}
        />
      </div>
      <div>
        <label htmlFor="numQuestions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          عدد الأسئلة (تقريبيًا)
        </label>
        <input
          type="number"
          id="numQuestions"
          value={numQuestions}
          onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value, 10)))}
          className={`${commonInputClasses} max-w-xs`}
          min="1"
          max="50"
          required
          disabled={disabled}
        />
      </div>
      <div className="pt-4">
        <button
          type="submit"
          disabled={!isFormValid || disabled}
          className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-all transform hover:scale-105 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none"
        >
          {disabled ? '...جاري الإنشاء' : 'أنشئ الاختبار بالذكاء الاصطناعي'}
        </button>
      </div>
    </motion.form>
  );
};
