import React, { useState } from 'react';
import { Form, Question, QuestionType, WelcomeScreen, ValidationRules } from '../types';
import { generateFormWithAI } from '../services/geminiService';
import { Plus, Sparkles, Trash2, GripVertical, Settings, Save, Layout, List, CheckCircle, Clock, ChevronDown, ChevronUp, PlayCircle, Lock, Unlock, ShieldCheck, Palette, Navigation, Image as ImageIcon, Shuffle, Hash, Type, PenTool, Eye } from 'lucide-react';

interface FormBuilderProps {
  initialData?: Form;
  onSave: (form: Form) => void;
  onCancel: () => void;
}

const defaultForm: Form = {
  id: '',
  title: 'My New Form',
  description: 'Please fill out the details below.',
  welcomeScreen: {
      title: 'Welcome!',
      description: 'We are glad you are here.',
      buttonText: 'Start'
  },
  mode: 'survey',
  layout: 'step',
  questions: [],
  createdAt: Date.now(),
  theme: {
    primaryColor: '#0445AF',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    fontFamily: 'Inter',
  },
  settings: {
    allowBackNavigation: true,
    showProgressBar: true,
    shuffleQuestions: false,
    shuffleOptions: false,
    enableReview: true
  },
  views: 0,
  submissionCount: 0,
  avgCompletionTime: 0
};

const AVAILABLE_FONTS = ['Inter', 'Roboto', 'Playfair Display', 'Montserrat', 'Lato'];

// --- Helper Components ---

const QuestionTypeButton: React.FC<{ type: QuestionType, onClick: () => void, icons: any }> = ({ type, onClick, icons }) => {
    const Icon = icons[type]?.icon || Layout;
    const label = icons[type]?.label || type;
    return (
        <button
            onClick={onClick}
            className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-accent hover:text-accent transition-colors text-sm font-medium flex items-center gap-2"
        >
            <Icon size={16} /> {label}
        </button>
    );
};

