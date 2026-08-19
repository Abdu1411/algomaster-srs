import React, { useState } from 'react';
import { BookOpen, Link2, Sparkles, Loader2, FolderGit2, FileText, Check, ArrowRight } from 'lucide-react';
import { useDecks } from '../store';
import { Lesson } from '../types';

interface LessonGeneratorProps {
  onLessonGenerated: (lesson: Lesson) => void;
}

export function LessonGenerator({ onLessonGenerated }: LessonGeneratorProps) {
  const { folders } = useDecks();
  const [url, setUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url && !topic) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, topic })
      });

      const responseText = await response.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseErr) {
        throw new Error(
          response.ok 
            ? 'Server returned invalid response format.' 
            : `Server error (${response.status}): ${responseText.slice(0, 150)}`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || `Generation failed with status ${response.status}`);
      }

      if (!data.content || !data.title) {
        throw new Error('AI was unable to generate lecture notes. Please try a different topic or URL.');
      }

      const newLesson: Lesson = {
        id: crypto.randomUUID(),
        title: data.title,
        topic: data.topic || topic || 'Computer Science',
        sourceUrl: url || undefined,
        content: data.content,
        folderId: selectedFolderId || undefined,
        createdAt: Date.now()
      };

      onLessonGenerated(newLesson);
      setUrl('');
      setTopic('');
    } catch (error: any) {
      console.error(error);
      alert(`Failed to generate lecture note: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="bg-white/90 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-200/80 p-7 backdrop-blur-md relative overflow-hidden group hover:border-emerald-300 transition-all hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)]">
      {/* Decorative ambient background */}
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="max-w-2xl relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-2xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-slate-900 uppercase italic">
              CS Lecture Notes Generator
            </h2>
          </div>
          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Professor & Systems Mode
          </span>
        </div>

        <p className="text-xs text-slate-500 mb-6 font-sans leading-relaxed">
          Convert any algorithm doc URL, Wikipedia page, or technical topic into structured, professor-grade CS study notes with Big-O analysis, trade-offs, and IDE-styled code snippets.
        </p>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3.5">
            <div className="relative">
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">
                Topic or Lecture Subject
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <FileText className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Memory Hierarchy, B-Trees & Disk I/O"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800 placeholder-slate-400 font-sans text-xs"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">
                Article / Webpage URL (To Extract & Convert)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <Link2 className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  placeholder="https://en.wikipedia.org/... or blog link"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800 placeholder-slate-400 font-sans text-xs"
                />
              </div>
            </div>
          </div>

          {folders.length > 0 && (
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-emerald-600" /> Target Folder (Optional)
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-sans text-xs focus:bg-white focus:border-emerald-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="">📁 Unfiled (No Folder)</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isGenerating || (!url && !topic)}
              className="w-full sm:w-auto px-7 py-2.5 h-[42px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating CS Lecture Notes...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Synthesize Lecture Notes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
