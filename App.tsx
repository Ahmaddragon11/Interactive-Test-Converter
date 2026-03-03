import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { PdfUploader } from './components/PdfUploader';
import { QuizView } from './components/QuizView';
import { MultiStepLoader } from './components/MultiStepLoader';
import { parsePdf } from './services/pdfParser';
import { generateQuizFromText, generateQuizFromTopic, gradeQuiz, generateReview } from './services/geminiService';
import { type Quiz, type UserAnswers, type GradingState, type QuizResults, Question, QuestionType, GradedResult, ReviewData } from './types';
import { AlertTriangleIcon, BookOpenIcon, InfoIcon, SparklesIcon, UploadCloudIcon } from './components/Icons';
import { TopicGenerator } from './components/TopicGenerator';
import { ReviewView } from './components/ReviewView';

import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<'creation' | 'quiz' | 'loading' | 'error' | 'review'>('creation');
  const [creationMode, setCreationMode] = useState<'pdf' | 'topic'>('pdf');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [quizData, setQuizData] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [gradingState, setGradingState] = useState<GradingState>('idle');
  const [quizResults, setQuizResults] = useState<QuizResults>({});
  const [score, setScore] = useState<number>(0);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    root.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const initializeAnswers = (questions: Question[]): UserAnswers => {
    const answers: UserAnswers = {};
    questions.forEach(q => {
        if (q.subQuestions && q.subQuestions.length > 0) {
            answers[q.id] = initializeAnswers(q.subQuestions);
        } else {
             switch (q.type) {
                case QuestionType.Matching:
                    answers[q.id] = {};
                    break;
                case QuestionType.Table:
                    answers[q.id] = q.rows && q.headers ? Array(q.rows).fill(null).map(() => Array(q.headers!.length).fill('')) : [];
                    break;
                case QuestionType.FillInTheBlank:
                    const blankCount = (q.questionText.match(/\[BLANK\]/g) || []).length;
                    answers[q.id] = Array(blankCount).fill('');
                    break;
                case (QuestionType as any).DropdownFill:
                case 'DROPDOWN_FILL':
                    const dropdownBlankCount = ((q.dropdownText || q.questionText).match(/\[BLANK\]/g) || []).length;
                    answers[q.id] = Array(dropdownBlankCount).fill('');
                    break;
                case QuestionType.MultiSelect:
                    answers[q.id] = [];
                    break;
                case QuestionType.Sequencing:
                    answers[q.id] = q.sequencingItems || [];
                    break;
                case QuestionType.Classification:
                    const initialClassification: { [key: string]: string[] } = {};
                    (q.classificationCategories || []).forEach(cat => initialClassification[cat] = []);
                    initialClassification['unclassified'] = q.classificationItems || [];
                    answers[q.id] = initialClassification;
                    break;
                default:
                    answers[q.id] = '';
            }
        }
    });
    return answers;
  };
  
  const fullReset = () => {
      setPdfFile(null);
      setQuizData(null);
      setUserAnswers({});
      setError(null);
      setGradingState('idle');
      setQuizResults({});
      setScore(0);
      setReviewData(null);
      setAppState('creation');
  };

  const handlePdfUpload = useCallback(async (file: File) => {
    fullReset();
    setLoadingSteps([
      'قراءة ملف PDF...',
      'تحليل المحتوى باستخدام الذكاء الاصطناعي...',
      'بناء الاختبار التفاعلي...',
    ]);
    setCurrentStep(0);
    setAppState('loading');
    setPdfFile(file);

    try {
      setCurrentStep(0);
      const text = await parsePdf(file);
      
      if (text.trim().length < 20) {
          setError("يبدو أن ملف PDF لا يحتوي على نص كافٍ. يرجى التأكد من أنه ليس مجرد صور.");
          setAppState('error');
          return;
      }
      
      setCurrentStep(1);
      const quiz = await generateQuizFromText(text);
      
      setCurrentStep(2);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setQuizData(quiz);
      setUserAnswers(initializeAnswers(quiz.questions));
      setAppState('quiz');
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء معالجة الملف. قد يكون النموذج غير قادر على تحليل هذا المستند. يرجى المحاولة مرة أخرى.');
      setAppState('error');
    } finally {
      setLoadingSteps([]);
      setCurrentStep(0);
    }
  }, []);

    const handleGenerateFromTopic = useCallback(async (details: { subject: string; gradeLevel: string; topic: string; numQuestions: number }) => {
    fullReset();
    setLoadingSteps([
        'البحث في الإنترنت عن معلومات حول الموضوع...',
        'تحليل النتائج وصياغة الأسئلة...',
        'بناء الاختبار التفاعلي النهائي...',
    ]);
    setCurrentStep(0);
    setAppState('loading');

    try {
        setCurrentStep(0);
        // Step 1 is implicit in the API call
        const quiz = await generateQuizFromTopic(details);
        
        setCurrentStep(1);
        // Simulate analysis time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setCurrentStep(2);
        // Short delay to allow user to see the final checkmark
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setQuizData(quiz);
        setUserAnswers(initializeAnswers(quiz.questions));
        setAppState('quiz');
    } catch (err) {
        console.error(err);
        setError('حدث خطأ أثناء إنشاء الاختبار. قد يكون النموذج غير قادر على العثور على معلومات حول هذا الموضوع. يرجى المحاولة مرة أخرى بموضوع مختلف.');
        setAppState('error');
    } finally {
        setLoadingSteps([]);
        setCurrentStep(0);
    }
    }, []);

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
    if (!quizData) return;
    
    setLoadingSteps(['البروفيسور Gemini يراجع إجاباتك...', 'حساب الدرجات النهائية...']);
    setCurrentStep(0);
    setAppState('loading');
    setGradingState('grading');
    setError(null);

    try {
      const resultsArray = await gradeQuiz(quizData.questions, userAnswers);
      
      setCurrentStep(1);
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
      correctCount = count;
      
      await new Promise(resolve => setTimeout(resolve, 500));

      setQuizResults(results);
      setScore(correctCount);
      setGradingState('graded');
      setAppState('quiz');

    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء تصحيح الاختبار. يرجى المحاولة مرة أخرى.');
      setGradingState('idle');
      setAppState('error');
    } finally {
      setLoadingSteps([]);
      setCurrentStep(0);
    }
  };
  
  const handleGenerateReview = async () => {
    if (!quizData) return;
    
    setLoadingSteps(['جاري تحليل أخطائك...', 'إعداد مراجعة شاملة مخصصة لك...', 'تجهيز أسئلة التدريب...']);
    setCurrentStep(0);
    setAppState('loading');
    setError(null);

    try {
      const data = await generateReview(quizData, userAnswers, quizResults);
      setReviewData(data);
      setAppState('review');
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء إعداد المراجعة. يرجى المحاولة مرة أخرى.');
      setAppState('error');
    } finally {
      setLoadingSteps([]);
      setCurrentStep(0);
    }
  };

  const resetAnswers = () => {
      if (!quizData) return;
      setUserAnswers(initializeAnswers(quizData.questions));
      setQuizResults({});
      setScore(0);
      setGradingState('idle');
  }

  const renderContent = () => {
    switch (appState) {
        case 'loading':
            return <MultiStepLoader steps={loadingSteps} currentStep={currentStep} />;
        case 'error':
            return (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-2xl mx-auto"
              >
                <div role="alert" className="p-6 bg-red-100 dark:bg-red-900/30 border-r-4 border-red-500 text-red-700 dark:text-red-200 rounded-lg shadow-lg">
                    <div className="flex items-center">
                        <AlertTriangleIcon className="h-6 w-6 text-red-500 ml-3" />
                        <p className="font-semibold">{error}</p>
                    </div>
                </div>
                <button
                  onClick={fullReset}
                  className="mt-6 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"
                >
                  البدء من جديد
                </button>
              </motion.div>
            );
        case 'quiz':
            if (quizData) {
                return (
                    <QuizView 
                        quiz={quizData} 
                        pdfUrl={pdfFile ? URL.createObjectURL(pdfFile) : undefined}
                        userAnswers={userAnswers}
                        onAnswerChange={handleAnswerChange}
                        onReset={fullReset}
                        onGrade={handleGradeQuiz}
                        onTryAgain={resetAnswers}
                        onReview={handleGenerateReview}
                        gradingState={gradingState}
                        quizResults={quizResults}
                        score={score}
                    />
                );
            }
             // Fallback to creation if quizData is null
            setAppState('creation');
            return null;
        case 'review':
            if (reviewData) {
                return (
                    <ReviewView 
                        reviewData={reviewData}
                        onReset={fullReset}
                        initializeAnswers={initializeAnswers}
                    />
                );
            }
            setAppState('creation');
            return null;
        case 'creation':
            return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-4xl mx-auto text-center py-8 px-4 w-full"
                >
                    <div className="inline-block p-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-full mb-6">
                        <BookOpenIcon className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
                        حوّل اختباراتك إلى تجارب تفاعلية ذكية
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-10">
                        استخدم قوة الذكاء الاصطناعي من Gemini لتحويل ملفات PDF أو إنشاء اختبارات من الصفر حول أي موضوع. يدعم التطبيق أنواع أسئلة متقدمة وتصحيحًا فوريًا مع شرح مفصل.
                    </p>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6">
                        <div className="flex justify-center border-b border-gray-200 dark:border-gray-700 mb-6">
                            <button onClick={() => setCreationMode('pdf')} className={`flex items-center gap-2 px-4 py-3 font-bold text-lg transition-colors ${creationMode === 'pdf' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                                <UploadCloudIcon className="w-6 h-6"/> رفع ملف PDF
                            </button>
                            <button onClick={() => setCreationMode('topic')} className={`flex items-center gap-2 px-4 py-3 font-bold text-lg transition-colors ${creationMode === 'topic' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                                <SparklesIcon className="w-6 h-6"/> إنشاء من موضوع
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                          {creationMode === 'pdf' ? (
                               <motion.div key="pdf" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                  <PdfUploader onPdfUpload={handlePdfUpload} disabled={false} />
                                  <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800/50 border-r-4 border-indigo-500 text-indigo-800 dark:text-indigo-200 rounded-lg shadow-sm text-right">
                                      <div className="flex items-start">
                                          <InfoIcon className="h-6 w-6 text-indigo-500 ml-3 flex-shrink-0" />
                                          <div>
                                              <h3 className="font-bold text-base mb-1">كيف يعمل؟</h3>
                                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                              ارفع ملف PDF الخاص باختبارك، وسيقوم الذكاء الاصطناعي بتحليله واستخراج الأسئلة تلقائيًا، بما في ذلك الأنواع المعقدة مثل الجداول والأسئلة المتداخلة.
                                              </p>
                                          </div>
                                      </div>
                                  </div>
                               </motion.div>
                          ) : (
                              <motion.div key="topic" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                 <TopicGenerator onGenerate={handleGenerateFromTopic} disabled={false}/>
                                 <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800/50 border-r-4 border-indigo-500 text-indigo-800 dark:text-indigo-200 rounded-lg shadow-sm text-right">
                                      <div className="flex items-start">
                                          <InfoIcon className="h-6 w-6 text-indigo-500 ml-3 flex-shrink-0" />
                                          <div>
                                              <h3 className="font-bold text-base mb-1">كيف يعمل؟</h3>
                                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                              أدخل تفاصيل الموضوع الذي تريده، وسيقوم الذكاء الاصطناعي بالبحث في الإنترنت لجمع المعلومات وإنشاء اختبار شامل ومتنوع الأسئلة خصيصًا لك.
                                              </p>
                                          </div>
                                      </div>
                                  </div>
                              </motion.div>
                          )}
                        </AnimatePresence>

                    </div>
                </motion.div>
            );
        default:
            return null;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 font-sans">
      <Header theme={theme} setTheme={setTheme} />
      <main className="container mx-auto p-4 md:p-8 flex justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={appState}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full flex justify-center"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;