import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Form, QuestionType, FormMode, FormLayout } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Schema definition for the AI response
const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    type: { type: Type.STRING, enum: Object.values(QuestionType) },
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    required: { type: Type.BOOLEAN },
    validation: {
        type: Type.OBJECT,
        properties: {
            minLength: { type: Type.INTEGER },
            maxLength: { type: Type.INTEGER },
            pattern: { type: Type.STRING, description: "Regex pattern for text validation" },
            min: { type: Type.NUMBER },
            max: { type: Type.NUMBER },
            allowedFileTypes: { type: Type.ARRAY, items: { type: Type.STRING } },
            maxFileSizeMB: { type: Type.INTEGER },
            customErrorMessage: { type: Type.STRING }
        }
    },
    options: { type: Type.ARRAY, items: { type: Type.STRING } },
    rows: { type: Type.ARRAY, items: { type: Type.STRING }, description: "For Matrix type only" },
    columns: { type: Type.ARRAY, items: { type: Type.STRING }, description: "For Matrix type only" },
    ratingMax: { type: Type.INTEGER, description: "Max stars for Rating type (e.g., 5 or 10)" },
    repeatable: { type: Type.BOOLEAN },
    maxRepeats: { type: Type.INTEGER },
    points: { type: Type.INTEGER },
    correctAnswer: { 
        type: Type.STRING, 
        description: "The correct answer for quizzes. For checkboxes, use comma separated values." 
    },
    isLocked: { type: Type.BOOLEAN, description: "If true, this question will not be shuffled." },
    subQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, enum: Object.values(QuestionType).filter(t => t !== 'group') },
          title: { type: Type.STRING },
          required: { type: Type.BOOLEAN },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          points: { type: Type.INTEGER },
          correctAnswer: { type: Type.STRING }
        }
      }
    }
  },
  required: ['id', 'type', 'title', 'required']
};

const themeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    primaryColor: { type: Type.STRING, description: "Hex color code" },
    backgroundColor: { type: Type.STRING, description: "Hex color code" },
    textColor: { type: Type.STRING, description: "Hex color code" },
    fontFamily: { type: Type.STRING, enum: ['Inter', 'Roboto', 'Playfair Display', 'Montserrat', 'Lato'] },
  }
};

const settingsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    timeLimit: { type: Type.INTEGER, description: "Time limit in minutes (optional)" },
    allowBackNavigation: { type: Type.BOOLEAN },
    showProgressBar: { type: Type.BOOLEAN },
    shuffleQuestions: { type: Type.BOOLEAN },
    shuffleOptions: { type: Type.BOOLEAN },
    enableReview: { type: Type.BOOLEAN, description: "Allow users to review answers/correctness after submission" }
  }
};

const welcomeScreenSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A catchy engaging title for the welcome screen" },
        description: { type: Type.STRING, description: "Brief instructions or welcome message" },
        buttonText: { type: Type.STRING, description: "Button label, e.g., 'Start Quiz'" }
    }
};

const formSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    welcomeScreen: welcomeScreenSchema,
    mode: { type: Type.STRING, enum: ['quiz', 'survey'] },
    layout: { type: Type.STRING, enum: ['step', 'scroll'] },
    questions: {
      type: Type.ARRAY,
      items: questionSchema
    },
    theme: themeSchema,
    settings: settingsSchema
  },
  required: ['title', 'description', 'mode', 'layout', 'questions']
};

export const generateFormWithAI = async (prompt: string): Promise<Partial<Form>> => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert form architect. Generate a complete JSON form configuration based on this detailed user description: "${prompt}".

      Apply the following logic to parse complex instructions:
      1. **Nested Logic & Groups**: If the user asks for sections, repeatable lists (e.g., "add multiple family members"), or grouped fields (e.g., "address details"), use the 'GROUP' type with 'subQuestions'.
      2. **Smart Type Inference**:
         - "Upload CV/Resume" -> FILE with allowedFileTypes: ['.pdf', '.doc', '.docx']
         - "Date of birth" -> DATE
         - "Satisfaction score" -> RATING or OPINION_SCALE
         - "Signature" -> SIGNATURE
      3. **Deep Validation**: Infer validation rules from context:
         - "Phone number" -> type: PHONE, pattern: "^\\+?[1-9]\\d{1,14}$", customErrorMessage: "Invalid phone number"
         - "Zip code" -> type: TEXT, pattern: "^\\d{5}(-\\d{4})?$"
         - "Essay (min 100 words)" -> type: TEXT, validation: { minLength: 500 }
         - "Official Email" -> type: EMAIL, pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
      4. **Quiz Logic**: 
         - If the description implies a knowledge test, trivia, or exam, set mode='quiz'.
         - You MUST generate plausible 'correctAnswer' and 'points' for every question in a quiz.
         - For checkboxes, 'correctAnswer' should be a comma-separated string of all correct options.
      5. **Theme & Mood**: Analyze the topic to generate a matching theme (e.g., "Halloween" -> orange/black, "Medical" -> teal/white/clean, "Luxury" -> gold/black/serif).
      6. **Settings Configuration**: 
         - "Speed run" or "Timed" -> set settings.timeLimit.
         - "Strict" -> disable settings.allowBackNavigation.
         - "Randomized" -> enable settings.shuffleQuestions.

      Generate a cohesive, professional form structure. Return ONLY the JSON matching the defined schema.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: formSchema,
        thinkingConfig: { thinkingBudget: 1024 } 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const data = JSON.parse(text);
    // Hydrate defaults if missing from AI
    return {
        ...data,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        // Analytics Defaults
        views: 0,
        submissionCount: 0,
        avgCompletionTime: 0,
        welcomeScreen: {
            title: data.title || 'Welcome',
            description: data.description || 'Please fill out this form.',
            buttonText: 'Start',
            ...data.welcomeScreen
        },
        settings: {
            allowBackNavigation: true,
            showProgressBar: true,
            shuffleQuestions: false,
            shuffleOptions: false,
            enableReview: true,
            ...data.settings
        },
        theme: {
            primaryColor: '#0445AF',
            backgroundColor: '#ffffff',
            textColor: '#111827',
            fontFamily: 'Inter',
            ...data.theme
        }
    } as Form;

  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};