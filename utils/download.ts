import { Quiz, UserAnswers, QuizResults, Question, QuestionType, QuizResult } from '../types';

function getStyles() {
    return `
        <style>
            body {
                font-family: 'Tajawal', sans-serif;
                direction: rtl;
                text-align: right;
                background-color: #f8fafc;
                color: #111827;
                line-height: 1.6;
                padding: 20px;
                margin: 0;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                background-color: #ffffff;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                padding: 2rem;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            }
            h1, h2, h3 {
                color: #4f46e5;
                border-bottom: 2px solid #e0e7ff;
                padding-bottom: 10px;
            }
            .quiz-header { text-align: center; }
            .score { font-size: 2.5rem; font-weight: 800; color: #111827; }
            .total { font-size: 1.5rem; color: #6b7280; }
            .question-block {
                margin-top: 2rem;
                padding: 1.5rem;
                border-radius: 8px;
                border-left: 5px solid;
            }
            .question-block.correct { border-left-color: #22c55e; background-color: #f0fdf4; }
            .question-block.incorrect { border-left-color: #ef4444; background-color: #fef2f2; }
            .question-text { font-size: 1.2rem; font-weight: 700; color: #1f2937; }
            .user-answer, .correct-answer, .explanation {
                margin-top: 1rem;
                padding: 0.75rem;
                border-radius: 6px;
            }
            .user-answer { background-color: #e0e7ff; }
            .correct-answer { background-color: #d1fae5; }
            .explanation { background-color: #f3f4f6; }
            strong { color: #111827; }
            ul, ol { padding-right: 20px; }
            li { margin-bottom: 0.5rem; }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
            th, td { border: 1px solid #d1d5db; padding: 0.75rem; text-align: right; }
            th { background-color: #f3f4f6; }
            .sub-question-block { margin-top: 1rem; padding-right: 1.5rem; border-right: 2px solid #e5e7eb; }
        </style>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    `;
}

function renderAnswer(question: Question, answer: any): string {
    if (answer === null || answer === undefined) return '<em>لم تتم الإجابة</em>';
    switch (question.type) {
        case QuestionType.MultipleChoice:
        case QuestionType.TrueFalse:
        case QuestionType.ShortAnswer:
        case QuestionType.Essay:
            return `<p>${answer}</p>`;
        case QuestionType.FillInTheBlank:
            return `<p>${Array.isArray(answer) ? answer.join('، ') : answer}</p>`;
        case QuestionType.MultiSelect:
        case QuestionType.Sequencing:
            return `<ul>${(answer as string[]).map(item => `<li>${item}</li>`).join('')}</ul>`;
        case QuestionType.Table:
            return `<table><tbody>${(answer as string[][]).map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        case QuestionType.Matching:
            return `<ul>${Object.entries(answer).map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`).join('')}</ul>`;
        case QuestionType.Classification:
            let html = '';
            for (const category in answer) {
                if(category !== 'unclassified') {
                    html += `<div><strong>${category}:</strong><ul>${(answer[category] as string[]).map(item => `<li>${item}</li>`).join('')}</ul></div>`;
                }
            }
            return html;
        default:
            return `<p>${JSON.stringify(answer)}</p>`;
    }
}


function renderQuestion(question: Question, userAnswer: any, result: QuizResult, path: number[], isSub: boolean): string {
    const isCorrect = result?.isCorrect ?? false;
    let html = `<div class="question-block ${isCorrect ? 'correct' : 'incorrect'} ${isSub ? 'sub-question-block' : ''}">`;

    html += `<h3 class="question-text">${question.originalNumber || ''} ${question.questionText}</h3>`;

    if (!question.subQuestions || question.subQuestions.length === 0) {
        html += `<div class="user-answer"><strong>إجابتك:</strong>${renderAnswer(question, userAnswer)}</div>`;
    }

    if (!isCorrect && result?.correctAnswer) {
         try {
            const parsedCorrectAnswer = typeof result.correctAnswer === 'string'
                ? JSON.parse(result.correctAnswer)
                : result.correctAnswer;
            html += `<div class="correct-answer"><strong>الإجابة الصحيحة:</strong>${renderAnswer(question, parsedCorrectAnswer)}</div>`;
        } catch(e) {
            html += `<div class="correct-answer"><strong>الإجابة الصحيحة:</strong><p>${result.correctAnswer}</p></div>`;
        }
    }

    if (result?.explanation) {
        html += `<div class="explanation"><strong>الشرح:</strong><p>${result.explanation}</p></div>`;
    }
    
    if (question.subQuestions && question.subQuestions.length > 0) {
        question.subQuestions.forEach(subQ => {
             const subResult = (result?.subResults as any[])?.find(r => r.questionId === subQ.id);
             const subAnswer = userAnswer ? userAnswer[subQ.id] : undefined;
             if(subResult) {
                html += renderQuestion(subQ, subAnswer, subResult, [...path, subQ.id], true);
             }
        });
    }

    html += `</div>`;
    return html;
}

export function generateQuizHtml(quiz: Quiz, userAnswers: UserAnswers, quizResults: QuizResults, score: number, total: number): string {
    let bodyContent = `<div class="container">`;
    bodyContent += `<div class="quiz-header"><h1>${quiz.title}</h1>`;
    bodyContent += `<h2>النتيجة: <span class="score">${score}</span><span class="total"> / ${total}</span></h2></div>`;
    
    if (quiz.contextualText) {
        bodyContent += `<div><h3>النص المرفق:</h3><p>${quiz.contextualText.replace(/\n/g, '<br>')}</p></div>`;
    }

    quiz.questions.forEach(q => {
        bodyContent += renderQuestion(q, userAnswers[q.id], quizResults[q.id], [q.id], false);
    });

    bodyContent += `</div>`;

    return `
        <!DOCTYPE html>
        <html lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>نتائج اختبار: ${quiz.title}</title>
            ${getStyles()}
        </head>
        <body>
            ${bodyContent}
        </body>
        </html>
    `;
}