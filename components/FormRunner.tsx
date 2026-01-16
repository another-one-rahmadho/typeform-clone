import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Form, Question, QuestionType, AnswerValue } from '../types';
import { ChevronDown, Check, Upload, Plus, Trash2, ArrowRight, CheckCircle, Clock, X, AlertCircle, Calendar, Star, PenTool, Eraser } from 'lucide-react';

interface FormRunnerProps {
  form: Form;
  onClose: () => void;
  onSubmit?: (answers: Record<string, any>, score?: number, maxScore?: number, timeTaken?: number) => void;
}

const SignaturePad: React.FC<{ value?: string, onChange: (val: string) => void, readOnly?: boolean }> = ({ value, onChange, readOnly }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const ctx = canvas.getContext('2d');
            if (ctx && value) {
                const img = new Image();
                img.onload = () => ctx.drawImage(img, 0, 0);
                img.src = value;
            }
        }
    }, []);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (readOnly) return;
        setIsDrawing(true);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            const rect = canvas.getBoundingClientRect();
            const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
            const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || readOnly) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            const rect = canvas.getBoundingClientRect();
            const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
            const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        if (isDrawing && !readOnly) {
             const canvas = canvasRef.current;
             if (canvas) {
                 onChange(canvas.toDataURL());
             }
        }
        setIsDrawing(false);
    };

    const clear = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (readOnly) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            onChange('');
        }
    };

    return (
        <div className="border-2 border-gray-300 border-dashed rounded-lg bg-white relative w-full h-40 overflow-hidden touch-none">
            <canvas 
                ref={canvasRef}
                className="w-full h-full cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />
            {!readOnly && (
                <button 
                    onClick={clear}
                    className="absolute top-2 right-2 p-1.5 bg-gray-100 rounded-md text-gray-500 hover:text-red-500 hover:bg-red-50"
                    title="Clear Signature"
                >
                    <Eraser size={16} />
                </button>
            )}
            {!value && !isDrawing && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300">Sign Here</div>}
        </div>
    );
};

