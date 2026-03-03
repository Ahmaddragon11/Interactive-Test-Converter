import { GoogleGenAI, Type, Modality } from "@google/genai";
import { type Quiz, type Question, type UserAnswers, type GradedResult, type QuizResults, type ReviewData } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function generateSpeech(text: string): Promise<string> {
    const model = "gemini-2.5-flash-preview-tts";
    try {
        const response = await ai.models.generateContent({
            model,
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // A pleasant, clear voice
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from API.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error calling Gemini TTS API:", error);
        throw new Error("Failed to generate speech from text.");
    }
}

const questionSchema: any = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.INTEGER, description: 'معرف فريد للسؤال يبدأ من 1.' },
        originalNumber: { type: Type.STRING, description: 'الرقم أو الحرف الأصلي للسؤال كما يظهر في النص المصدر (مثال: "1.", "أ)", "الجزء الثاني"). اتركه فارغًا إذا لم يكن موجودًا.' },
        questionText: { type: Type.STRING, description: 'النص الكامل للسؤال. لأسئلة ملء الفراغ، يجب أن يحتوي النص على placeholder `[BLANK]`.' },
        type: {
            type: Type.STRING,
            description: `نوع السؤال. يجب أن يكون واحدًا من: 'MULTIPLE_CHOICE', 'SHORT_ANSWER', 'ESSAY', 'FILL_IN_THE_BLANK', 'MATCHING', 'TRUE_FALSE', 'TABLE', 'SEQUENCING', 'MULTI_SELECT', 'CLASSIFICATION', 'IMAGE_HOTSPOT', 'DROPDOWN_FILL', 'UNKNOWN'.`,
            enum: ['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'ESSAY', 'FILL_IN_THE_BLANK', 'MATCHING', 'TRUE_FALSE', 'TABLE', 'SEQUENCING', 'MULTI_SELECT', 'CLASSIFICATION', 'IMAGE_HOTSPOT', 'DROPDOWN_FILL', 'UNKNOWN']
        },
        options: { type: Type.ARRAY, description: "فقط لأسئلة 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'MULTI_SELECT'.", items: { type: Type.STRING } },
        prompts: { type: Type.ARRAY, description: "فقط لأسئلة 'MATCHING' (العمود الأول).", items: { type: Type.STRING } },
        matches: { type: Type.ARRAY, description: "فقط لأسئلة 'MATCHING' (العمود الثاني).", items: { type: Type.STRING } },
        headers: { type: Type.ARRAY, description: "فقط لأسئلة 'TABLE' (عناوين الأعمدة).", items: { type: Type.STRING } },
        rows: { type: Type.INTEGER, description: "فقط لأسئلة 'TABLE' (عدد الصفوف).", },
        sequencingItems: { type: Type.ARRAY, description: "فقط لأسئلة 'SEQUENCING' (العناصر المطلوب ترتيبها).", items: { type: Type.STRING } },
        classificationCategories: { type: Type.ARRAY, description: "فقط لأسئلة 'CLASSIFICATION' (أسماء الفئات).", items: { type: Type.STRING } },
        classificationItems: { type: Type.ARRAY, description: "فقط لأسئلة 'CLASSIFICATION' (العناصر المطلوب تصنيفها).", items: { type: Type.STRING } },
        imageUrl: { type: Type.STRING, description: "فقط لأسئلة 'IMAGE_HOTSPOT' (رابط الصورة). استخدم رابط placeholder إذا لم تتوفر صورة حقيقية." },
        imageDescription: { type: Type.STRING, description: "فقط لأسئلة 'IMAGE_HOTSPOT' (وصف للصورة)." },
        dropdownText: { type: Type.STRING, description: "فقط لأسئلة 'DROPDOWN_FILL' (النص مع علامة [BLANK] مكان القائمة)." },
        dropdownOptions: { type: Type.ARRAY, description: "فقط لأسئلة 'DROPDOWN_FILL' (خيارات القائمة المنسدلة).", items: { type: Type.STRING } },
    },
    required: ['id', 'questionText', 'type']
};

// Create a copy for recursion that doesn't cause a circular reference in the object itself.
const questionSchemaForSubquestions = JSON.parse(JSON.stringify(questionSchema));

// Add recursive subQuestions property to the main schema.
questionSchema.properties.subQuestions = {
    type: Type.ARRAY,
    description: "قائمة بالأسئلة الفرعية المتداخلة داخل هذا السؤال.",
    items: questionSchemaForSubquestions
};


const quizSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: 'عنوان جذاب ومختصر للاختبار.' },
        contextualText: { type: Type.STRING, description: 'نص الانطلاق الرئيسي للاختبار إن وجد.' },
        questions: {
            type: Type.ARRAY,
            description: 'قائمة بجميع أسئلة الاختبار.',
            items: questionSchema
        }
    },
    required: ['title', 'questions']
};

const gradedResultSchema: any = {
    type: Type.OBJECT,
    properties: {
        questionId: { type: Type.INTEGER, description: 'معرف السؤال الذي يتم تصحيحه.' },
        isCorrect: { type: Type.BOOLEAN, description: 'هل إجابة المستخدم صحيحة بشكل كامل.' },
        correctAnswer: { type: Type.STRING, description: 'الإجابة الصحيحة والموجزة. للأنواع المعقدة، يجب أن تكون سلسلة JSON.' },
        explanation: { type: Type.STRING, description: 'شرح تعليمي موجز وواضح للإجابة.' },
    },
    required: ['questionId', 'isCorrect', 'explanation']
};

// Create a copy for recursion.
const gradedResultSchemaForSubresults = JSON.parse(JSON.stringify(gradedResultSchema));

gradedResultSchema.properties.subResults = {
    type: Type.ARRAY,
    description: 'نتائج تصحيح الأسئلة الفرعية.',
    items: gradedResultSchemaForSubresults
}

const gradeQuizSchema = {
    type: Type.OBJECT,
    properties: {
        results: {
            type: Type.ARRAY,
            description: 'قائمة بنتائج التصحيح لكل سؤال.',
            items: gradedResultSchema
        }
    },
    required: ['results']
};


const reviewDataSchema = {
    type: Type.OBJECT,
    properties: {
        reviewLesson: { type: Type.STRING, description: 'شرح تعليمي شامل ومفصل من الصفر للمفاهيم التي أخطأ فيها الطالب. استخدم تنسيق Markdown لجعله مقروءاً وجذاباً.' },
        practiceQuiz: quizSchema
    },
    required: ['reviewLesson', 'practiceQuiz']
};

