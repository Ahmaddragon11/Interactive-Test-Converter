import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { type Quiz, type UserAnswers, type GradingState, type QuizResults, Question as QuestionTypeData, QuestionType } from '../types';
import { QuestionComponent } from './Question';
import { MaximizeIcon, MinimizeIcon, UploadIcon, CheckCircleIcon, BookOpenIcon, ChevronDownIcon, FileTextIcon, HelpCircleIcon, DownloadIcon, CopyIcon } from './Icons';
import { PlayAudioButton } from './PlayAudioButton';
import { generateQuizHtml } from '../utils/download';

declare const confetti: any;

interface QuizViewProps {
  quiz: Quiz;
  pdfUrl?: string;
  userAnswers: UserAnswers;
  onAnswerChange: (path: number[], answer: any) => void;
  onReset: () => void;
  onGrade: () => void;
  onTryAgain: () => void;
  onReview?: () => void;
  gradingState: GradingState;
  quizResults: QuizResults;
  score: number;
  isPractice?: boolean;
}

const getScoreFeedback = (score: number, total: number): string => {
    const percentage = total > 0 ? (score / total) * 100 : 0;
    if (percentage === 100) return "ممتاز! نتيجة مثالية!";
    if (percentage >= 85) return "عمل رائع! أداء متميز.";
    if (percentage >= 70) return "جيد جدًا! استمر في التقدم.";
    if (percentage >= 50) return "مجهود طيب. المراجعة ستساعدك على التحسن.";
    return "لا تستسلم! كل محاولة هي فرصة للتعلم.";
};


