import React, { useState, useMemo } from 'react';
import { type Question, QuestionType, type QuizResult } from '../types';
import { CheckCircleIcon, XCircleIcon, InfoIcon } from './Icons';
import { PlayAudioButton } from './PlayAudioButton';

interface QuestionComponentProps {
  question: Question;
  userAnswer: any;
  onAnswerChange: (path: number[], answer: any) => void;
  isGraded: boolean;
  result?: QuizResult;
  path: number[];
  isSubQuestion?: boolean;
  isLastQuestion?: boolean;
}

// --- Render Functions for different question types ---
const getGradedInputStyle = (isCorrect: boolean | undefined) => {
    if (isCorrect === true) return "bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-700";
    if (isCorrect === false) return "bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-700";
    return "bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600";
};

const renderDefaultInput = (question: Question, userAnswer: string, onAnswerChange: (answer: string) => void, isGraded: boolean, isEssay: boolean, result?: QuizResult) => {
    const gradedStyle = isGraded ? getGradedInputStyle(result?.isCorrect) : '';
    const commonClasses = `mt-2 w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:opacity-80 disabled:cursor-not-allowed ${gradedStyle}`;
    const placeholder = isEssay ? "اكتب إجابتك المقالية هنا..." : "اكتب إجابتك هنا...";
    return isEssay ? <textarea value={userAnswer || ''} onChange={(e) => onAnswerChange(e.target.value)} className={`${commonClasses} min-h-[150px]`} placeholder={placeholder} disabled={isGraded} />
                   : <input type="text" value={userAnswer || ''} onChange={(e) => onAnswerChange(e.target.value)} className={commonClasses} placeholder={placeholder} disabled={isGraded} />;
};

