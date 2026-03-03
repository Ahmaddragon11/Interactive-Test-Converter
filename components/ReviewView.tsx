import React, { useState } from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { type ReviewData, type UserAnswers, type GradingState, type QuizResults, GradedResult } from '../types';
import { QuizView } from './QuizView';
import { gradeQuiz } from '../services/geminiService';
import { BookOpenIcon, CheckCircleIcon, UploadIcon } from './Icons';

interface ReviewViewProps {
    reviewData: ReviewData;
    onReset: () => void;
    initializeAnswers: (questions: any[]) => UserAnswers;
}

export const ReviewView: React.FC<ReviewViewProps> = ({ reviewData, onReset, initializeAnswers }) => {
    const [userAnswers, setUserAnswers] = useState<UserAnswers>(initializeAnswers(reviewData.practiceQuiz.questions));
    const [gradingState, setGradingState] = useState<GradingState>('idle');
    const [quizResults, setQuizResults] = useState<QuizResults>({});
    const [score, setScore] = useState<number>(0);
    const [isGrading, setIsGrading] = useState(false);

    const handleAnswerChange = (path: number[], answer: any) => {
        setUserAnswers(prev => {
            const newAnswers = { ...prev };
            const updateRecursively = (currentLevel: UserAnswers, path: number[]): UserAnswers => {
                if (path.length === 0) return currentLevel;
                const newLevel = { ...currentLevel };
                const [currentId, ...restPath] = path;
                if (restPath.length === 0) {
                    newLevel[currentId] = answer;
                } else {
                    const nextLevelAnswers = newLevel[currentId] && typeof newLevel[currentId] === 'object' ? newLevel[currentId] : {};
                    newLevel[currentId] = updateRecursively(nextLevelAnswers as UserAnswers, restPath);
                }
                return newLevel;
            };
            return updateRecursively(newAnswers, path);
        });
    };

    const handleGradeQuiz = async () => {
        setIsGrading(true);
        setGradingState('grading');

        try {
            const resultsArray = await gradeQuiz(reviewData.practiceQuiz.questions, userAnswers);
            
            const newQuizResults: QuizResults = {};
            let correctCount = 0;
            
            const processResults = (results: GradedResult[]): { count: number, results: QuizResults } => {
                let count = 0;
                const processed: QuizResults = {};
                results.forEach(result => {
                    const res: any = { isCorrect: result.isCorrect, correctAnswer: result.correctAnswer, explanation: result.explanation };
                    if (result.subResults && result.subResults.length > 0) {
                        const { count: subCount, results: subProcessed } = processResults(result.subResults);
                        count += subCount;
                        res.subResults = result.subResults;
                    } else if (result.isCorrect) {
                        count++;
                    }
                    processed[result.questionId] = res;
                });
                return { count, results: processed };
            };

            const { count, results } = processResults(resultsArray);
            
            setQuizResults(results);
            setScore(count);
            setGradingState('graded');
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء تصحيح اختبار التدريب.');
            setGradingState('idle');
        } finally {
            setIsGrading(false);
        }
    };

    const resetAnswers = () => {
        setUserAnswers(initializeAnswers(reviewData.practiceQuiz.questions));
        setQuizResults({});
        setScore(0);
        setGradingState('idle');
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-screen-xl mx-auto w-full space-y-8"
        >
            <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <BookOpenIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">المراجعة الشاملة</h2>
                    </div>
                    <button onClick={onReset} title="العودة للبداية" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <UploadIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="prose prose-indigo dark:prose-invert max-w-none rtl text-right leading-loose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {reviewData.reviewLesson}
                    </ReactMarkdown>
                </div>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 sm:p-8 rounded-2xl shadow-lg border border-indigo-100 dark:border-indigo-800/50">
                <div className="flex items-center gap-3 mb-6">
                    <CheckCircleIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">اختبر فهمك</h3>
                </div>
                
                <QuizView 
                    quiz={reviewData.practiceQuiz}
                    userAnswers={userAnswers}
                    onAnswerChange={handleAnswerChange}
                    onReset={onReset}
                    onGrade={handleGradeQuiz}
                    onTryAgain={resetAnswers}
                    gradingState={gradingState}
                    quizResults={quizResults}
                    score={score}
                    isPractice={true}
                />
            </div>
        </motion.div>
    );
};