interface QuestionEditorProps {
    question: Question;
    index: number;
    onChange: (updates: Partial<Question>) => void;
    onRemove: () => void;
    isQuizMode: boolean;
    isSubQuestion?: boolean;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({ 
    question, 
    index, 
    onChange, 
    onRemove, 
    isQuizMode, 
    isSubQuestion = false 
}) => {
    const [showValidation, setShowValidation] = useState(false);
    
    // Generic list editor for Options, Rows, Columns
    const updateList = (field: 'options' | 'rows' | 'columns', idx: number, value: string) => {
        const newList = [...(question[field] || [])];
        newList[idx] = value;
        onChange({ [field]: newList });
    };

    const removeListItem = (field: 'options' | 'rows' | 'columns', idx: number) => {
        const newList = question[field]?.filter((_, i) => i !== idx);
        onChange({ [field]: newList });
    };

    const addListItem = (field: 'options' | 'rows' | 'columns', prefix: string) => {
        const nextNum = (question[field]?.length || 0) + 1;
        onChange({ [field]: [...(question[field] || []), `${prefix} ${nextNum}`] });
    };

    const toggleCorrectOption = (opt: string) => {
        if (!isQuizMode) return;
        
        if (question.type === QuestionType.CHECKBOX) {
            const current = (Array.isArray(question.correctAnswer) ? question.correctAnswer : []) as string[];
            if (current.includes(opt)) {
                onChange({ correctAnswer: current.filter(c => c !== opt) });
            } else {
                onChange({ correctAnswer: [...current, opt] });
            }
        } else {
            if (question.correctAnswer === opt) {
                onChange({ correctAnswer: undefined });
            } else {
                onChange({ correctAnswer: opt });
            }
        }
    };

    const handleSubQuestionChange = (subIdx: number, updates: Partial<Question>) => {
        if (!question.subQuestions) return;
        const newSubQuestions = [...question.subQuestions];
        newSubQuestions[subIdx] = { ...newSubQuestions[subIdx], ...updates };
        onChange({ subQuestions: newSubQuestions });
    };

    const addSubQuestion = (type: QuestionType = QuestionType.TEXT) => {
        const newQ: Question = {
            id: crypto.randomUUID(),
            type,
            title: 'New Sub Question',
            required: false,
            options: type === QuestionType.MULTIPLE_CHOICE || type === QuestionType.DROPDOWN || type === QuestionType.CHECKBOX ? ['Option 1'] : undefined
        };
        onChange({ subQuestions: [...(question.subQuestions || []), newQ] });
    };

    const removeSubQuestion = (subIdx: number) => {
        onChange({ subQuestions: question.subQuestions?.filter((_, i) => i !== subIdx) });
    };

    const updateValidation = (key: keyof ValidationRules, value: any) => {
        const newRules = { ...question.validation, [key]: value };
        // Remove empty values to keep clean
        if (value === '' || value === undefined || value === null) {
            delete newRules[key];
        }
        onChange({ validation: newRules });
    };

    const isGroup = question.type === QuestionType.GROUP;
    const hasOptions = [QuestionType.MULTIPLE_CHOICE, QuestionType.DROPDOWN, QuestionType.CHECKBOX].includes(question.type);
    const isMatrix = question.type === QuestionType.MATRIX;
    const isTextLike = [QuestionType.TEXT, QuestionType.EMAIL, QuestionType.PHONE].includes(question.type);
    const isFile = question.type === QuestionType.FILE;

    return (
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 group transition-all hover:shadow-md relative ${isSubQuestion ? 'border-l-4 border-l-accent/20 bg-gray-50/50' : ''}`}>
             <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                <button onClick={onRemove} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="flex gap-4">
                 {!isSubQuestion && (
                    <div className="pt-3 text-gray-300 flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-gray-400">{index + 1}</span>
                        <GripVertical size={20} className="cursor-move" />
                    </div>
                 )}
                 
                 <div className="flex-1 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start pr-8">
                        <div className="flex-1 w-full">
                            <input 
                                type="text" 
                                value={question.title} 
                                onChange={e => onChange({ title: e.target.value })}
                                className="w-full text-lg font-medium border-none p-0 focus:ring-0 placeholder-gray-400 bg-transparent"
                                placeholder="Question Title"
                            />
                            <input 
                                type="text" 
                                value={question.description || ''} 
                                onChange={e => onChange({ description: e.target.value })}
                                className="w-full text-sm text-gray-500 border-none p-0 focus:ring-0 mt-1 placeholder-gray-300 bg-transparent"
                                placeholder="Description (optional)"
                            />
                        </div>
                        <div className="w-full sm:w-40 flex-shrink-0">
                            <select 
                                value={question.type}
                                onChange={e => onChange({ type: e.target.value as QuestionType })} 
                                className="w-full text-xs font-medium uppercase bg-white border border-gray-200 rounded p-2"
                            >
                                {Object.values(QuestionType).filter(t => isSubQuestion ? t !== QuestionType.GROUP : true).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                                type="checkbox" 
                                checked={question.required} 
                                onChange={e => onChange({ required: e.target.checked })}
                                className="rounded text-accent focus:ring-accent"
                            />
                            Required
                        </label>

                        {!isSubQuestion && (
                            <button 
                                onClick={() => onChange({ isLocked: !question.isLocked })}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${question.isLocked ? 'text-orange-600 bg-orange-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                title={question.isLocked ? "Position is fixed (won't shuffle)" : "Position will shuffle if enabled"}
                            >
                                {question.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                                <span className="text-xs font-medium">{question.isLocked ? 'Fixed Position' : 'Shuffleable'}</span>
                            </button>
                        )}

                        {question.type === QuestionType.RATING && (
                            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                                <span className="text-gray-500">Max Stars:</span>
                                <input 
                                    type="number" 
                                    value={question.ratingMax || 5} 
                                    onChange={e => onChange({ ratingMax: parseInt(e.target.value) || 5 })}
                                    className="w-16 border border-gray-200 rounded p-1 text-center bg-white"
                                    min={3} max={10}
                                />
                            </div>
                        )}

                        {isGroup && (
                            <>
                                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={question.repeatable} 
                                        onChange={e => onChange({ repeatable: e.target.checked })}
                                        className="rounded text-accent focus:ring-accent"
                                    />
                                    Repeatable Group
                                </label>
                                {question.repeatable && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400">Max:</span>
                                        <input 
                                            type="number"
                                            className="w-16 border border-gray-200 rounded p-1 text-center bg-white"
                                            value={question.maxRepeats || ''}
                                            onChange={e => onChange({ maxRepeats: parseInt(e.target.value) || 0 })}
                                            placeholder="Inf"
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {isQuizMode && !isGroup && (
                             <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                                <span className="text-accent font-medium flex items-center gap-1">
                                    <Sparkles size={12} /> Points:
                                </span>
                                <input 
                                    type="number"
                                    className="w-16 border border-gray-200 rounded p-1 text-center bg-white"
                                    value={question.points || 0}
                                    onChange={e => onChange({ points: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        )}

                        {/* Validation Toggle */}
                        {!isGroup && !isMatrix && (
                            <>
                                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                                <button 
                                    onClick={() => setShowValidation(!showValidation)}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${showValidation || question.validation ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                >
                                    <ShieldCheck size={14} />
                                    <span className="text-xs font-medium">Validation</span>
                                    {showValidation ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                            </>
                        )}
                    </div>

                    {/* Validation Settings Panel */}
                    {(showValidation) && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 text-xs font-bold text-gray-500 uppercase">Validation Rules</div>
                            
                            {isTextLike && (
                                <>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-500">Min Length</label>
                                        <input 
                                            type="number" 
                                            className="text-sm border border-gray-200 rounded px-2 py-1"
                                            value={question.validation?.minLength || ''}
                                            onChange={e => updateValidation('minLength', parseInt(e.target.value))}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-500">Max Length</label>
                                        <input 
                                            type="number" 
                                            className="text-sm border border-gray-200 rounded px-2 py-1"
                                            value={question.validation?.maxLength || ''}
                                            onChange={e => updateValidation('maxLength', parseInt(e.target.value))}
                                            placeholder="255"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 md:col-span-2">
                                        <label className="text-xs text-gray-500 flex justify-between">
                                            Regex Pattern 
                                            <a href="https://regex101.com/" target="_blank" className="text-accent hover:underline">Help</a>
                                        </label>
                                        <input 
                                            type="text" 
                                            className="text-sm border border-gray-200 rounded px-2 py-1 font-mono"
                                            value={question.validation?.pattern || ''}
                                            onChange={e => updateValidation('pattern', e.target.value)}
                                            placeholder="e.g. ^[0-9]{5}$ (Zip Code)"
                                        />
                                    </div>
                                </>
                            )}

                            {isFile && (
                                <>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-500">Allowed Types (comma separated)</label>
                                        <input 
                                            type="text" 
                                            className="text-sm border border-gray-200 rounded px-2 py-1"
                                            value={question.validation?.allowedFileTypes?.join(',') || ''}
                                            onChange={e => updateValidation('allowedFileTypes', e.target.value.split(',').map(s => s.trim()))}
                                            placeholder=".pdf, image/*"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-500">Max Size (MB)</label>
                                        <input 
                                            type="number" 
                                            className="text-sm border border-gray-200 rounded px-2 py-1"
                                            value={question.validation?.maxFileSizeMB || ''}
                                            onChange={e => updateValidation('maxFileSizeMB', parseInt(e.target.value))}
                                            placeholder="5"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs text-gray-500">Custom Error Message</label>
                                <input 
                                    type="text" 
                                    className="text-sm border border-gray-200 rounded px-2 py-1"
                                    value={question.validation?.customErrorMessage || ''}
                                    onChange={e => updateValidation('customErrorMessage', e.target.value)}
                                    placeholder="Error to show when validation fails..."
                                />
                            </div>
                        </div>
                    )}

                    {hasOptions && (
                        <div className="bg-gray-50/80 p-4 rounded-lg space-y-2 border border-gray-100">
                            <div className="flex justify-between items-center text-xs font-semibold text-gray-400 uppercase mb-2">
                                <span>Options</span>
                                {isQuizMode && <span>Correct Answer</span>}
                            </div>
                            {question.options?.map((opt, optIdx) => {
                                const isCorrect = Array.isArray(question.correctAnswer) 
                                    ? question.correctAnswer.includes(opt)
                                    : question.correctAnswer === opt;
                                
                                return (
                                    <div key={optIdx} className="flex gap-2 items-center">
                                        <input 
                                            className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 focus:border-accent focus:ring-1 focus:ring-accent"
                                            value={opt}
                                            onChange={e => updateList('options', optIdx, e.target.value)}
                                        />
                                        {isQuizMode && (
                                            <div className="flex items-center justify-center w-8">
                                                <input 
                                                    type={question.type === QuestionType.CHECKBOX ? "checkbox" : "radio"}
                                                    name={`correct-${question.id}`}
                                                    checked={isCorrect}
                                                    onChange={() => toggleCorrectOption(opt)}
                                                    className="w-4 h-4 text-green-500 focus:ring-green-500 cursor-pointer"
                                                    title="Mark as correct answer"
                                                />
                                            </div>
                                        )}
                                        <button 
                                            onClick={() => removeListItem('options', optIdx)}
                                            className="text-gray-400 hover:text-red-500 p-1"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                            <button 
                                onClick={() => addListItem('options', 'Option')}
                                className="text-xs text-accent font-medium flex items-center gap-1 mt-2 hover:bg-accent/10 px-2 py-1 rounded transition-colors w-fit"
                            >
                                <Plus size={12} /> Add Option
                            </button>
                        </div>
                    )}

                    {isMatrix && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50/80 p-4 rounded-lg space-y-2 border border-gray-100">
                                <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Rows</div>
                                {question.rows?.map((row, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <input 
                                            className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5"
                                            value={row}
                                            onChange={e => updateList('rows', idx, e.target.value)}
                                        />
                                        <button onClick={() => removeListItem('rows', idx)} className="text-gray-400 hover:text-red-500 p-1">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                <button onClick={() => addListItem('rows', 'Row')} className="text-xs text-accent font-medium flex items-center gap-1 mt-2 hover:bg-accent/10 px-2 py-1 rounded transition-colors w-fit">
                                    <Plus size={12} /> Add Row
                                </button>
                            </div>
                            <div className="bg-gray-50/80 p-4 rounded-lg space-y-2 border border-gray-100">
                                <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Columns</div>
                                {question.columns?.map((col, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <input 
                                            className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5"
                                            value={col}
                                            onChange={e => updateList('columns', idx, e.target.value)}
                                        />
                                        <button onClick={() => removeListItem('columns', idx)} className="text-gray-400 hover:text-red-500 p-1">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                <button onClick={() => addListItem('columns', 'Col')} className="text-xs text-accent font-medium flex items-center gap-1 mt-2 hover:bg-accent/10 px-2 py-1 rounded transition-colors w-fit">
                                    <Plus size={12} /> Add Column
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {isQuizMode && !isGroup && !hasOptions && !isMatrix && ![QuestionType.FILE, QuestionType.RATING, QuestionType.SIGNATURE, QuestionType.OPINION_SCALE].includes(question.type) && (
                         <div className="bg-green-50/50 p-3 rounded-lg border border-green-100 flex items-center gap-3">
                             <CheckCircle size={14} className="text-green-600" />
                             <label className="text-xs font-semibold text-green-700 uppercase">Correct Answer:</label>
                             <input 
                                className="flex-1 text-sm bg-white border border-green-200 rounded px-2 py-1 focus:border-green-500 focus:ring-green-500"
                                value={typeof question.correctAnswer === 'string' ? question.correctAnswer : ''}
                                onChange={e => onChange({ correctAnswer: e.target.value })}
                                placeholder="Enter exact match text"
                             />
                         </div>
                    )}

                    {isGroup && (
                        <div className="pl-4 space-y-4 mt-6 border-l-2 border-dashed border-gray-200">
                             <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase">
                                <span className="flex items-center gap-2"><List size={12}/> Questions in Group</span>
                            </div>
                            
                            {question.subQuestions?.map((subQ, subIdx) => (
                                <QuestionEditor
                                    key={subQ.id}
                                    index={subIdx}
                                    question={subQ}
                                    onChange={(updates) => handleSubQuestionChange(subIdx, updates)}
                                    onRemove={() => removeSubQuestion(subIdx)}
                                    isQuizMode={isQuizMode}
                                    isSubQuestion={true}
                                />
                            ))}

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => addSubQuestion(QuestionType.TEXT)}
                                    className="px-3 py-2 border border-gray-300 bg-white text-gray-600 rounded-lg text-xs font-medium hover:border-accent hover:text-accent transition-colors flex items-center gap-1"
                                >
                                    <Plus size={14} /> Add Text Question
                                </button>
                                <button 
                                    onClick={() => addSubQuestion(QuestionType.MULTIPLE_CHOICE)}
                                    className="px-3 py-2 border border-gray-300 bg-white text-gray-600 rounded-lg text-xs font-medium hover:border-accent hover:text-accent transition-colors flex items-center gap-1"
                                >
                                    <Plus size={14} /> Add Choice Question
                                </button>
                            </div>
                        </div>
                    )}

                 </div>
            </div>
        </div>
    );
};

const WelcomeScreenEditor: React.FC<{
    welcomeScreen?: WelcomeScreen;
    onChange: (val: WelcomeScreen) => void;
}> = ({ welcomeScreen, onChange }) => {
    const data = welcomeScreen || { title: 'Welcome', description: '', buttonText: 'Start' };
    
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 relative border-l-4 border-l-blue-500">
             <div className="absolute left-6 top-6 bg-blue-100 text-blue-600 p-2 rounded-lg">
                <PlayCircle size={20} />
            </div>
            <div className="pl-14">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Welcome Screen (Start)</div>
                <div className="space-y-3">
                     <input 
                        type="text" 
                        value={data.title} 
                        onChange={e => onChange({ ...data, title: e.target.value })}
                        className="w-full text-xl font-bold border-none p-0 focus:ring-0 placeholder-gray-400 bg-transparent"
                        placeholder="Welcome Title"
                    />
                    <textarea 
                        value={data.description} 
                        onChange={e => onChange({ ...data, description: e.target.value })}
                        className="w-full text-sm text-gray-600 border-none p-0 focus:ring-0 resize-none placeholder-gray-300 bg-transparent"
                        placeholder="Description / Instructions"
                        rows={2}
                    />
                    <div className="flex items-center gap-2 pt-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase">Button Label:</span>
                        <input 
                            type="text"
                            value={data.buttonText}
                            onChange={e => onChange({ ...data, buttonText: e.target.value })}
                            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium border-none w-auto inline-block placeholder-blue-300"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function FormBuilder({ initialData, onSave, onCancel }: FormBuilderProps) {
  const [form, setForm] = useState<Form>(initialData || { ...defaultForm, id: crypto.randomUUID() });
  const [activeTab, setActiveTab] = useState<'questions' | 'settings' | 'design'>('questions');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const questionIcons: Record<QuestionType, { icon: any, label: string }> = {
    [QuestionType.TEXT]: { icon: Type, label: 'Text' },
    [QuestionType.MULTIPLE_CHOICE]: { icon: List, label: 'Multiple Choice' },
    [QuestionType.CHECKBOX]: { icon: CheckCircle, label: 'Checkbox' },
    [QuestionType.DROPDOWN]: { icon: ChevronDown, label: 'Dropdown' },
    [QuestionType.EMAIL]: { icon: Hash, label: 'Email' },
    [QuestionType.PHONE]: { icon: Hash, label: 'Phone' },
    [QuestionType.RATING]: { icon: Sparkles, label: 'Rating' },
    [QuestionType.OPINION_SCALE]: { icon: Hash, label: 'Opinion Scale' },
    [QuestionType.MATRIX]: { icon: Layout, label: 'Matrix' },
    [QuestionType.DATE]: { icon: Clock, label: 'Date' },
    [QuestionType.TIME]: { icon: Clock, label: 'Time' },
    [QuestionType.SIGNATURE]: { icon: PenTool, label: 'Signature' },
    [QuestionType.FILE]: { icon: ImageIcon, label: 'File Upload' },
    [QuestionType.GROUP]: { icon: List, label: 'Question Group' },
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
        const generated = await generateFormWithAI(aiPrompt);
        setForm(prev => ({
            ...prev,
            ...generated,
            id: prev.id, // Keep ID
            createdAt: prev.createdAt, // Keep created date
            // Ensure defaults
            welcomeScreen: { ...prev.welcomeScreen, ...generated.welcomeScreen },
            settings: { ...prev.settings, ...generated.settings },
            theme: { ...prev.theme, ...generated.theme },
        }));
        setAiPrompt('');
    } catch (e) {
        alert("Failed to generate form. Please check your API key and try again.");
    } finally {
        setIsGenerating(false);
    }
  };

  const addQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type,
      title: 'New Question',
      required: false,
      options: [QuestionType.MULTIPLE_CHOICE, QuestionType.CHECKBOX, QuestionType.DROPDOWN].includes(type) ? ['Option 1'] : undefined,
      rows: type === QuestionType.MATRIX ? ['Row 1'] : undefined,
      columns: type === QuestionType.MATRIX ? ['Column 1'] : undefined,
    };
    setForm(prev => ({ ...prev, questions: [...prev.questions, newQuestion] }));
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const newQuestions = [...form.questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setForm(prev => ({ ...prev, questions: newQuestions }));
  };

  const removeQuestion = (index: number) => {
    setForm(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== index) }));
  };

  const updateTheme = (key: keyof typeof form.theme, value: string) => {
    setForm(prev => ({ ...prev, theme: { ...prev.theme, [key]: value } }));
  };

  const updateSettings = (key: keyof typeof form.settings, value: any) => {
    setForm(prev => ({ ...prev, settings: { ...prev.settings, [key]: value } }));
  };

  const toggleMode = (mode: 'quiz' | 'survey') => {
      setForm(prev => ({
          ...prev,
          mode,
          settings: {
              ...prev.settings,
              // Clear time limit if switching to survey
              timeLimit: mode === 'survey' ? undefined : prev.settings.timeLimit
          }
      }));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-4">
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-900 font-medium text-sm">Cancel</button>
                <div className="h-6 w-px bg-gray-200"></div>
                <input 
                    type="text" 
                    value={form.title} 
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="text-lg font-bold border-none focus:ring-0 p-0 placeholder-gray-400 w-64 md:w-96"
                    placeholder="Form Title"
                />
            </div>
            
            <div className="flex items-center gap-4">
                 <div className="bg-gray-100 p-1 rounded-lg flex text-xs font-medium">
                     <button 
                        onClick={() => toggleMode('survey')}
                        className={`px-3 py-1.5 rounded-md transition-all ${form.mode === 'survey' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                     >
                         Survey
                     </button>
                     <button 
                        onClick={() => toggleMode('quiz')}
                        className={`px-3 py-1.5 rounded-md transition-all ${form.mode === 'quiz' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-900'}`}
                     >
                         Quiz
                     </button>
                 </div>
                 
                 <button 
                    onClick={() => onSave(form)}
                    className="bg-black text-white px-5 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                    <Save size={18} /> Save
                </button>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Form Structure</h3>
                    <div className="space-y-1">
                        <button 
                            onClick={() => setActiveTab('questions')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'questions' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <List size={16} /> Questions <span className="ml-auto bg-gray-200 px-2 py-0.5 rounded-full text-xs">{form.questions.length}</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('design')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'design' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <Palette size={16} /> Design & Theme
                        </button>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'settings' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <Settings size={16} /> Settings
                        </button>
                    </div>
                </div>
                
                {activeTab === 'questions' && (
                    <div className="p-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Add Elements</h3>
                        <div className="space-y-2">
                             {Object.values(QuestionType).map(type => (
                                 <QuestionTypeButton 
                                    key={type} 
                                    type={type} 
                                    onClick={() => addQuestion(type)} 
                                    icons={questionIcons}
                                 />
                             ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
                <div className="max-w-3xl mx-auto">
                    
                    {activeTab === 'questions' && (
                        <div className="space-y-6">
                            {/* AI Generator */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-xl mb-8">
                                <div className="flex items-start gap-3">
                                    <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm">
                                        <Sparkles size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-1">Generate with AI</h3>
                                        <p className="text-sm text-gray-500 mb-3">Describe your form or quiz, and let AI build it for you.</p>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={aiPrompt}
                                                onChange={e => setAiPrompt(e.target.value)}
                                                placeholder="e.g. A math quiz for 5th graders with 5 questions"
                                                className="flex-1 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                                                onKeyDown={e => e.key === 'Enter' && handleAiGenerate()}
                                            />
                                            <button 
                                                onClick={handleAiGenerate}
                                                disabled={isGenerating || !aiPrompt}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                                            >
                                                {isGenerating ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : 'Generate'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <WelcomeScreenEditor 
                                welcomeScreen={form.welcomeScreen}
                                onChange={ws => setForm(prev => ({ ...prev, welcomeScreen: ws }))}
                            />
                            
                            {form.questions.map((q, idx) => (
                                <QuestionEditor 
                                    key={q.id}
                                    index={idx}
                                    question={q}
                                    onChange={(updates) => updateQuestion(idx, updates)}
                                    onRemove={() => removeQuestion(idx)}
                                    isQuizMode={form.mode === 'quiz'}
                                />
                            ))}

                            {form.questions.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                                    <p className="text-gray-400">Your form is empty. Add questions from the sidebar.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'design' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-100">
                                <h2 className="text-lg font-bold">Theme & Design</h2>
                                <p className="text-sm text-gray-500">Customize the look and feel of your form.</p>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                                        <div className="flex gap-2 items-center">
                                            <input 
                                                type="color" 
                                                value={form.theme.primaryColor}
                                                onChange={e => updateTheme('primaryColor', e.target.value)}
                                                className="h-10 w-10 rounded border border-gray-200 cursor-pointer"
                                            />
                                            <input 
                                                type="text" 
                                                value={form.theme.primaryColor}
                                                onChange={e => updateTheme('primaryColor', e.target.value)}
                                                className="flex-1 border-gray-200 rounded-lg uppercase"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                                        <div className="flex gap-2 items-center">
                                            <input 
                                                type="color" 
                                                value={form.theme.backgroundColor}
                                                onChange={e => updateTheme('backgroundColor', e.target.value)}
                                                className="h-10 w-10 rounded border border-gray-200 cursor-pointer"
                                            />
                                            <input 
                                                type="text" 
                                                value={form.theme.backgroundColor}
                                                onChange={e => updateTheme('backgroundColor', e.target.value)}
                                                className="flex-1 border-gray-200 rounded-lg uppercase"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
                                    <div className="flex gap-2 items-center max-w-xs">
                                        <input 
                                            type="color" 
                                            value={form.theme.textColor}
                                            onChange={e => updateTheme('textColor', e.target.value)}
                                            className="h-10 w-10 rounded border border-gray-200 cursor-pointer"
                                        />
                                        <input 
                                            type="text" 
                                            value={form.theme.textColor}
                                            onChange={e => updateTheme('textColor', e.target.value)}
                                            className="flex-1 border-gray-200 rounded-lg uppercase"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                                    <select 
                                        value={form.theme.fontFamily}
                                        onChange={e => updateTheme('fontFamily', e.target.value)}
                                        className="w-full border-gray-200 rounded-lg"
                                    >
                                        {AVAILABLE_FONTS.map(font => (
                                            <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="space-y-4 pt-4 border-t border-gray-100">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                                        <input 
                                            type="text" 
                                            value={form.theme.logoUrl || ''}
                                            onChange={e => updateTheme('logoUrl', e.target.value)}
                                            className="w-full border-gray-200 rounded-lg"
                                            placeholder="https://example.com/logo.png"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image URL</label>
                                        <input 
                                            type="text" 
                                            value={form.theme.coverImageUrl || ''}
                                            onChange={e => updateTheme('coverImageUrl', e.target.value)}
                                            className="w-full border-gray-200 rounded-lg"
                                            placeholder="https://example.com/cover.jpg"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                             <div className="p-6 border-b border-gray-100">
                                <h2 className="text-lg font-bold">Form Settings</h2>
                                <p className="text-sm text-gray-500">Configure how your form behaves.</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Layout Mode</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => setForm(f => ({ ...f, layout: 'step' }))}
                                            className={`p-4 border rounded-xl text-left flex items-center gap-3 transition-all ${form.layout === 'step' ? 'border-accent bg-blue-50 ring-1 ring-accent' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                                                <Layout size={20} className="text-gray-600" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm">Step by Step</div>
                                                <div className="text-xs text-gray-500">One question at a time</div>
                                            </div>
                                        </button>
                                        <button 
                                            onClick={() => setForm(f => ({ ...f, layout: 'scroll' }))}
                                            className={`p-4 border rounded-xl text-left flex items-center gap-3 transition-all ${form.layout === 'scroll' ? 'border-accent bg-blue-50 ring-1 ring-accent' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                             <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                                                <List size={20} className="text-gray-600" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm">Classic Scroll</div>
                                                <div className="text-xs text-gray-500">All questions in one page</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <Navigation size={18} className="text-gray-500" />
                                            <span className="text-sm font-medium text-gray-700">Allow Back Navigation</span>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={form.settings.allowBackNavigation} 
                                            onChange={e => updateSettings('allowBackNavigation', e.target.checked)}
                                            className="rounded text-accent focus:ring-accent"
                                        />
                                    </label>
                                    
                                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <Layout size={18} className="text-gray-500" />
                                            <span className="text-sm font-medium text-gray-700">Show Progress Bar</span>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={form.settings.showProgressBar} 
                                            onChange={e => updateSettings('showProgressBar', e.target.checked)}
                                            className="rounded text-accent focus:ring-accent"
                                        />
                                    </label>

                                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <Shuffle size={18} className="text-gray-500" />
                                            <span className="text-sm font-medium text-gray-700">Shuffle Questions</span>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={form.settings.shuffleQuestions} 
                                            onChange={e => updateSettings('shuffleQuestions', e.target.checked)}
                                            className="rounded text-accent focus:ring-accent"
                                        />
                                    </label>
                                    
                                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <Shuffle size={18} className="text-gray-500" />
                                            <span className="text-sm font-medium text-gray-700">Shuffle Options (MCQ/Checkbox)</span>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={form.settings.shuffleOptions} 
                                            onChange={e => updateSettings('shuffleOptions', e.target.checked)}
                                            className="rounded text-accent focus:ring-accent"
                                        />
                                    </label>

                                     <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <Eye size={18} className="text-gray-500" />
                                            <span className="text-sm font-medium text-gray-700">Show Results/Answers Review</span>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={form.settings.enableReview ?? true} 
                                            onChange={e => updateSettings('enableReview', e.target.checked)}
                                            className="rounded text-accent focus:ring-accent"
                                        />
                                    </label>

                                    {/* Quiz Specific Settings - Timer */}
                                    {form.mode === 'quiz' && (
                                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg animate-fade-in mt-4">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                                    <Clock size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-semibold text-gray-900 text-sm">Quiz Timer</div>
                                                    <div className="text-xs text-gray-500 mb-3">Set a hard time limit for the entire quiz.</div>
                                                    <div className="flex items-center gap-3">
                                                        <input 
                                                            type="number" 
                                                            min="1"
                                                            className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-center text-sm"
                                                            placeholder="Min"
                                                            value={form.settings.timeLimit || ''}
                                                            onChange={(e) => updateSettings('timeLimit', e.target.value ? parseInt(e.target.value) : undefined)}
                                                        />
                                                        <span className="text-sm text-gray-600 font-medium">minutes</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    </div>
  );
}