export const QuizView: React.FC<QuizViewProps> = (props) => {
  const { quiz, pdfUrl, userAnswers, onAnswerChange, onReset, onGrade, onTryAgain, onReview, gradingState, quizResults, score, isPractice } = props;
  const [isPdfFullScreen, setIsPdfFullScreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'quiz' | 'pdf'>('quiz');
  const [displayScore, setDisplayScore] = useState(0);
  const hasPdf = !!pdfUrl;

  const countAnswers = (questions: QuestionTypeData[]): { total: number } => {
    let total = 0;
    questions.forEach(q => {
        if (q.subQuestions && q.subQuestions.length > 0) {
            total += countAnswers(q.subQuestions).total;
        } else {
            total++;
        }
    });
    return { total };
  };

  const countAnswered = (questions: QuestionTypeData[], answers: UserAnswers): number => {
    let answeredCount = 0;
    questions.forEach(q => {
        const answer = answers && answers[q.id];
        if (q.subQuestions && q.subQuestions.length > 0) {
            answeredCount += countAnswered(q.subQuestions, answer as UserAnswers);
        } else {
            let isAnswered = false;
            if (answer !== undefined && answer !== null) {
                switch(q.type) {
                    case QuestionType.ShortAnswer:
                    case QuestionType.Essay:
                    case QuestionType.TrueFalse:
                    case QuestionType.MultipleChoice:
                        isAnswered = typeof answer === 'string' && answer.trim() !== '';
                        break;
                    case QuestionType.FillInTheBlank:
                         const blankCount = (q.questionText.match(/\[BLANK\]/g) || []).length;
                        isAnswered = Array.isArray(answer) && answer.length === blankCount && answer.every(a => a && a.trim() !== '');
                        break;
                    case QuestionType.Table:
                        isAnswered = Array.isArray(answer) && answer.length > 0 && answer.flat().length > 0 && answer.flat().every(a => typeof a === 'string' && a.trim() !== '');
                        break;
                    case QuestionType.MultiSelect:
                        isAnswered = Array.isArray(answer) && answer.length > 0;
                        break;
                    case QuestionType.Matching:
                        const promptsCount = q.prompts?.length || 0;
                        isAnswered = typeof answer === 'object' && Object.values(answer).filter(v => v && v.toString().trim() !== '').length === promptsCount;
                        break;
                    case QuestionType.Classification:
                        isAnswered = typeof answer === 'object' && answer.unclassified && Array.isArray(answer.unclassified) && answer.unclassified.length === 0 && (q.classificationItems || []).length > 0;
                        break;
                    case QuestionType.Sequencing:
                        isAnswered = true; // Always considered answered as it's pre-filled
                        break;
                    default:
                        isAnswered = !!answer;
                }
            }
            if(isAnswered) answeredCount++;
        }
    });
    return answeredCount;
};


  const { total } = useMemo(() => countAnswers(quiz.questions), [quiz.questions]);
  const answered = useMemo(() => countAnswered(quiz.questions, userAnswers), [quiz.questions, userAnswers]);


  const allAnswered = answered === total;
  const progressPercentage = total > 0 ? (answered / total) * 100 : 0;
  
  useEffect(() => {
    if (gradingState === 'graded') {
        if (total > 0 && score === total) {
          confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#818cf8', '#a5b4fc', '#ddd6fe']
          });
        }

        // Score animation
        setDisplayScore(0);
        if (score === 0) return;
        
        const duration = 1000; // 1 second
        const frameRate = 60;
        const totalFrames = duration / (1000 / frameRate);
        const increment = score / totalFrames;
        let currentFrame = 0;
        
        const timer = setInterval(() => {
            currentFrame++;
            const newDisplayScore = Math.min(score, Math.round(increment * currentFrame));
            setDisplayScore(newDisplayScore);

            if (newDisplayScore === score) {
                clearInterval(timer);
            }
        }, 1000 / frameRate);

        return () => clearInterval(timer);
    }
  }, [gradingState, score, total]);

  const handleDownload = () => {
    const htmlContent = generateQuizHtml(quiz, userAnswers, quizResults, score, total);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.title.replace(/ /g, '_')}_results.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyResults = async () => {
    let text = `نتائج اختبار: ${quiz.title}\n`;
    text += `النتيجة: ${score} / ${total}\n\n`;
    
    quiz.questions.forEach((q, i) => {
        const res = quizResults[q.id];
        text += `${i+1}. ${q.questionText}\n`;
        text += `الحالة: ${res?.isCorrect ? 'صحيحة ✅' : 'خاطئة ❌'}\n`;
        if (res?.explanation) text += `الشرح: ${res.explanation}\n`;
        text += `\n`;
    });

    try {
        await navigator.clipboard.writeText(text);
        alert('تم نسخ النتائج إلى الحافظة!');
    } catch (err) {
        console.error('Failed to copy results:', err);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-screen-2xl mx-auto w-full">
      {/* Mobile Tabbed Navigation */}
      {hasPdf && (
        <div className="lg:hidden mb-4 flex justify-center border-b border-gray-300 dark:border-gray-600">
            <button onClick={() => setActiveTab('quiz')} className={`px-6 py-3 font-bold ${activeTab === 'quiz' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600' : 'text-gray-500'}`}>
                <HelpCircleIcon className="w-5 h-5 inline-block ml-2"/>الاختبار
            </button>
            <button onClick={() => setActiveTab('pdf')} className={`px-6 py-3 font-bold ${activeTab === 'pdf' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600' : 'text-gray-500'}`}>
                <FileTextIcon className="w-5 h-5 inline-block ml-2"/>المستند الأصلي
            </button>
        </div>
      )}

      {/* Interactive Quiz Panel */}
       <div className={`w-full ${hasPdf ? 'lg:w-1/2' : 'lg:w-2/3 lg:mx-auto'} transition-all duration-300 ${isPdfFullScreen && hasPdf ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none' : ''} ${!hasPdf || activeTab === 'quiz' ? '' : 'hidden lg:block'}`}>
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg h-full flex flex-col">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl sm:text-2xl font-bold text-indigo-700 dark:text-indigo-400">{quiz.title}</h2>
            <div className="flex items-center gap-2">
                {gradingState === 'graded' && (
                    <>
                        <button onClick={handleCopyResults} title="نسخ النتائج" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <CopyIcon className="w-6 h-6" />
                        </button>
                        <button onClick={handleDownload} title="تنزيل النتائج" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <DownloadIcon className="w-6 h-6" />
                        </button>
                    </>
                )}
                <button onClick={onReset} title="البدء من جديد" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <UploadIcon className="w-6 h-6" />
                </button>
            </div>
          </div>

          {quiz.contextualText && (
            <details className="mb-4 group">
                <summary className="flex items-center justify-between cursor-pointer p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg list-none">
                    <div className="flex items-center"><BookOpenIcon className="h-5 w-5 text-gray-600 dark:text-gray-300 ml-2" /><span className="font-semibold text-gray-800 dark:text-gray-100">النص المرفق</span></div>
                    <div className="flex items-center">
                        <PlayAudioButton textToSpeak={quiz.contextualText} />
                        <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 group-open:rotate-180 transition-transform" />
                    </div>
                </summary>
                <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg border-r-2 border-indigo-400"><p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{quiz.contextualText}</p></div>
            </details>
          )}
          
          {gradingState === 'graded' && (
            <div className="my-4 p-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-center shadow-inner">
                <p className="font-bold text-lg text-indigo-800 dark:text-indigo-200">النتيجة النهائية</p>
                <p className="text-5xl font-extrabold text-gray-800 dark:text-white my-2 tracking-tighter">{displayScore} <span className="text-3xl text-gray-500 dark:text-gray-400">/ {total}</span></p>
                <p className="font-semibold text-gray-700 dark:text-gray-300">{getScoreFeedback(score, total)}</p>
                {score < total && onReview && !isPractice && (
                    <button
                        onClick={onReview}
                        className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full shadow-md transition-all transform hover:scale-105 flex items-center justify-center mx-auto gap-2"
                    >
                        <BookOpenIcon className="w-5 h-5" />
                        علمني أخطائي
                    </button>
                )}
            </div>
          )}

          <div className="my-2"><div className="flex justify-between items-center mb-1"><span className="text-sm font-medium text-gray-600 dark:text-gray-400">التقدم</span><span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{answered} / {total}</span></div><div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"><div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full transition-all duration-500" style={{width: `${progressPercentage}%`}}></div></div></div>

          <div className="overflow-y-auto flex-grow pr-2 mt-4" style={{maxHeight: 'calc(100vh - 350px)'}}>
            <form onSubmit={(e) => e.preventDefault()}>
              {quiz.questions.map((question, index) => (
                 <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                 >
                   <QuestionComponent 
                      question={question} 
                      userAnswer={userAnswers[question.id]} 
                      onAnswerChange={onAnswerChange} 
                      isGraded={gradingState === 'graded'} 
                      result={quizResults[question.id]} 
                      path={[question.id]}
                      isLastQuestion={index === quiz.questions.length - 1}
                  />
                 </motion.div>
              ))}
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            {gradingState !== 'graded' ? (
              <button 
                onClick={onGrade} 
                disabled={!allAnswered || gradingState === 'grading'} 
                className={`w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-all transform hover:scale-105 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none ${allAnswered && gradingState !== 'grading' ? 'animate-pulse' : ''}`}
                >
                تصحيح الإجابات
              </button>
            ) : (
              <button onClick={onTryAgain} className="w-full px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition-all transform hover:scale-105">إعادة المحاولة</button>
            )}
        </div>
        </div>
      </div>

      {/* PDF Viewer Panel */}
      {hasPdf && (
        <div className={`w-full lg:w-1/2 transition-all duration-300 ${isPdfFullScreen ? 'lg:w-full' : 'lg:w-1/2'} ${activeTab !== 'pdf' ? 'hidden lg:block' : ''}`}>
            <div className="bg-white dark:bg-gray-800 p-2 sm:p-4 rounded-2xl shadow-lg sticky top-8">
                <div className="flex justify-end mb-2"><button onClick={() => setIsPdfFullScreen(!isPdfFullScreen)} title={isPdfFullScreen ? "تصغير العرض" : "تكبير العرض"} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">{isPdfFullScreen ? <MinimizeIcon className="w-5 h-5" /> : <MaximizeIcon className="w-5 h-5" />}
                    </button></div>
            <div className="w-full aspect-auto bg-gray-200 dark:bg-gray-900 rounded-lg overflow-hidden">
                <embed src={pdfUrl} type="application/pdf" className="w-full h-[calc(100vh-10rem)]" />
            </div>
            </div>
        </div>
      )}
    </div>
  );
};