const QuestionRenderer: React.FC<{
  question: Question;
  value: any;
  onChange: (val: any) => void;
  error?: string | null;
  isSubQuestion?: boolean;
  themeColor: string;
  shuffleOptions?: boolean;
  readOnly?: boolean;
}> = ({ question, value, onChange, error, isSubQuestion = false, themeColor, shuffleOptions = false, readOnly = false }) => {
  
  const handleChange = (val: any) => !readOnly && onChange(val);

  // Memoize displayed options so they don't reshuffle on every render
  const displayOptions = useMemo(() => {
      if (!question.options) return [];
      if (shuffleOptions && !readOnly) {
          return [...question.options].sort(() => Math.random() - 0.5);
      }
      return question.options;
  }, [question.options, shuffleOptions, readOnly]);

  const ErrorMessage = () => {
      if (!error) return null;
      return (
          <div className="flex items-center gap-2 text-red-500 text-sm mt-2 animate-fade-in">
              <AlertCircle size={14} />
              <span>{error}</span>
          </div>
      );
  };

  const renderContent = () => {
    switch (question.type) {
        case QuestionType.TEXT:
        case QuestionType.EMAIL:
        case QuestionType.PHONE:
          return (
            <input
              type={question.type === QuestionType.EMAIL ? 'email' : question.type === QuestionType.PHONE ? 'tel' : 'text'}
              className={`w-full p-3 bg-transparent border-b-2 outline-none transition-colors text-xl placeholder-gray-400 ${
                error ? 'border-red-500' : 'border-gray-300 focus:border-[var(--theme-color)]'
              }`}
              style={{ '--theme-color': themeColor } as React.CSSProperties}
              placeholder={readOnly ? "" : "Type your answer here..."}
              value={value || ''}
              onChange={(e) => handleChange(e.target.value)}
              disabled={readOnly}
            />
          );
    
        case QuestionType.DATE:
        case QuestionType.TIME:
            return (
                 <div className="relative w-full max-w-xs">
                    <input
                        type={question.type === QuestionType.DATE ? 'date' : 'time'}
                        className={`w-full p-3 bg-white border-2 rounded-lg outline-none text-lg ${
                             error ? 'border-red-500' : 'border-gray-200 focus:border-[var(--theme-color)]'
                        }`}
                        style={{ '--theme-color': themeColor } as React.CSSProperties}
                        value={value || ''}
                        onChange={(e) => handleChange(e.target.value)}
                        disabled={readOnly}
                    />
                 </div>
            );
    
        case QuestionType.MULTIPLE_CHOICE:
        case QuestionType.DROPDOWN:
          if (question.type === QuestionType.DROPDOWN) {
             return (
                 <div className="relative">
                     <select
                        className={`w-full p-3 bg-white border-2 rounded-lg outline-none appearance-none cursor-pointer text-lg ${
                            error ? 'border-red-500' : 'border-gray-200 focus:border-[var(--theme-color)]'
                        }`}
                        style={{ '--theme-color': themeColor } as React.CSSProperties}
                        value={value || ''}
                        onChange={(e) => handleChange(e.target.value)}
                        disabled={readOnly}
                     >
                         <option value="" disabled>Select an option</option>
                         {displayOptions.map((opt, idx) => (
                             <option key={idx} value={opt}>{opt}</option>
                         ))}
                     </select>
                     <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                 </div>
             )
          }
          return (
            <div className="flex flex-col gap-3">
              {displayOptions.map((opt, idx) => (
                <button
                  key={idx}
                  className={`p-4 text-left border-2 rounded-lg transition-all flex items-center justify-between group ${readOnly ? 'cursor-default' : ''}`}
                  style={{
                      borderColor: value === opt ? themeColor : (error ? '#fca5a5' : '#e5e7eb'),
                      backgroundColor: value === opt ? `${themeColor}10` : 'white', // 10% opacity hex
                      color: value === opt ? themeColor : 'inherit',
                      fontWeight: value === opt ? 600 : 400
                  }}
                  onClick={() => handleChange(opt)}
                  disabled={readOnly}
                >
                  <span className="flex items-center gap-3">
                    <span 
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center`}
                        style={{
                            borderColor: value === opt ? themeColor : '#d1d5db',
                            backgroundColor: value === opt ? themeColor : 'transparent'
                        }}
                    >
                        {value === opt && <Check size={14} className="text-white" />}
                    </span>
                    {opt}
                  </span>
                </button>
              ))}
            </div>
          );
    
        case QuestionType.CHECKBOX:
            const selected = (Array.isArray(value) ? value : []) as string[];
            const toggle = (opt: string) => {
                if (readOnly) return;
                if (selected.includes(opt)) {
                    handleChange(selected.filter(s => s !== opt));
                } else {
                    handleChange([...selected, opt]);
                }
            };
            return (
                <div className="flex flex-col gap-3">
                {displayOptions.map((opt, idx) => {
                    const isSelected = selected.includes(opt);
                    return (
                        <button
                            key={idx}
                            className={`p-4 text-left border-2 rounded-lg transition-all flex items-center justify-between group ${readOnly ? 'cursor-default' : ''}`}
                            style={{
                                borderColor: isSelected ? themeColor : (error ? '#fca5a5' : '#e5e7eb'),
                                backgroundColor: isSelected ? `${themeColor}10` : 'white',
                                color: isSelected ? themeColor : 'inherit',
                                fontWeight: isSelected ? 600 : 400
                            }}
                            onClick={() => toggle(opt)}
                            disabled={readOnly}
                        >
                        <span className="flex items-center gap-3">
                            <span 
                                className={`w-6 h-6 rounded flex items-center justify-center border-2`}
                                style={{
                                    borderColor: isSelected ? themeColor : '#d1d5db',
                                    backgroundColor: isSelected ? themeColor : 'transparent'
                                }}
                            >
                                {isSelected && <Check size={14} className="text-white" />}
                            </span>
                            {opt}
                        </span>
                        </button>
                    );
                })}
                </div>
            );
    
        case QuestionType.RATING:
            const maxStars = question.ratingMax || 5;
            return (
                <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: maxStars }, (_, i) => i + 1).map((num) => (
                        <button
                            key={num}
                            onClick={() => handleChange(num)}
                            disabled={readOnly}
                            className={`transition-all transform hover:scale-110 ${readOnly ? 'cursor-default' : ''}`}
                        >
                             <Star 
                                size={32} 
                                fill={value >= num ? themeColor : 'none'} 
                                color={value >= num ? themeColor : '#d1d5db'}
                                className="transition-colors duration-200"
                             />
                        </button>
                    ))}
                </div>
            );
    
        case QuestionType.OPINION_SCALE:
            return (
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                     {Array.from({ length: 11 }, (_, i) => i).map((num) => (
                        <button
                            key={num}
                            onClick={() => handleChange(num)}
                            disabled={readOnly}
                            className={`w-10 h-14 sm:w-12 sm:h-16 flex items-center justify-center border-2 rounded transition-all font-medium ${readOnly ? 'cursor-default' : ''}`}
                             style={{
                                borderColor: value === num ? themeColor : (error ? '#fca5a5' : '#e5e7eb'),
                                backgroundColor: value === num ? themeColor : 'white',
                                color: value === num ? 'white' : '#4b5563',
                                transform: value === num ? 'translateY(-4px)' : 'none'
                            }}
                        >
                            {num}
                        </button>
                     ))}
                     <div className="w-full flex justify-between text-xs text-gray-400 px-1 mt-1">
                         <span>Not likely</span>
                         <span>Extremely likely</span>
                     </div>
                </div>
            );
    
        case QuestionType.MATRIX:
            const matrixAnswers = (value as Record<string, string>) || {};
            return (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] text-sm text-left">
                        <thead>
                            <tr>
                                <th className="p-2"></th>
                                {question.columns?.map((col, i) => (
                                    <th key={i} className="p-2 text-center text-gray-500 font-medium">{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {question.rows?.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium text-gray-700">{row}</td>
                                    {question.columns?.map((col, cIdx) => (
                                        <td key={cIdx} className="p-3 text-center">
                                            <label className="flex items-center justify-center w-full h-full cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    name={`matrix-${question.id}-${row}`}
                                                    checked={matrixAnswers[row] === col}
                                                    onChange={() => handleChange({ ...matrixAnswers, [row]: col })}
                                                    className="w-5 h-5 border-gray-300 text-[var(--theme-color)] focus:ring-[var(--theme-color)]"
                                                    style={{ '--theme-color': themeColor } as React.CSSProperties}
                                                    disabled={readOnly}
                                                />
                                            </label>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
    
        case QuestionType.SIGNATURE:
            return (
                 <SignaturePad 
                    value={value as string} 
                    onChange={handleChange} 
                    readOnly={readOnly} 
                 />
            );
    
        case QuestionType.FILE:
            return (
                <div className="relative">
                    <input
                        type="file"
                        id={`file-${question.id}`}
                        className="hidden"
                        accept={question.validation?.allowedFileTypes?.join(',')}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleChange(file.name); 
                        }}
                        disabled={readOnly}
                    />
                    <label
                        htmlFor={`file-${question.id}`}
                        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                            error ? 'border-red-500 bg-red-50/10' : 'border-gray-300'
                        } ${readOnly ? 'pointer-events-none bg-gray-50' : ''}`}
                    >
                        <Upload size={24} className="text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">{value ? `Selected: ${value}` : 'Click to upload a file'}</span>
                        {question.validation?.allowedFileTypes && (
                            <span className="text-xs text-gray-400 mt-1">Allowed: {question.validation.allowedFileTypes.join(', ')}</span>
                        )}
                    </label>
                </div>
            );
        
        case QuestionType.GROUP:
            return null;
    
        default:
          return <p className="text-red-500">Unsupported type</p>;
      }
  }

  return (
      <div>
          {renderContent()}
          <ErrorMessage />
      </div>
  )
};

const GroupQuestionRenderer: React.FC<{
    question: Question;
    value: Record<string, any>[];
    onChange: (val: Record<string, any>[]) => void;
    themeColor: string;
    shuffleOptions: boolean;
    errors?: Record<string, string>; // Errors for specific group item indices like "0-subQId"
}> = ({ question, value = [], onChange, themeColor, shuffleOptions, errors }) => {
    
    useEffect(() => {
        if (value.length === 0) {
            onChange([{}]);
        }
    }, []);

    const updateGroupItem = (index: number, subQId: string, subValue: any) => {
        const newValue = [...value];
        if (!newValue[index]) newValue[index] = {};
        newValue[index] = { ...newValue[index], [subQId]: subValue };
        onChange(newValue);
    };

    const addGroup = () => {
        if (question.maxRepeats && value.length >= question.maxRepeats) return;
        onChange([...value, {}]);
    };

    const removeGroup = (index: number) => {
        if (value.length <= 1) return;
        const newValue = [...value];
        newValue.splice(index, 1);
        onChange(newValue);
    };

    return (
        <div className="space-y-6">
            {value.map((groupAnswers, index) => (
                <div key={index} className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm relative animate-fade-in">
                    {question.repeatable && value.length > 1 && (
                        <button 
                            onClick={() => removeGroup(index)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove this entry"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                        Entry #{index + 1}
                    </h4>
                    <div className="space-y-6">
                        {question.subQuestions?.map(subQ => {
                            const errorKey = `${index}-${subQ.id}`;
                            const err = errors ? errors[errorKey] : null;

                            return (
                                <div key={subQ.id}>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        {subQ.title} {subQ.required && <span className="text-red-500">*</span>}
                                    </label>
                                    <QuestionRenderer
                                        question={subQ}
                                        value={groupAnswers[subQ.id]}
                                        onChange={(val) => updateGroupItem(index, subQ.id, val)}
                                        isSubQuestion
                                        themeColor={themeColor}
                                        shuffleOptions={shuffleOptions}
                                        error={err}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
            
            {question.repeatable && (!question.maxRepeats || value.length < question.maxRepeats) && (
                <button
                    onClick={addGroup}
                    className="flex items-center gap-2 font-medium px-4 py-2 rounded-lg transition-colors"
                    style={{ color: themeColor, backgroundColor: `${themeColor}10` }}
                >
                    <Plus size={18} />
                    Add Another
                </button>
            )}
        </div>
    );
};


export default function FormRunner({ form, onClose, onSubmit }: FormRunnerProps) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isStarted, setIsStarted] = useState(!form.welcomeScreen); 
  const [isCompleted, setIsCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  
  // Validation State: Map of "questionId" -> "Error Message"
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [showResultsReview, setShowResultsReview] = useState(false);

  // Initialize randomized questions
  const [questionsToRender] = useState(() => {
      if (form.settings.shuffleQuestions) {
          const unlockedQuestions = form.questions.filter(q => !q.isLocked);
          const shuffledUnlocked = [...unlockedQuestions].sort(() => Math.random() - 0.5);
          
          let unlockedIndex = 0;
          return form.questions.map(q => {
              if (q.isLocked) {
                  return q;
              } else {
                  return shuffledUnlocked[unlockedIndex++];
              }
          });
      }
      return form.questions;
  });

  const calculateScore = () => {
      let earned = 0;
      let total = 0;

      questionsToRender.forEach(q => {
          if (!q.points || !q.correctAnswer) return;
          total += q.points;

          const userAns = answers[q.id];
          
          if (q.type === QuestionType.CHECKBOX && Array.isArray(userAns)) {
              const correct = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
              if (userAns.length === correct.length && userAns.every(v => correct.includes(v))) {
                  earned += q.points;
              }
          } else {
              if (userAns == q.correctAnswer) {
                  earned += q.points;
              }
          }
      });
      return { earned, total };
  };

  useEffect(() => {
    if (isStarted) {
        // Reset start time when actually starting the form (past welcome screen)
        startTimeRef.current = Date.now();
        if (form.settings?.timeLimit) {
            setTimeLeft(form.settings.timeLimit * 60); 
        }
    }
  }, [isStarted, form.settings?.timeLimit]);

  useEffect(() => {
    if (timeLeft === null || !isStarted || isCompleted) return;
    if (timeLeft === 0) {
        submit();
        return;
    }
    const timer = setInterval(() => {
        setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isStarted, isCompleted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleAnswerChange = (qId: string, val: any) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
    // Clear error when user types
    if (validationErrors[qId]) {
        const newErrors = { ...validationErrors };
        delete newErrors[qId];
        setValidationErrors(newErrors);
    }
    if (Object.keys(validationErrors).some(k => k.startsWith(qId + '-'))) {
         const newErrors = { ...validationErrors };
         Object.keys(newErrors).forEach(k => {
             if (k.startsWith(qId + '-')) delete newErrors[k];
         });
         setValidationErrors(newErrors);
    }
  };

  const validateValue = (q: Question, value: any): string | null => {
      if (q.required) {
          const isEmpty = 
              value === undefined || 
              value === null || 
              value === '' || 
              (Array.isArray(value) && value.length === 0) ||
              (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0);

          if (isEmpty) return "This field is required.";
      }

      if (!value && value !== 0 && !q.required) return null;

      if (q.validation) {
          const { minLength, maxLength, pattern, min, max, allowedFileTypes, customErrorMessage } = q.validation;

          if (typeof value === 'string') {
              if (minLength && value.length < minLength) return customErrorMessage || `Must be at least ${minLength} characters.`;
              if (maxLength && value.length > maxLength) return customErrorMessage || `Must be no more than ${maxLength} characters.`;
              
              if (pattern) {
                  try {
                      const regex = new RegExp(pattern);
                      if (!regex.test(value)) return customErrorMessage || "Invalid format.";
                  } catch (e) {
                      console.error("Invalid regex pattern defined in form", pattern);
                  }
              }
          }

          if (typeof value === 'number') {
               if (min !== undefined && value < min) return customErrorMessage || `Minimum value is ${min}.`;
               if (max !== undefined && value > max) return customErrorMessage || `Maximum value is ${max}.`;
          }

          if (q.type === QuestionType.FILE && typeof value === 'string' && allowedFileTypes && allowedFileTypes.length > 0) {
              const ext = '.' + value.split('.').pop()?.toLowerCase();
              const isAllowed = allowedFileTypes.some(type => {
                  if (type.endsWith('/*')) {
                      const base = type.split('/')[0];
                      return ['png','jpg','jpeg','gif','webp'].includes(ext.replace('.','')); 
                  }
                  return type.toLowerCase() === ext;
              });
              
              if (!isAllowed) return customErrorMessage || `File type not allowed.`;
          }
      }

      if (q.type === QuestionType.MATRIX && q.required) {
          const matrixAns = (value as Record<string, string>) || {};
          const missingRows = (q.rows || []).some(row => !matrixAns[row]);
          if (missingRows) return "Please complete all rows.";
      }

      return null;
  };

  const validateStep = (index: number): boolean => {
      const q = questionsToRender[index];
      const ans = answers[q.id];
      const newErrors: Record<string, string> = {};

      if (q.type === QuestionType.GROUP) {
          const groupItems = (ans as Record<string, any>[]) || [{}];
          
          groupItems.forEach((item, itemIndex) => {
              q.subQuestions?.forEach(subQ => {
                  const subError = validateValue(subQ, item[subQ.id]);
                  if (subError) {
                      newErrors[`${q.id}-${itemIndex}-${subQ.id}`] = subError;
                  }
              });
          });
      } else {
          const error = validateValue(q, ans);
          if (error) {
              newErrors[q.id] = error;
          }
      }

      setValidationErrors(prev => ({ ...prev, ...newErrors }));
      return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (currentStep < questionsToRender.length - 1) {
      if (validateStep(currentStep)) {
        setCurrentStep(prev => prev + 1);
        setValidationErrors({});
      }
    } else {
      submit();
    }
  };

  const prevStep = () => {
    if (form.settings?.allowBackNavigation === false) return;
    if (currentStep > 0) {
        setCurrentStep(prev => prev - 1);
        setValidationErrors({});
    }
  };

  const submit = () => {
     let isValid = true;
     
     if (form.layout === 'step') {
         if (!validateStep(currentStep) && timeLeft !== 0) {
             isValid = false;
         }
     } else {
         const allErrors: Record<string, string> = {};
         let firstErrorId = null;

         questionsToRender.forEach(q => {
             const ans = answers[q.id];
             if (q.type === QuestionType.GROUP) {
                const groupItems = (ans as Record<string, any>[]) || [{}];
                groupItems.forEach((item, itemIndex) => {
                    q.subQuestions?.forEach(subQ => {
                        const subError = validateValue(subQ, item[subQ.id]);
                        if (subError) {
                            allErrors[`${q.id}-${itemIndex}-${subQ.id}`] = subError;
                            if (!firstErrorId) firstErrorId = `question-${q.id}`; 
                        }
                    });
                });
             } else {
                 const error = validateValue(q, ans);
                 if (error) {
                     allErrors[q.id] = error;
                     if (!firstErrorId) firstErrorId = `question-${q.id}`;
                 }
             }
         });

         setValidationErrors(allErrors);
         
         if (Object.keys(allErrors).length > 0 && timeLeft !== 0) {
             isValid = false;
             if (firstErrorId) {
                 const el = document.getElementById(firstErrorId);
                 el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
             }
             alert("Please correct the errors in the form.");
         }
     }
     
     if (!isValid && timeLeft !== 0) return;

     let finalScore = 0;
     let finalMaxScore = 0;

     if (form.mode === 'quiz') {
         const { earned, total } = calculateScore();
         finalScore = earned;
         finalMaxScore = total;
         setScore(earned);
         setMaxScore(total);
     }

     const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

     setIsCompleted(true);
     if (onSubmit) {
         if (form.mode === 'quiz') {
            onSubmit(answers, finalScore, finalMaxScore, durationSeconds);
         } else {
            onSubmit(answers, undefined, undefined, durationSeconds);
         }
     }
  };

  // --- Styles ---
  const theme = {
      bg: form.theme?.backgroundColor || '#ffffff',
      text: form.theme?.textColor || '#111827',
      primary: form.theme?.primaryColor || '#0445AF',
      font: form.theme?.fontFamily || 'Inter'
  };

  const containerStyle = {
      backgroundColor: theme.bg,
      color: theme.text,
      fontFamily: theme.font
  };

  // --- WELCOME SCREEN ---
  if (!isStarted) {
      return (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8 text-center animate-fade-in" style={containerStyle}>
              {form.theme?.coverImageUrl && (
                <div 
                    className="absolute inset-0 opacity-10 bg-cover bg-center z-0 pointer-events-none"
                    style={{ backgroundImage: `url(${form.theme.coverImageUrl})` }}
                />
            )}
              <div className="relative z-10 max-w-2xl">
                  {form.theme?.logoUrl && <img src={form.theme.logoUrl} alt="Logo" className="h-20 mx-auto mb-8 object-contain" />}
                  <h1 className="text-5xl font-bold mb-6">{form.welcomeScreen?.title}</h1>
                  <p className="text-xl opacity-70 mb-10 leading-relaxed">{form.welcomeScreen?.description}</p>
                  <button 
                    onClick={() => setIsStarted(true)}
                    className="px-10 py-4 rounded-xl text-white text-xl font-medium shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1"
                    style={{ backgroundColor: theme.primary }}
                  >
                      {form.welcomeScreen?.buttonText || 'Start'}
                  </button>
                  {form.settings?.timeLimit && (
                      <div className="mt-6 flex items-center justify-center gap-2 text-sm opacity-60">
                          <Clock size={16} />
                          <span>Timed: {form.settings.timeLimit} minutes</span>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // --- COMPLETED / RESULTS SCREEN ---
  if (isCompleted) {
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center p-6 animate-fade-in overflow-y-auto" style={containerStyle}>
        
        {!showResultsReview ? (
            <div className="flex flex-col items-center justify-center min-h-full max-w-lg text-center">
                {form.mode === 'quiz' ? (
                    <>
                        <div className="relative w-40 h-40 mb-8">
                             <svg className="w-full h-full" viewBox="0 0 100 100">
                                 <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                                 <circle 
                                    cx="50" cy="50" r="45" fill="none" stroke={theme.primary} strokeWidth="10" 
                                    strokeDasharray={`${percentage * 2.82} 282`}
                                    strokeDashoffset="0"
                                    transform="rotate(-90 50 50)"
                                    className="transition-all duration-1000 ease-out"
                                 />
                             </svg>
                             <div className="absolute inset-0 flex flex-col items-center justify-center">
                                 <span className="text-3xl font-bold">{percentage}%</span>
                                 <span className="text-sm opacity-60">Score</span>
                             </div>
                        </div>
                        <h2 className="text-3xl font-bold mb-2">Quiz Completed!</h2>
                        <p className="text-xl opacity-70 mb-8">You scored {score} out of {maxScore} points.</p>
                        
                        <div className="flex flex-col gap-3 w-full">
                            {(form.settings.enableReview !== false) && (
                                <button 
                                    onClick={() => setShowResultsReview(true)}
                                    className="w-full py-3 rounded-lg font-medium border-2 transition-colors"
                                    style={{ borderColor: theme.primary, color: theme.primary }}
                                >
                                    Review Answers
                                </button>
                            )}
                            <button 
                                onClick={onClose}
                                className="w-full py-3 rounded-lg text-white font-medium shadow-md transition-opacity hover:opacity-90"
                                style={{ backgroundColor: theme.primary }}
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                         <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: `${theme.primary}20` }}>
                            <CheckCircle size={40} style={{ color: theme.primary }} />
                        </div>
                        <h2 className="text-3xl font-bold mb-2">Thank you!</h2>
                        <p className="opacity-70 max-w-md">Your response has been recorded successfully.</p>
                        <button 
                        onClick={onClose}
                        className="mt-8 px-8 py-3 rounded-lg text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: theme.primary }}
                        >
                        Back to Dashboard
                        </button>
                    </>
                )}
            </div>
        ) : (
            <div className="w-full max-w-3xl py-12">
                 <div className="flex items-center justify-between mb-8">
                     <h2 className="text-2xl font-bold">Review Answers</h2>
                     <button onClick={() => setShowResultsReview(false)} className="text-sm font-medium opacity-60 hover:opacity-100">Close Review</button>
                 </div>
                 
                 <div className="space-y-8">
                     {questionsToRender.map((q, idx) => {
                         const userAns = answers[q.id];
                         const hasCorrectAnswer = q.correctAnswer !== undefined && q.correctAnswer !== null && (Array.isArray(q.correctAnswer) ? q.correctAnswer.length > 0 : q.correctAnswer !== '');
                         let isCorrect = false;
                         
                         if (hasCorrectAnswer) {
                             if (q.type === QuestionType.CHECKBOX && Array.isArray(userAns)) {
                                const correct = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
                                isCorrect = userAns.length === correct.length && userAns.every(v => correct.includes(v));
                             } else {
                                isCorrect = userAns == q.correctAnswer;
                             }
                         }
                         
                         let borderClass = 'border-gray-200 bg-white';
                         if (hasCorrectAnswer) {
                             borderClass = isCorrect ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30';
                         }

                         return (
                             <div key={q.id} className={`p-6 rounded-xl border-2 ${borderClass}`}>
                                 <div className="flex items-start gap-3 mb-4">
                                     {hasCorrectAnswer ? (
                                         isCorrect ? <CheckCircle className="text-green-500 mt-1" size={20}/> : <X className="text-red-500 mt-1" size={20}/>
                                     ) : (
                                         <div className="mt-1 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                                             <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                         </div>
                                     )}
                                     <div>
                                         <h3 className="font-semibold text-lg">{q.title}</h3>
                                         <p className="text-sm opacity-60">
                                            {hasCorrectAnswer ? `Points: ${isCorrect ? q.points : 0}/${q.points || 0}` : 'No points assigned'}
                                         </p>
                                     </div>
                                 </div>
                                 
                                 <div className="pl-8 space-y-2">
                                     <div className="text-sm">
                                         <span className="font-medium opacity-70">Your Answer:</span>
                                         <div className="font-medium mt-1">
                                            {q.type === QuestionType.SIGNATURE && userAns ? (
                                                <img src={userAns as string} alt="Signature" className="h-20 border border-gray-200 rounded bg-white" />
                                            ) : (
                                                Array.isArray(userAns) ? userAns.join(', ') : (typeof userAns === 'object' ? JSON.stringify(userAns) : (userAns || '-'))
                                            )}
                                         </div>
                                     </div>
                                     {hasCorrectAnswer && !isCorrect && (
                                         <div className="text-sm mt-3 pt-3 border-t border-black/5">
                                             <span className="font-medium text-green-700">Correct Answer:</span>
                                             <div className="font-medium text-green-700 mt-1">
                                                 {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             </div>
                         )
                     })}
                 </div>
                 
                 <div className="mt-8 text-center">
                     <button onClick={onClose} className="text-gray-500 hover:text-gray-900 font-medium">Exit Review</button>
                 </div>
            </div>
        )}
      </div>
    );
  }

  // --- SCROLL LAYOUT ---
  if (form.layout === 'scroll') {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto animate-fade-in" style={containerStyle} ref={scrollContainerRef}>
        {/* Cover Image */}
        {form.theme?.coverImageUrl && (
            <div className="w-full h-48 md:h-64 bg-cover bg-center" style={{ backgroundImage: `url(${form.theme.coverImageUrl})` }} />
        )}
        
        <div className="max-w-3xl mx-auto py-12 px-6 relative">
            {/* Timer Overlay */}
            {timeLeft !== null && (
                <div className="fixed top-4 right-4 bg-white shadow-lg rounded-full px-4 py-2 font-mono font-bold text-lg z-50 flex items-center gap-2 border border-gray-100 text-gray-900">
                    <Clock size={18} className="text-red-500" />
                    {formatTime(timeLeft)}
                </div>
            )}

            {/* Header */}
           <div className="mb-12 text-center">
             {form.theme?.logoUrl && <img src={form.theme.logoUrl} alt="Logo" className="h-16 mx-auto mb-6 object-contain" />}
             <h1 className="text-4xl font-bold mb-4">{form.title}</h1>
             <p className="text-xl opacity-70">{form.description}</p>
           </div>
           
           <div className="space-y-12">
             {questionsToRender.map((q, idx) => (
                <div key={q.id} id={`question-${q.id}`} className="bg-white/50 p-8 rounded-2xl shadow-sm border border-black/5 backdrop-blur-sm">
                    <div className="flex items-start gap-4 mb-6">
                        <span 
                            className="flex-shrink-0 w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm"
                            style={{ backgroundColor: `${theme.primary}20`, color: theme.primary }}
                        >
                            {idx + 1}
                        </span>
                        <div>
                            <h3 className="text-xl font-medium">
                                {q.title} {q.required && <span className="text-red-500">*</span>}
                            </h3>
                            {q.description && <p className="opacity-60 mt-1">{q.description}</p>}
                        </div>
                    </div>
                    
                    <div className="pl-12">
                        {q.type === QuestionType.GROUP ? (
                            <GroupQuestionRenderer 
                                question={q} 
                                value={answers[q.id] || []} 
                                onChange={(val) => handleAnswerChange(q.id, val)}
                                themeColor={theme.primary}
                                shuffleOptions={form.settings.shuffleOptions}
                                errors={
                                    Object.keys(validationErrors)
                                        .filter(k => k.startsWith(q.id + '-'))
                                        .reduce((acc, k) => {
                                            acc[k.replace(q.id + '-', '')] = validationErrors[k];
                                            return acc;
                                        }, {} as Record<string, string>)
                                }
                            />
                        ) : (
                            <QuestionRenderer 
                                question={q} 
                                value={answers[q.id]} 
                                onChange={(val) => handleAnswerChange(q.id, val)}
                                themeColor={theme.primary}
                                shuffleOptions={form.settings.shuffleOptions}
                                error={validationErrors[q.id]}
                            />
                        )}
                    </div>
                </div>
             ))}
           </div>

           <div className="mt-12 flex justify-end">
               <button 
                onClick={submit}
                className="px-8 py-4 text-white rounded-xl font-semibold shadow-lg transition-all transform hover:-translate-y-1"
                style={{ backgroundColor: theme.primary, boxShadow: `0 10px 15px -3px ${theme.primary}40` }}
               >
                   Submit Form
               </button>
           </div>
           
           <button onClick={onClose} className="fixed top-6 right-6 opacity-40 hover:opacity-100 transition-opacity">
               Close
           </button>
        </div>
      </div>
    );
  }

  // --- STEP LAYOUT ---
  const currentQ = questionsToRender[currentStep];
  const progress = ((currentStep + 1) / questionsToRender.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fade-in" style={containerStyle}>
        {/* Progress Bar */}
        {form.settings?.showProgressBar && (
            <div className="h-1 w-full bg-black/5">
                <div 
                    className="h-full transition-all duration-500 ease-out" 
                    style={{ width: `${progress}%`, backgroundColor: theme.primary }}
                />
            </div>
        )}

        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center relative z-10">
            <div className="flex items-center gap-4">
                {form.theme?.logoUrl && <img src={form.theme.logoUrl} alt="Logo" className="h-8 object-contain" />}
                <div className="text-sm font-medium opacity-50">
                    Question {currentStep + 1} of {questionsToRender.length}
                </div>
            </div>

            <div className="flex items-center gap-4">
                {timeLeft !== null && (
                    <div className="font-mono font-bold text-lg flex items-center gap-2 text-red-500 bg-red-50 px-3 py-1 rounded-full">
                        <Clock size={16} /> {formatTime(timeLeft)}
                    </div>
                )}
                <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity">
                    Exit
                </button>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto no-scrollbar relative">
             {/* Background Cover Overlay if present, nicely faded */}
             {form.theme?.coverImageUrl && (
                <div 
                    className="absolute inset-0 opacity-10 bg-cover bg-center z-0 pointer-events-none"
                    style={{ backgroundImage: `url(${form.theme.coverImageUrl})` }}
                />
            )}

            <div className="w-full max-w-2xl animate-slide-up" key={currentStep} style={{ zIndex: 1 }}>
                <div className="mb-8">
                     <h2 className="text-3xl md:text-4xl font-light mb-4 leading-tight">
                        <span className="font-bold mr-2" style={{ color: theme.primary }}>{currentStep + 1}.</span>
                        {currentQ.title} {currentQ.required && <span className="text-red-500 text-2xl">*</span>}
                     </h2>
                     {currentQ.description && (
                         <p className="text-xl opacity-60 font-light">{currentQ.description}</p>
                     )}
                </div>

                <div className="mb-10">
                    {currentQ.type === QuestionType.GROUP ? (
                        <GroupQuestionRenderer 
                            question={currentQ} 
                            value={answers[currentQ.id] || []} 
                            onChange={(val) => handleAnswerChange(currentQ.id, val)}
                            themeColor={theme.primary}
                            shuffleOptions={form.settings.shuffleOptions}
                            errors={
                                Object.keys(validationErrors)
                                    .filter(k => k.startsWith(currentQ.id + '-'))
                                    .reduce((acc, k) => {
                                        acc[k.replace(currentQ.id + '-', '')] = validationErrors[k];
                                        return acc;
                                    }, {} as Record<string, string>)
                            }
                        />
                    ) : (
                        <QuestionRenderer 
                            question={currentQ} 
                            value={answers[currentQ.id]} 
                            onChange={(val) => handleAnswerChange(currentQ.id, val)}
                            themeColor={theme.primary}
                            shuffleOptions={form.settings.shuffleOptions}
                            error={validationErrors[currentQ.id]}
                        />
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={nextStep}
                        className="px-8 py-3 text-white rounded-lg text-lg font-medium transition-opacity hover:opacity-90 flex items-center gap-2 shadow-lg"
                        style={{ backgroundColor: theme.primary, boxShadow: `0 4px 6px -1px ${theme.primary}40` }}
                    >
                        {currentStep === questionsToRender.length - 1 ? 'Submit' : 'Next'}
                        {currentStep < questionsToRender.length - 1 && <Check size={20} />}
                    </button>
                    {currentStep < questionsToRender.length - 1 && (
                        <span className="text-xs opacity-40 hidden sm:inline">Press <strong>Enter ↵</strong></span>
                    )}
                </div>
            </div>
        </div>
        
        {/* Navigation Controls */}
        <div className="px-6 py-4 flex justify-between items-center border-t border-black/5 relative z-10" style={{ backgroundColor: theme.bg }}>
            <button 
                onClick={prevStep} 
                disabled={currentStep === 0 || !form.settings?.allowBackNavigation}
                className={`p-2 rounded hover:bg-black/5 disabled:opacity-0 transition-all ${!form.settings?.allowBackNavigation ? 'invisible' : ''}`}
            >
                <div className="flex items-center gap-1 text-sm font-medium opacity-60">
                    <ChevronDown className="rotate-90" size={16}/> Previous
                </div>
            </button>
            
            <div className="text-xs opacity-30">Powered by FormFlow AI</div>

             <button 
                onClick={nextStep} 
                disabled={currentQ.required && !answers[currentQ.id]} // Simple initial disable, robust validation happens on click
                className="p-2 rounded hover:bg-black/5 disabled:opacity-30 transition-colors"
            >
                 <div className="flex items-center gap-1 text-sm font-medium opacity-60">
                    Next <ChevronDown className="-rotate-90" size={16}/>
                </div>
            </button>
        </div>
    </div>
  );
}