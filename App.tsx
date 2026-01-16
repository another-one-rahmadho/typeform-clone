import React, { useState, useEffect } from 'react';
import { Form, FormSubmission } from './types';
import FormBuilder from './components/FormBuilder';
import FormRunner from './components/FormRunner';
import FormResponses from './components/FormResponses';
import Auth from './components/Auth';
import { Plus, Edit2, Play, Trash, FileText, BarChart2, Loader2, RefreshCcw, Eye, Clock, PieChart, LogOut, User, Share2, Check } from 'lucide-react';
import { supabase } from './services/supabaseClient';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<'dashboard' | 'builder' | 'runner' | 'responses'>('dashboard');
  const [forms, setForms] = useState<Form[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, FormSubmission[]>>({});
  const [activeForm, setActiveForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublicMode, setIsPublicMode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // --- Auth & Session Management ---
  useEffect(() => {
    // 1. Check for Public Form URL (?formId=...)
    const params = new URLSearchParams(window.location.search);
    const publicFormId = params.get('formId');

    if (publicFormId) {
        setIsPublicMode(true);
        fetchPublicForm(publicFormId);
        return; // Stop here, don't check auth yet if it's a public visit
    }

    // 2. Normal Auth Flow
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session && !publicFormId) {
          setForms([]); // Clear sensitive data on logout
          setView('dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Data Fetching ---

  const fetchPublicForm = async (formId: string) => {
      setLoading(true);
      try {
          // Public fetch: No user_id check, relies on RLS 'SELECT USING (true)' policy
          const { data, error } = await supabase
              .from('forms')
              .select('*')
              .eq('id', formId)
              .single();

          if (error) throw error;
          if (!data) throw new Error("Form not found");

          const mappedForm: Form = {
              id: data.id,
              title: data.title,
              description: data.description,
              mode: data.mode,
              layout: data.layout,
              questions: data.questions,
              theme: data.theme,
              settings: data.settings,
              welcomeScreen: data.welcome_screen,
              createdAt: new Date(data.created_at).getTime(),
              views: data.views || 0,
              submissionCount: data.submission_count || 0,
              avgCompletionTime: data.avg_completion_time || 0
          };

          setActiveForm(mappedForm);
          setView('runner');
          
          // Increment view count immediately for public visits
          incrementFormView(mappedForm);

      } catch (err: any) {
          console.error("Error loading public form:", err);
          setError("Form not found or unavailable.");
      } finally {
          setLoading(false);
      }
  };

  const fetchForms = async () => {
      if (!session?.user) return;
      
      setLoading(true);
      setError(null);
      try {
          const { data, error } = await supabase
              .from('forms')
              .select('*')
              .eq('user_id', session.user.id) // Only fetch user's forms
              .order('created_at', { ascending: false });

          if (error) throw error;

          const mappedForms: Form[] = (data || []).map((f: any) => ({
              id: f.id,
              title: f.title,
              description: f.description,
              mode: f.mode,
              layout: f.layout,
              questions: f.questions,
              theme: f.theme,
              settings: f.settings,
              welcomeScreen: f.welcome_screen,
              createdAt: new Date(f.created_at).getTime(),
              views: f.views || 0,
              submissionCount: f.submission_count || 0,
              avgCompletionTime: f.avg_completion_time || 0
          }));

          setForms(mappedForms);
      } catch (err: any) {
          console.error("Error fetching forms:", err);
          setError("Failed to load forms. Check your connection.");
      } finally {
          setLoading(false);
      }
  };

  const fetchSubmissions = async (formId: string) => {
      setLoading(true);
      try {
          const { data, error } = await supabase
              .from('submissions')
              .select('*')
              .eq('form_id', formId)
              .order('submitted_at', { ascending: false });

          if (error) throw error;

          const mappedSubmissions: FormSubmission[] = (data || []).map((s: any) => ({
              id: s.id,
              formId: s.form_id,
              answers: s.answers,
              score: s.score,
              maxScore: s.max_score,
              submittedAt: new Date(s.submitted_at).getTime(),
              timeTaken: s.time_taken
          }));

          setSubmissions(prev => ({
              ...prev,
              [formId]: mappedSubmissions
          }));
      } catch (err) {
          console.error("Error fetching submissions:", err);
          alert("Failed to load responses.");
      } finally {
          setLoading(false);
      }
  };

  // Fetch forms when session is active and view is dashboard
  useEffect(() => {
      if (session && view === 'dashboard' && !isPublicMode) {
          fetchForms();
      }
  }, [session, view, isPublicMode]);

  // --- Actions ---

  const createForm = () => {
    setActiveForm(null); 
    setView('builder');
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
  };

  const handleShare = (formId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const url = `${window.location.origin}?formId=${formId}`;
      navigator.clipboard.writeText(url).then(() => {
          setCopiedId(formId);
          setTimeout(() => setCopiedId(null), 2000);
      });
  };

  const saveForm = async (form: Form) => {
    if (!session?.user) return;
    setLoading(true);
    try {
        const dbForm = {
            id: form.id.length < 10 ? undefined : form.id, 
            user_id: session.user.id, // Associate form with current user
            title: form.title,
            description: form.description,
            mode: form.mode,
            layout: form.layout,
            questions: form.questions,
            theme: form.theme,
            settings: form.settings,
            welcome_screen: form.welcomeScreen,
            views: form.views,
            submission_count: form.submissionCount,
            avg_completion_time: form.avgCompletionTime
        };

        const { data, error } = await supabase
            .from('forms')
            .upsert(dbForm)
            .select()
            .single();

        if (error) throw error;

        fetchForms(); 
        setView('dashboard');
    } catch (err: any) {
        console.error("Error saving form:", err);
        alert(`Failed to save form: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  const deleteForm = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this form and all its responses?')) {
          try {
              const { error } = await supabase.from('forms').delete().eq('id', id);
              if (error) throw error;
              setForms(prev => prev.filter(f => f.id !== id));
          } catch (err: any) {
              alert("Failed to delete form.");
          }
      }
  };

  const editForm = (form: Form, e: React.MouseEvent) => {
      e.stopPropagation();
      setActiveForm(form);
      setView('builder');
  };

  const incrementFormView = async (form: Form) => {
      try {
          const newViews = (form.views || 0) + 1;
          // Use RPC or simply update. RLS policies must allow update on 'views' or general update for this to work perfectly securely for public users.
          // For now assuming the backend allows it or we tolerate slightly stale view counts if strict RLS blocks it.
          await supabase.from('forms').update({ views: newViews }).eq('id', form.id);
          
          if (!isPublicMode) {
              setForms(prev => prev.map(f => f.id === form.id ? { ...f, views: newViews } : f));
          }
          if (activeForm && activeForm.id === form.id) {
              setActiveForm({ ...activeForm, views: newViews });
          }
      } catch (err) {
          console.error("Error incrementing views:", err);
      }
  };

  const runForm = (form: Form) => {
      setActiveForm(form);
      incrementFormView(form);
      setView('runner');
  };

  const viewResponses = async (form: Form, e: React.MouseEvent) => {
      e.stopPropagation();
      setActiveForm(form);
      setView('responses');
      await fetchSubmissions(form.id);
  };

  const handleSubmission = async (answers: Record<string, any>, score?: number, maxScore?: number, timeTaken?: number) => {
      if (!activeForm) return;
      
      try {
          const { error } = await supabase.from('submissions').insert({
              form_id: activeForm.id,
              answers: answers,
              score: score,
              max_score: maxScore,
              time_taken: timeTaken,
              submitted_at: new Date().toISOString()
          });

          if (error) throw error;
          
          // Update stats logic (Basic implementation)
          const currentCount = activeForm.submissionCount || 0;
          const currentAvg = activeForm.avgCompletionTime || 0;
          const newCount = currentCount + 1;
          
          let newAvg = currentAvg;
          if (timeTaken) {
            const totalOldTime = currentAvg * currentCount;
            newAvg = (totalOldTime + timeTaken) / newCount;
          }
          
          // Attempt to update form stats. 
          // Note: If RLS is strict for public users, this UPDATE might fail. 
          // Real-world apps usually use Supabase Database Functions (RPC) with 'SECURITY DEFINER' to increment counters safely.
          await supabase.from('forms').update({ 
                submission_count: newCount,
                avg_completion_time: newAvg
          }).eq('id', activeForm.id).select(); // .select() helps debug if needed

          // Update local state if we are the owner
          if (session?.user && !isPublicMode) {
             setForms(prev => prev.map(f => f.id === activeForm.id ? { 
                 ...f, 
                 submissionCount: newCount, 
                 avgCompletionTime: newAvg 
             } : f));
          }

      } catch (err) {
          console.error("Error submitting form:", err);
          alert("There was an error saving your submission. Please try again.");
      }
  };

  const formatDuration = (seconds: number) => {
      if (!seconds) return '0s';
      if (seconds < 60) return `${Math.round(seconds)}s`;
      const m = Math.floor(seconds / 60);
      const s = Math.round(seconds % 60);
      return `${m}m ${s}s`;
  };

  // --- Render Logic ---

  // 1. PUBLIC MODE (No Auth required)
  if (isPublicMode && activeForm) {
      if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
      
      return (
        <FormRunner 
            form={activeForm} 
            onClose={() => {
                // For public users, "closing" might just mean reloading to clear state or showing a thank you message
                // Currently just refreshing to "reset"
                window.location.href = window.location.href;
            }} 
            onSubmit={handleSubmission}
        />
      );
  }
  
  if (isPublicMode && loading) {
      return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }
  
  if (isPublicMode && error) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
              <div className="bg-red-100 p-4 rounded-full mb-4 text-red-600"><FileText size={32} /></div>
              <h1 className="text-2xl font-bold mb-2">Form Not Found</h1>
              <p className="text-gray-500 max-w-md">{error}</p>
              <a href="/" className="mt-6 text-blue-600 hover:underline">Go to Home</a>
          </div>
      );
  }

  // 2. AUTH CHECK (Private Dashboard)
  if (!session) {
      return <Auth />;
  }

  // 3. Authenticated Views
  if (view === 'builder') {
      return <FormBuilderWithProps initialData={activeForm || undefined} onSave={saveForm} onCancel={() => setView('dashboard')} />;
  }

  if (view === 'runner' && activeForm) {
      return (
        <FormRunner 
            form={activeForm} 
            onClose={() => setView('dashboard')} 
            onSubmit={handleSubmission}
        />
      );
  }

  if (view === 'responses' && activeForm) {
      return (
          <FormResponses 
            form={activeForm} 
            submissions={submissions[activeForm.id] || []} 
            onBack={() => setView('dashboard')} 
          />
      );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-100 bg-white px-8 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
            <div className="bg-black text-white p-2 rounded-lg">
                <FileText size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight">FormFlow AI</span>
        </div>
        <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 hidden md:flex items-center gap-2">
                <User size={16} />
                {session.user.email}
            </div>
            <button 
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-600 transition-colors p-2"
                title="Log Out"
            >
                <LogOut size={20} />
            </button>
            <button 
                onClick={createForm}
                className="bg-black text-white px-5 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
                <Plus size={18} /> Create Form
            </button>
        </div>
      </nav>

      {/* Dashboard Content */}
      <main className="max-w-6xl mx-auto px-8 py-12">
          <div className="mb-10 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4">
              <div className="text-center sm:text-left">
                  <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Your Workspace</h1>
                  <p className="text-gray-500">Manage your quizzes and surveys.</p>
              </div>
              <button onClick={fetchForms} className="text-gray-400 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors" title="Refresh">
                  <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
              </button>
          </div>

          {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100">
                  {error}
              </div>
          )}

          {loading && forms.length === 0 ? (
              <div className="flex justify-center py-20">
                  <Loader2 className="animate-spin text-gray-300" size={48} />
              </div>
          ) : forms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                      <FileText size={32} className="text-gray-300" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No forms yet</h3>
                  <p className="text-gray-500 mb-6">Create your first form to get started.</p>
                  <button onClick={createForm} className="text-accent font-medium hover:underline">Create a form</button>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {forms.map(form => {
                      const completionRate = form.views > 0 ? Math.round((form.submissionCount / form.views) * 100) : 0;
                      return (
                      <div key={form.id} onClick={() => runForm(form)} className="group bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col h-full">
                           <div className="absolute top-0 left-0 w-1 h-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                           
                           <div className="flex justify-between items-start mb-4">
                               <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide ${form.mode === 'quiz' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                   {form.mode}
                               </span>
                               <div className="flex gap-1 relative z-10">
                                    <button onClick={(e) => handleShare(form.id, e)} className={`p-2 rounded-full transition-colors ${copiedId === form.id ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`} title="Copy Share Link">
                                        {copiedId === form.id ? <Check size={16} /> : <Share2 size={16} />}
                                    </button>
                                    <button onClick={(e) => viewResponses(form, e)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="View Results">
                                        <BarChart2 size={16} />
                                    </button>
                                    <button onClick={(e) => editForm(form, e)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors" title="Edit">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={(e) => deleteForm(form.id, e)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Delete">
                                        <Trash size={16} />
                                    </button>
                               </div>
                           </div>

                           <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">{form.title}</h3>
                           <p className="text-gray-500 text-sm line-clamp-2 mb-6 h-10">{form.description}</p>
                           
                           {/* Analytics Section */}
                           <div className="grid grid-cols-2 gap-y-3 gap-x-2 mb-4 pt-4 border-t border-gray-50">
                               <div className="flex items-center gap-2 text-xs text-gray-500" title="Views">
                                    <Eye size={14} />
                                    <span>{form.views} Views</span>
                               </div>
                               <div className="flex items-center gap-2 text-xs text-gray-500" title="Submissions">
                                    <FileText size={14} />
                                    <span>{form.submissionCount} Responses</span>
                               </div>
                               <div className="flex items-center gap-2 text-xs text-gray-500" title="Completion Rate">
                                    <PieChart size={14} />
                                    <span>{completionRate}% Rate</span>
                               </div>
                               <div className="flex items-center gap-2 text-xs text-gray-500" title="Average Time Spent">
                                    <Clock size={14} />
                                    <span>{formatDuration(form.avgCompletionTime)} Avg</span>
                               </div>
                           </div>

                           <div className="flex items-center justify-between mt-auto pt-2">
                               <div className="text-xs text-gray-400">
                                    {new Date(form.createdAt).toLocaleDateString()}
                               </div>
                               <div className="flex items-center gap-1 text-accent text-sm font-medium group-hover:translate-x-1 transition-transform">
                                   Preview <Play size={14} fill="currentColor" />
                               </div>
                           </div>
                      </div>
                  )})}
              </div>
          )}
      </main>
    </div>
  );
}

function FormBuilderWithProps(props: any) {
    return <FormBuilder {...props} />;
}