export async function generateReview(quiz: Quiz, userAnswers: any, quizResults: QuizResults): Promise<ReviewData> {
    const model = 'gemini-3.1-pro-preview';

    // Filter only wrong questions
    const wrongQuestions = quiz.questions.filter(q => {
        const res = quizResults[q.id];
        return res && !res.isCorrect;
    });

    if (wrongQuestions.length === 0) {
        throw new Error("لا توجد أخطاء لمراجعتها.");
    }

    const prompt = `
    أنت معلم خبير ومتعاطف. لقد قام أحد طلابك بإجراء اختبار وأخطأ في بعض الأسئلة.
    مهمتك هي:
    1. مراجعة الأسئلة التي أخطأ فيها الطالب وإجاباته الخاطئة.
    2. تقديم شرح تعليمي شامل (reviewLesson) من الصفر للمفاهيم التي أخطأ فيها، بأسلوب مشجع ومبسط. استخدم تنسيق Markdown (عناوين، قوائم، نصوص غامقة) لتنظيم الشرح.
    3. إنشاء اختبار قصير وبسيط (practiceQuiz) يتكون من 3 إلى 5 أسئلة للتأكد من فهمه للمفاهيم التي شرحتها للتو.

    الأسئلة التي أخطأ فيها الطالب مع إجاباته:
    ${JSON.stringify(wrongQuestions.map(q => ({
        question: q.questionText,
        userAnswer: userAnswers[q.id],
        correctAnswer: quizResults[q.id]?.correctAnswer,
        explanation: quizResults[q.id]?.explanation
    })), null, 2)}

    يجب أن يكون الإخراج كائن JSON نقيًا ومطابقًا للمخطط المحدد تمامًا.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: reviewDataSchema,
                temperature: 0.7,
            }
        });

        const text = response.text;
        if (!text) {
            throw new Error("لم يتم تلقي أي رد من النموذج.");
        }

        const reviewData: ReviewData = JSON.parse(text);
        return reviewData;
    } catch (error) {
        console.error("Error generating review:", error);
        throw new Error("حدث خطأ أثناء إنشاء المراجعة. يرجى المحاولة مرة أخرى.");
    }
}

export async function generateQuizFromText(text: string): Promise<Quiz> {
    const model = 'gemini-3.1-pro-preview';
    
    const prompt = `
    أنت خبير فائق الذكاء في تحليل المستندات التعليمية باللغة العربية. مهمتك هي قراءة نص الاختبار التالي وتحويله بدقة فائقة إلى تنسيق JSON منظم ومتكامل.

    يرجى اتباع التعليمات التالية بأقصى درجات الدقة:
    1.  **تحليل شامل:** اقرأ النص بالكامل لتفهم هيكله. حدد عنوانًا مناسبًا، واستخرج "نص الانطلاق" إن وجد.
    2.  **استخراج الأسئلة:** استخرج كل سؤال، بما في ذلك الأسئلة الرئيسية والفرعية المتداخلة داخلها. حافظ على علاقة الأب والابن بين الأسئلة في حقل "subQuestions".
    3.  **تحديد النوع المتقدم:** حدد نوع كل سؤال بدقة من القائمة المتاحة. كن ذكيًا في تحديد الأنواع:
        - 'FILL_IN_THE_BLANK': لأسئلة ملء الفراغات داخل جملة. **هام:** في نص السؤال ('questionText')، استبدل كل فراغ بالرمز الدقيق '[BLANK]'. مثال: "القطط حيوانات [BLANK] وليست [BLANK]."
        - 'TABLE': للأسئلة التي تتطلب ملء جدول. استخرج عناوين الأعمدة في 'headers' وعدد الصفوف الفارغة التي يجب على الطالب تعبئتها في 'rows'.
        - 'SEQUENCING': للأسئلة التي تتطلب ترتيب خطوات، أحداث، أو عناصر.
        - 'MULTI_SELECT': للأسئلة التي لها أكثر من إجابة صحيحة.
        - 'CLASSIFICATION': لأسئلة التصنيف أو توزيع العناصر على فئات.
        - 'DROPDOWN_FILL': لأسئلة ملء الفراغات حيث يتم اختيار الإجابة من قائمة منسدلة. استخدم '[BLANK]' في 'dropdownText' وقم بتوفير الخيارات في 'dropdownOptions'.
    4.  **استخراج الترقيم الأصلي:** لكل سؤال، استخرج الرقم أو العنوان الأصلي كما يظهر في النص (مثال: "1.", "أ)", "السؤال الثالث") وضعه في حقل 'originalNumber'. إذا لم يكن هناك ترقيم واضح، اتركه فارغًا.
    5.  **تعبئة الحقول:** املأ الحقول الخاصة بكل نوع سؤال بدقة (e.g., 'options', 'prompts', 'headers', 'rows', etc.).
    6.  **التنسيق الإلزامي:** يجب أن يكون الإخراج كائن JSON نقيًا ومطابقًا للمخطط المحدد تمامًا، بدون أي نصوص إضافية.

    نص الاختبار:
    ---
    ${text}
    ---
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizSchema,
                temperature: 0.1,
            },
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);

        if (!parsedJson.title || !Array.isArray(parsedJson.questions)) {
            throw new Error("Invalid JSON structure received from API.");
        }

        return parsedJson as Quiz;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to generate quiz from text. The AI model might have failed to parse the document.");
    }
}

