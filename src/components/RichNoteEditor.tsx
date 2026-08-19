import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Upload, Save, BookOpen, Check, Loader2, CloudCheck } from 'lucide-react';
import { MarkdownCodeRenderer } from '../components/CodeBlock';

interface RichNoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  onStartTyping?: () => void;
  onExportToLesson?: (currentContent: string) => void;
}

export const RichNoteEditor: React.FC<RichNoteEditorProps> = ({
  content,
  onChange,
  onStartTyping,
  onExportToLesson,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [draft, setDraft] = useState(content);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<any>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Keep draft in sync if external content changes and not editing
  useEffect(() => {
    if (!isEditMode) {
      setDraft(content);
    }
  }, [content, isEditMode]);

  // Debounced auto-save function
  const triggerAutoSave = useCallback((newText: string) => {
    setSaveStatus('saving');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onChange(newText);
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }, 700);
  }, [onChange]);

  // Flush any pending auto-save on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        onChange(draftRef.current);
      }
    };
  }, [onChange]);

  const handleToggle = () => {
    if (isEditMode) {
      // Exiting edit mode: flush save immediately
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      onChange(draft);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    }
    setIsEditMode(!isEditMode);
  };

  const handleManualSave = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onChange(draft);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 1500);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      setSaveStatus('saving');
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (data.url) {
        const markdownImg = `![${file.name}](${data.url})`;
        const updated = draft + '\n' + markdownImg + '\n';
        setDraft(updated);
        onChange(updated);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err) {
      console.error('Upload failed', err);
      setSaveStatus('idle');
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggle}
            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            {isEditMode ? 'Preview Mode' : 'Edit Notes'}
          </button>

          {isEditMode && (
            <>
              <button
                type="button"
                onClick={openFileDialog}
                className="px-2.5 py-1 text-xs bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                title="Attach image or file"
              >
                <Upload className="w-3 h-3" /> Upload Media
              </button>

              <button
                type="button"
                onClick={handleManualSave}
                className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 flex items-center gap-1 font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                <Save className="w-3 h-3" /> Save Now
              </button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
            </>
          )}

          {/* Auto-save Status Indicator */}
          {saveStatus === 'saving' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
              Auto-saving...
            </span>
          )}

          {saveStatus === 'saved' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <Check className="w-3 h-3 text-emerald-600" />
              Auto-saved
            </span>
          )}
        </div>

        {onExportToLesson && (
          <button
            type="button"
            onClick={() => onExportToLesson(draft)}
            className="px-3 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="Export these notes into a standalone CS Lecture Note under the Lessons tab"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Export to Lesson
          </button>
        )}
      </div>

      {isEditMode ? (
        <textarea
          value={draft}
          onChange={e => {
            const val = e.target.value;
            setDraft(val);
            onStartTyping?.();
            triggerAutoSave(val);
          }}
          onFocus={() => onStartTyping?.()}
          placeholder="Type your lecture notes, insights, formulas ($O(N \log N)$), or paste code here... (Auto-saves continuously)"
          className="w-full h-72 p-3 font-mono text-xs text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-colors"
        />
      ) : (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{ code: MarkdownCodeRenderer }}
          >
            {draft || '*No notes taken yet. Click "Edit Notes" to start writing.*'}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};
