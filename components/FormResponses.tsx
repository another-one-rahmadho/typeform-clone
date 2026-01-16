import React from 'react';
import { Form, FormSubmission, Question, QuestionType } from '../types';
import { ArrowLeft, Download, FileText, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FormResponsesProps {
  form: Form;
  submissions: FormSubmission[];
  onBack: () => void;
}

export default function FormResponses({ form, submissions, onBack }: FormResponsesProps) {
  
  const formatDate = (ts: number) => new Date(ts).toLocaleString();

  const getAnswerDisplay = (val: any): string => {
      if (val === undefined || val === null) return '-';
      if (Array.isArray(val)) {
          // Handle checkbox arrays
          if (typeof val[0] === 'string') return val.join(', ');
          // Handle group arrays (array of objects)
          if (typeof val[0] === 'object') {
             return `${val.length} Entries`; 
          }
      }
      return val.toString();
  };

  const downloadXLSX = () => {
    // 1. Headers
    const headers = ['Submission Date'];
    if (form.mode === 'quiz') headers.push('Score');
    headers.push(...form.questions.map(q => q.title));
    
    // 2. Rows
    const rows = submissions.map(sub => {
        const row = [formatDate(sub.submittedAt)];
        
        if (form.mode === 'quiz') {
            row.push(`${sub.score ?? 0}/${sub.maxScore ?? 0}`);
        }

        form.questions.forEach(q => {
            const ans = sub.answers[q.id];
            
            if (q.type === QuestionType.GROUP && Array.isArray(ans)) {
                // Stringify group data nicely: "Entry 1: [Q1: A, Q2: B] | Entry 2: ..."
                const groupText = ans.map((entry: any, i: number) => {
                    const entryParts = q.subQuestions?.map(sq => `${sq.title}: ${entry[sq.id] || '-'}`).join(', ');
                    return `Entry ${i+1}: [${entryParts}]`;
                }).join(' | ');
                row.push(groupText);
            } else if (Array.isArray(ans)) {
                row.push(ans.join(', '));
            } else {
                row.push((ans || '').toString());
            }
        });
        return row;
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");
    XLSX.writeFile(workbook, `${form.title}_Responses.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
       {/* Header */}
       <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">{form.title}</h1>
                    <p className="text-sm text-gray-500">Responses</p>
                </div>
            </div>
            <button 
                onClick={downloadXLSX}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                disabled={submissions.length === 0}
            >
                <Download size={18} /> Export to Excel
            </button>
       </div>

       {/* Stats Cards */}
       <div className="max-w-7xl mx-auto w-full px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <FileText size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">{submissions.length}</div>
                        <div className="text-sm text-gray-500">Total Responses</div>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">{submissions.length > 0 ? formatDate(submissions[submissions.length-1].submittedAt).split(',')[0] : '-'}</div>
                        <div className="text-sm text-gray-500">Last Submission</div>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700 whitespace-nowrap w-48">Submission Date</th>
                                {form.mode === 'quiz' && (
                                    <th className="px-6 py-4 font-semibold text-gray-700 whitespace-nowrap w-24">Score</th>
                                )}
                                {form.questions.map(q => (
                                    <th key={q.id} className="px-6 py-4 font-semibold text-gray-700 min-w-[200px] whitespace-nowrap">
                                        {q.title}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {submissions.length === 0 ? (
                                <tr>
                                    <td colSpan={form.questions.length + (form.mode === 'quiz' ? 2 : 1)} className="px-6 py-12 text-center text-gray-500">
                                        No responses yet. Share your form to collect answers.
                                    </td>
                                </tr>
                            ) : (
                                submissions.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {formatDate(sub.submittedAt)}
                                        </td>
                                        {form.mode === 'quiz' && (
                                            <td className="px-6 py-4 text-gray-900 font-medium">
                                                {sub.score ?? 0} / {sub.maxScore ?? 0}
                                            </td>
                                        )}
                                        {form.questions.map(q => (
                                            <td key={q.id} className="px-6 py-4 text-gray-900">
                                                <div className="line-clamp-2" title={getAnswerDisplay(sub.answers[q.id])}>
                                                    {getAnswerDisplay(sub.answers[q.id])}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
       </div>
    </div>
  );
}