const renderMultiSelect = (question: Question, userAnswer: string[], onAnswerChange: (answer: string[]) => void, isGraded: boolean, result?: QuizResult) => {
    const handleChange = (option: string) => {
        const newAnswer = userAnswer?.includes(option) ? userAnswer.filter(item => item !== option) : [...(userAnswer || []), option];
        onAnswerChange(newAnswer);
    };

    const correctAnswers = useMemo(() => {
        if (!result || result.isCorrect) return [];
        try {
            const parsed = typeof result.correctAnswer === 'string' ? JSON.parse(result.correctAnswer) : result.correctAnswer;
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    }, [result]);

    return (<div className="mt-3 space-y-3">
        {question.options?.map((option, index) => {
            const isChecked = userAnswer?.includes(option);
            const isCorrectOption = correctAnswers.includes(option);
            
            let labelClasses = "flex items-center justify-between p-3 w-full rounded-lg transition-colors";
            if (isGraded) {
                if (isChecked && isCorrectOption) labelClasses += " bg-green-100 dark:bg-green-900/40";
                else if (isChecked && !isCorrectOption) labelClasses += " bg-red-100 dark:bg-red-900/40";
                else if (!isChecked && isCorrectOption) labelClasses += " bg-green-100/50 dark:bg-green-900/20 border border-dashed border-green-500";
                else labelClasses += " bg-gray-50 dark:bg-gray-800/20";
            } else {
                 labelClasses += " cursor-pointer bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-gray-600/50";
            }

            return (
                <label key={index} className={labelClasses}>
                    <div className="flex items-center">
                        <input type="checkbox" checked={isChecked} onChange={() => handleChange(option)} className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50" disabled={isGraded} />
                        <span className="mr-3 text-gray-800 dark:text-gray-200">{option}</span>
                    </div>
                     {isGraded && isChecked && isCorrectOption && <CheckCircleIcon className="w-5 h-5 text-green-600"/>}
                     {isGraded && isChecked && !isCorrectOption && <XCircleIcon className="w-5 h-5 text-red-600"/>}
                </label>
            );
        })}
    </div>);
};

const renderSequencing = (question: Question, userAnswer: string[], onAnswerChange: (answer: string[]) => void, isGraded: boolean) => {
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

    const handleDragStart = (item: string) => setDraggedItem(item);
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDrop = (targetItem: string) => {
        if (!draggedItem || draggedItem === targetItem || isGraded) return;
        const currentIndex = userAnswer.indexOf(draggedItem);
        const targetIndex = userAnswer.indexOf(targetItem);
        const newAnswer = [...userAnswer];
        newAnswer.splice(currentIndex, 1);
        newAnswer.splice(targetIndex, 0, draggedItem);
        onAnswerChange(newAnswer);
        setDraggedItem(null);
    };

    const handleItemClick = (index: number) => {
        if (isGraded) return;
        if (selectedItemIndex === null) {
            setSelectedItemIndex(index);
        } else if (selectedItemIndex === index) {
            setSelectedItemIndex(null);
        } else {
            // Swap items
            const newAnswer = [...userAnswer];
            const temp = newAnswer[selectedItemIndex];
            newAnswer[selectedItemIndex] = newAnswer[index];
            newAnswer[index] = temp;
            onAnswerChange(newAnswer);
            setSelectedItemIndex(null);
        }
    };

    return (<div className="mt-3 space-y-3" dir="rtl">
        {(userAnswer || []).map((item, index) => (
            <div key={item} 
                 draggable={!isGraded} 
                 onDragStart={() => handleDragStart(item)} 
                 onDragOver={handleDragOver} 
                 onDrop={() => handleDrop(item)}
                 onClick={() => handleItemClick(index)}
                 className={`flex items-center p-4 w-full bg-white dark:bg-gray-800 rounded-xl border-2 transition-all ${
                     selectedItemIndex === index 
                     ? 'border-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-900/30' 
                     : 'border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-800'
                 } ${!isGraded ? 'cursor-grab active:cursor-grabbing' : 'cursor-default shadow-sm'}`}>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold ml-4">
                    {index + 1}
                </div>
                <span className="text-gray-800 dark:text-gray-200 flex-grow">{item}</span>
                {!isGraded && (
                    <div className="text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                    </div>
                )}
            </div>
        ))}
        {!isGraded && <p className="text-xs text-gray-500 text-center mt-2">اسحب للترتيب أو انقر على عنصرين للتبديل بينهما</p>}
    </div>);
};

const renderFillInTheBlank = (question: Question, userAnswer: string[], onAnswerChange: (answer: string[]) => void, isGraded: boolean, result?: QuizResult) => {
    const parts = question.questionText.split(/(\[BLANK\])/g).filter(part => part);
    let blankIndex = -1;

    const correctAnswers = useMemo(() => {
        if (!result || result.isCorrect) return [];
        try {
            const parsed = typeof result.correctAnswer === 'string' ? JSON.parse(result.correctAnswer) : result.correctAnswer;
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    }, [result]);


    return (
        <div className="mt-3 leading-loose text-lg text-right" dir="rtl">
            {parts.map((part, index) => {
                if (part === '[BLANK]') {
                    blankIndex++;
                    const currentBlankIndex = blankIndex;
                    const isCorrect = isGraded && correctAnswers.length > 0 ? (userAnswer[currentBlankIndex]?.trim().toLowerCase() === correctAnswers[currentBlankIndex]?.trim().toLowerCase()) : undefined;
                    const gradedStyle = isGraded ? getGradedInputStyle(isCorrect) : '';
                    
                    return (
                        <input
                            key={`blank-${index}`}
                            type="text"
                            value={userAnswer[currentBlankIndex] || ''}
                            onChange={(e) => {
                                const newAnswer = [...(userAnswer || [])];
                                newAnswer[currentBlankIndex] = e.target.value;
                                onAnswerChange(newAnswer);
                            }}
                            placeholder="..."
                            disabled={isGraded}
                            className={`inline-block w-32 sm:w-40 mx-1 px-2 py-1 text-center border-b-2 border-indigo-300 dark:border-indigo-700 focus:outline-none focus:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-t-md transition-all disabled:opacity-80 ${gradedStyle.replace('border', 'border-b')}`}
                            aria-label={`Blank ${currentBlankIndex + 1}`}
                        />
                    );
                }
                return <span key={`text-${index}`} className="text-gray-800 dark:text-gray-200">{part}</span>;
            })}
        </div>
    );
};

const renderDropdownFill = (question: Question, userAnswer: string[], onAnswerChange: (answer: string[]) => void, isGraded: boolean, result?: QuizResult) => {
    const text = question.dropdownText || question.questionText;
    const parts = text.split(/(\[BLANK\])/g).filter(part => part);
    let blankIndex = -1;

    const correctAnswers = useMemo(() => {
        if (!result || result.isCorrect) return [];
        try {
            const parsed = typeof result.correctAnswer === 'string' ? JSON.parse(result.correctAnswer) : result.correctAnswer;
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    }, [result]);

    return (
        <div className="mt-3 leading-loose text-lg text-right" dir="rtl">
            {parts.map((part, index) => {
                if (part === '[BLANK]') {
                    blankIndex++;
                    const currentBlankIndex = blankIndex;
                    const isCorrect = isGraded && correctAnswers.length > 0 ? (userAnswer[currentBlankIndex] === correctAnswers[currentBlankIndex]) : undefined;
                    const gradedStyle = isGraded ? getGradedInputStyle(isCorrect) : '';
                    
                    return (
                        <select
                            key={`dropdown-${index}`}
                            value={userAnswer[currentBlankIndex] || ''}
                            onChange={(e) => {
                                const newAnswer = [...(userAnswer || [])];
                                newAnswer[currentBlankIndex] = e.target.value;
                                onAnswerChange(newAnswer);
                            }}
                            disabled={isGraded}
                            className={`inline-block mx-1 px-2 py-1 border-b-2 border-indigo-300 dark:border-indigo-700 focus:outline-none focus:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-t-md transition-all disabled:opacity-80 appearance-none cursor-pointer ${gradedStyle.replace('border', 'border-b')}`}
                        >
                            <option value="">...</option>
                            {question.dropdownOptions?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    );
                }
                return <span key={`text-${index}`} className="text-gray-800 dark:text-gray-200">{part}</span>;
            })}
        </div>
    );
};

const renderTable = (question: Question, userAnswer: string[][], onAnswerChange: (answer: string[][]) => void, isGraded: boolean) => {
    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newAnswer = userAnswer.map(row => [...row]);
        newAnswer[rowIndex][colIndex] = value;
        onAnswerChange(newAnswer);
    };

    return (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="w-full border-collapse min-w-[500px]" dir="rtl">
                <thead>
                    <tr className="bg-indigo-50 dark:bg-indigo-900/20">
                        {question.headers?.map((header, index) => (
                            <th key={index} className="p-4 border-b border-gray-200 dark:border-gray-700 font-bold text-right text-indigo-900 dark:text-indigo-100">{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {userAnswer?.map((row, rowIndex) => (
                        <tr key={rowIndex} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            {row.map((cell, colIndex) => (
                                <td key={colIndex} className="p-0 border-b border-gray-200 dark:border-gray-700">
                                    <input
                                        type="text"
                                        value={cell}
                                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                        disabled={isGraded}
                                        placeholder="..."
                                        className="w-full h-full p-4 bg-transparent focus:bg-indigo-50/50 dark:focus:bg-indigo-900/10 focus:outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:opacity-80 transition-colors text-right"
                                        aria-label={`Row ${rowIndex + 1}, Column ${question.headers ? question.headers[colIndex] : colIndex + 1}`}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const renderClassification = (question: Question, userAnswer: { [key: string]: string[] }, onAnswerChange: (answer: { [key: string]: string[] }) => void, isGraded: boolean) => {
    const [draggedItem, setDraggedItem] = useState<{ item: string; sourceCategory: string } | null>(null);
    const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<{ item: string; category: string } | null>(null);

    const handleDragStart = (item: string, sourceCategory: string) => {
        if (isGraded) return;
        setDraggedItem({ item, sourceCategory });
    };

    const handleDragOver = (e: React.DragEvent, category: string) => {
        e.preventDefault();
        if (category !== dragOverCategory) {
            setDragOverCategory(category);
        }
    };
    
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverCategory(null);
    };

    const moveItem = (item: string, sourceCategory: string, targetCategory: string) => {
        if (sourceCategory === targetCategory) return;
        
        const newAnswer = JSON.parse(JSON.stringify(userAnswer));
        newAnswer[sourceCategory] = newAnswer[sourceCategory].filter((i: string) => i !== item);
        newAnswer[targetCategory] = [...newAnswer[targetCategory], item];

        onAnswerChange(newAnswer);
    };

    const handleDrop = (targetCategory: string) => {
        if (!draggedItem || isGraded) return;
        moveItem(draggedItem.item, draggedItem.sourceCategory, targetCategory);
        setDraggedItem(null);
        setDragOverCategory(null);
    };

    const handleItemClick = (item: string, category: string) => {
        if (isGraded) return;
        if (selectedItem && selectedItem.item === item && selectedItem.category === category) {
            setSelectedItem(null);
        } else if (selectedItem) {
            // Move selected item to this category if it's different
            moveItem(selectedItem.item, selectedItem.category, category);
            setSelectedItem(null);
        } else {
            setSelectedItem({ item, category });
        }
    };

    const handleCategoryClick = (category: string) => {
        if (isGraded || !selectedItem) return;
        moveItem(selectedItem.item, selectedItem.category, category);
        setSelectedItem(null);
    };

    const categories = ['unclassified', ...(question.classificationCategories || [])];

    return (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" dir="rtl">
            {categories.map(category => (
                <div
                    key={category}
                    onDragOver={(e) => handleDragOver(e, category)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(category)}
                    onClick={() => handleCategoryClick(category)}
                    className={`p-4 rounded-xl border-2 transition-all min-h-[180px] flex flex-col ${
                        dragOverCategory === category 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-inner' 
                        : selectedItem && selectedItem.category !== category
                        ? 'border-indigo-300 border-dashed bg-indigo-50/30 dark:bg-indigo-900/10 cursor-pointer animate-pulse'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                    }`}
                >
                    <h4 className="font-bold mb-4 text-center border-b border-gray-200 dark:border-gray-700 pb-2 text-indigo-900 dark:text-indigo-100">
                        {category === 'unclassified' ? 'العناصر المطلوب تصنيفها' : category}
                    </h4>
                    <div className="space-y-2 flex-grow">
                        {(userAnswer[category] || []).map(item => (
                            <div
                                key={item}
                                draggable={!isGraded}
                                onDragStart={() => handleDragStart(item, category)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleItemClick(item, category);
                                }}
                                className={`p-3 rounded-lg shadow-sm text-center transition-all ${
                                    selectedItem?.item === item 
                                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-300' 
                                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:shadow-md'
                                } ${!isGraded ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                            >
                                {item}
                            </div>
                        ))}
                         { (userAnswer[category] || []).length === 0 && (
                            <div className="flex items-center justify-center h-full opacity-40">
                                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                                    {selectedItem ? 'انقر هنا لوضع العنصر' : 'اسحب العناصر إلى هنا'}
                                </p>
                            </div>
                         )}
                    </div>
                </div>
            ))}
        </div>
    );
};

const renderMatching = (question: Question, userAnswer: { [key: string]: string }, onAnswerChange: (answer: { [key: string]: string }) => void, isGraded: boolean) => {
    const handleMatchChange = (prompt: string, match: string) => {
        const newAnswer = { ...(userAnswer || {}), [prompt]: match };
        onAnswerChange(newAnswer);
    };

    const shuffledMatches = useMemo(() => {
        if (!question.matches) return [];
        return [...question.matches].sort(() => Math.random() - 0.5);
    }, [question.matches]);

    return (
        <div className="mt-4 space-y-3" dir="rtl">
            {question.prompts?.map(prompt => (
                <div key={prompt} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <p className="font-medium text-gray-800 dark:text-gray-200 sm:w-1/2">{prompt}</p>
                    <div className="sm:w-1/2 relative">
                        <select
                            value={(userAnswer && userAnswer[prompt]) || ''}
                            onChange={(e) => handleMatchChange(prompt, e.target.value)}
                            disabled={isGraded}
                            className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-80 appearance-none cursor-pointer"
                            aria-label={`Match for ${prompt}`}
                        >
                            <option value="">اختر الإجابة المناسبة...</option>
                            {shuffledMatches.map(match => (
                                <option key={match} value={match}>{match}</option>
                            ))}
                        </select>
                        {!isGraded && (
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

const CorrectAnswerDisplay = ({ correctAnswer, type }: { correctAnswer: any; type: QuestionType }) => {
    let parsedAnswer: any;
    try {
        parsedAnswer = typeof correctAnswer === 'string' ? JSON.parse(correctAnswer) : correctAnswer;
    } catch (e) {
        parsedAnswer = correctAnswer;
    }

    if (parsedAnswer === undefined || parsedAnswer === null) return null;

    switch(type) {
        case QuestionType.Table:
            return (
                <div className="overflow-x-auto">
                    <table className="w-full mt-2 text-sm border-collapse min-w-[300px]">
                        <tbody>
                            {Array.isArray(parsedAnswer) && parsedAnswer.map((row, rIndex) => (
                                <tr key={rIndex} className="bg-white dark:bg-gray-800 even:bg-gray-50 dark:even:bg-gray-800/50">
                                    {Array.isArray(row) && row.map((cell, cIndex) => (
                                        <td key={cIndex} className="p-2 border border-gray-300 dark:border-gray-600">{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        case QuestionType.Matching:
            return (
                <ul className="mt-2 space-y-1 list-none">
                    {typeof parsedAnswer === 'object' && parsedAnswer !== null && Object.entries(parsedAnswer).map(([prompt, match]) => (
                        <li key={prompt}><strong className="font-semibold">{prompt}:</strong> {String(match)}</li>
                    ))}
                </ul>
            );
        case QuestionType.Sequencing:
        case QuestionType.MultiSelect:
             return (
                <ol className="mt-2 space-y-1 list-decimal list-inside">
                    {Array.isArray(parsedAnswer) && parsedAnswer.map((item, index) => (
                        <li key={index}>{item}</li>
                    ))}
                </ol>
            );
        case QuestionType.FillInTheBlank:
             return <p className="font-mono text-right">{Array.isArray(parsedAnswer) ? parsedAnswer.join('، ') : parsedAnswer}</p>;
        case QuestionType.Classification:
            return (
                <div className="mt-2 space-y-3">
                    {typeof parsedAnswer === 'object' && parsedAnswer !== null && Object.entries(parsedAnswer).map(([category, items]) => (
                         <div key={category}>
                             <p className="font-bold text-gray-800 dark:text-gray-100">{category}:</p>
                             <p className="pr-4 text-gray-600 dark:text-gray-300">{(items as string[]).join('، ')}</p>
                         </div>
                    ))}
                </div>
            );
        default:
            return <p className="font-sans text-right">{parsedAnswer.toString()}</p>;
    }
};

export const QuestionComponent: React.FC<QuestionComponentProps> = (props) => {
  const { question, userAnswer, onAnswerChange, isGraded, result, path, isSubQuestion, isLastQuestion } = props;

  const getBorderColor = () => {
    if (!isGraded || !result) return 'border-transparent';
    return result.isCorrect ? 'border-green-500' : 'border-red-500';
  };
  
  const getIcon = () => {
    if (!isGraded || !result) return null;
    return result.isCorrect ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> : <XCircleIcon className="w-6 h-6 text-red-500" />;
  };
  
  const renderInput = () => {
    const handleChange = (answer: any) => {
      onAnswerChange(path, answer);
    };

    switch (question.type) {
      case QuestionType.MultiSelect:
        return renderMultiSelect(question, userAnswer, handleChange, isGraded, result);
      case QuestionType.Sequencing:
        return renderSequencing(question, userAnswer, handleChange, isGraded);
      case QuestionType.FillInTheBlank:
        return renderFillInTheBlank(question, userAnswer, handleChange, isGraded, result);
      case (QuestionType as any).DropdownFill:
      case 'DROPDOWN_FILL':
        return renderDropdownFill(question, userAnswer, handleChange, isGraded, result);
      case QuestionType.Table:
        return renderTable(question, userAnswer, handleChange, isGraded);
      case QuestionType.Classification:
        return renderClassification(question, userAnswer, handleChange, isGraded);
       case QuestionType.Matching:
        return renderMatching(question, userAnswer, handleChange, isGraded);
      case QuestionType.MultipleChoice:
      case QuestionType.TrueFalse:
          const correctAnswer = result?.isCorrect === false ? result.correctAnswer : null;
          return (<div className="mt-3 space-y-3">
              {question.options?.map((option, index) => {
                    const isChecked = userAnswer === option;
                    const isCorrectOption = correctAnswer === option;
                    let labelClasses = "flex items-center justify-between p-3 w-full rounded-lg transition-colors";

                    if (isGraded) {
                        if (isChecked && result?.isCorrect) labelClasses += " bg-green-100 dark:bg-green-900/40";
                        else if (isChecked && !result?.isCorrect) labelClasses += " bg-red-100 dark:bg-red-900/40";
                        else if (!isChecked && isCorrectOption) labelClasses += " bg-green-100/50 dark:bg-green-900/20 border border-dashed border-green-500";
                        else labelClasses += " bg-gray-50 dark:bg-gray-800/20";
                    } else {
                         labelClasses += " cursor-pointer bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-gray-600/50";
                    }

                  return (<label key={index} className={labelClasses}>
                      <div className="flex items-center">
                        <input type="radio" name={`q_${path.join('_')}`} value={option} checked={isChecked} onChange={(e) => handleChange(e.target.value)} className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300" disabled={isGraded} />
                        <span className="mr-3 text-gray-800 dark:text-gray-200">{option}</span>
                      </div>
                      {isGraded && isChecked && result?.isCorrect && <CheckCircleIcon className="w-5 h-5 text-green-600"/>}
                      {isGraded && isChecked && !result?.isCorrect && <XCircleIcon className="w-5 h-5 text-red-600"/>}
                  </label>);
              })}
          </div>);
      default:
        const isEssay = question.type === QuestionType.Essay || question.type === QuestionType.Unknown;
        return renderDefaultInput(question, userAnswer, handleChange, isGraded, isEssay, result);
    }
  };

  const containerClasses = `py-6 bg-transparent rounded-none border-l-4 ${getBorderColor()} transition-colors ${isSubQuestion ? 'mt-4 mr-4 sm:mr-6 pl-4' : 'pl-5'}`;
  
  return (
    <div className={containerClasses}>
      <div className="flex justify-between items-start gap-2">
        <label className="block text-lg font-semibold text-gray-800 dark:text-gray-100 flex-1">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">
            {question.originalNumber ? `${question.originalNumber} ` : (isSubQuestion ? `• ` : ``)}
          </span> 
          {question.questionText}
        </label>
        <div className="flex items-center flex-shrink-0">
            <PlayAudioButton textToSpeak={question.questionText} />
            <div className="mr-2">{getIcon()}</div>
        </div>
      </div>
      
      {(!question.subQuestions || question.subQuestions.length === 0) && renderInput()}
      
      {isGraded && result && (
        <div className="mt-4 space-y-3">
          {!result.isCorrect && result.correctAnswer && (
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-sm">
                <div className="flex justify-between items-center">
                    <p className="font-bold text-green-800 dark:text-green-200">الإجابة الصحيحة:</p>
                    <PlayAudioButton textToSpeak={typeof result.correctAnswer === 'string' ? result.correctAnswer : JSON.stringify(result.correctAnswer)} />
                </div>
                <div className="text-gray-700 dark:text-gray-300 mt-1">
                  <CorrectAnswerDisplay correctAnswer={result.correctAnswer} type={question.type} />
                </div>
            </div>
          )}
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 list-none">
                <div className="flex items-center">
                    <InfoIcon className="w-4 h-4 ml-2"/>
                    <span>شرح الإجابة</span>
                    <span className="group-open:hidden mr-1"> (انقر للعرض)</span>
                </div>
                 <PlayAudioButton textToSpeak={result.explanation} />
            </summary>
            <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{result.explanation}</div>
          </details>
        </div>
      )}

      {question.subQuestions && question.subQuestions.length > 0 && (
          <div className="mt-4 pt-4">
              {question.subQuestions.map((subQ, index) => (
                  <QuestionComponent
                      key={subQ.id}
                      question={subQ}
                      userAnswer={userAnswer ? userAnswer[subQ.id] : undefined}
                      onAnswerChange={onAnswerChange}
                      isGraded={isGraded}
                      result={result?.subResults ? (result.subResults as any[]).find(r => r.questionId === subQ.id) : undefined}
                      path={[...path, subQ.id]}
                      isSubQuestion={true}
                      isLastQuestion={index === question.subQuestions.length -1}
                  />
              ))}
          </div>
      )}

      {!isLastQuestion && !isSubQuestion && <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent my-6"></div>}
    </div>
  );
};