export async function generateQuizFromTopic(details: {
  subject: string;
  gradeLevel: string;
  topic: string;
  numQuestions: number;
}): Promise<Quiz> {
  const model = 'gemini-3.1-pro-preview';

  const { subject, gradeLevel, topic, numQuestions } = details;

  const prompt = `
    أنت خبير تعليمي متخصص في إنشاء اختبارات عالية الجودة باللغة العربية. مهمتك هي استخدام بحث Google للعثور على معلومات دقيقة وموثوقة حول الموضوع المحدد، ثم إنشاء اختبار شامل وتفاعلي بناءً على تلك المعلومات.

    التعليمات:
    1.  **بحث معمق:** قم بإجراء بحث عبر الإنترنت باستخدام Google Search للعثور على مواد تعليمية، حقائق، ومفاهيم أساسية حول الموضوع التالي:
        - **المادة:** ${subject}
        - **المستوى الدراسي:** ${gradeLevel}
        - **الموضوع الرئيسي:** ${topic}
    2.  **تحليل وتوليف:** قم بتحليل المعلومات التي وجدتها. استخلص أهم النقاط والمفاهيم التي تناسب المستوى الدراسي المحدد.
    3.  **إنشاء الأسئلة:** بناءً على بحثك، قم بإنشاء اختبار يتكون من حوالي ${numQuestions} سؤالاً.
    4.  **تنوع الأسئلة:** يجب أن تكون الأسئلة متنوعة. استخدم أنواعًا مختلفة مثل 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_THE_BLANK', 'SHORT_ANSWER', 'SEQUENCING', 'MATCHING', و 'CLASSIFICATION'. لا تقتصر على نوع واحد فقط.
    5.  **سياق واضح:** إذا كان ذلك مناسبًا، قم بإنشاء "نص انطلاق" (contextualText) قصير يلخص المفهوم الرئيسي الذي يغطيه الاختبار.
    6.  **تنسيق JSON إلزامي:** يجب أن يكون الإخراج كائن JSON نقيًا ومطابقًا للمخطط (Schema) المحدد تمامًا، بدون أي نصوص إضافية قبله أو بعده. تأكد من ملء جميع الحقول المطلوبة لكل نوع سؤال بشكل صحيح (مثل 'options', 'prompts', 'matches', 'sequencingItems', etc.).
    7. **عنوان مناسب:** قم بإنشاء عنوان جذاب للاختبار في حقل "title".
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        temperature: 0.5,
      },
    });

    const jsonString = response.text.trim();
    const parsedJson = JSON.parse(jsonString);

    if (!parsedJson.title || !Array.isArray(parsedJson.questions)) {
      throw new Error("Invalid JSON structure received from API.");
    }

    return parsedJson as Quiz;
  } catch (error) {
    console.error("Error calling Gemini API with Google Search:", error);
    throw new Error("Failed to generate quiz from topic. The AI model might have failed to find information or generate questions.");
  }
}


export async function gradeQuiz(questions: Question[], userAnswers: UserAnswers): Promise<GradedResult[]> {
    const model = 'gemini-3.1-pro-preview';

    const prompt = `
    أنت بروفيسور وخبير في تصحيح الاختبارات باللغة العربية. مهمتك هي تقييم إجابات الطالب التالية بموضوعية، دقة، وتقديم ملاحظات تعليمية قيمة.

    التعليمات:
    1.  **تقييم دقيق:** لكل سؤال (بما في ذلك الأسئلة الفرعية)، قارن إجابة الطالب بالسؤال.
    2.  **تحديد الصواب والخطأ:** حدد ما إذا كانت الإجابة "صحيحة" (isCorrect: true) أو "خاطئة" (isCorrect: false). للسؤال الرئيسي، يعتبر صحيحًا فقط إذا كانت جميع أسئلته الفرعية صحيحة.
    3.  **الإجابة النموذجية:** إذا كانت إجابة الطالب خاطئة، قدم الإجابة الصحيحة (correctAnswer). للأنواع المعقدة التالية، قدم الإجابة الصحيحة **كسلسلة JSON واضحة**:
        - 'MATCHING': كائن يربط كل prompt بـ match الصحيح.
        - 'TABLE': مصفوفة ثنائية الأبعاد (مصفوفة من المصفوفات) تمثل الصفوف والخلايا الصحيحة.
        - 'SEQUENCING': مصفوفة بالعناصر مرتبة ترتيبًا صحيحًا.
        - 'CLASSIFICATION': كائن تكون فيه المفاتيح هي أسماء الفئات والقيم هي مصفوفات بالعناصر المصنفة بشكل صحيح.
        - 'FILL_IN_THE_BLANK': مصفوفة من السلاسل النصية تمثل الإجابات الصحيحة للفراغات بالترتيب.
        - 'MULTI_SELECT': مصفوفة بالإجابات الصحيحة.
    4.  **شرح تعليمي:** قدم شرحًا (explanation) واضحًا ومختصرًا لكل إجابة، موضحًا سبب صحتها أو خطئها بأسلوب يساعد الطالب على التعلم والفهم.
    5.  **التنسيق الإلزامي:** قم بتنسيق الإخراج ككائن JSON يطابق المخطط المحدد تمامًا، بما في ذلك النتائج المتداخلة في 'subResults'.

    الأسئلة وإجابات الطالب:
    ---
    ${JSON.stringify({ questions, userAnswers }, null, 2)}
    ---
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: gradeQuizSchema,
                temperature: 0.2,
            },
        });
        
        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);

        if (!Array.isArray(parsedJson.results)) {
            throw new Error("Invalid JSON structure received from grading API.");
        }
        
        return parsedJson.results as GradedResult[];
    } catch (error) {
        console.error("Error calling Gemini API for grading:", error);
        throw new Error("Failed to grade quiz. The AI model might have encountered an issue.");
    }
}
