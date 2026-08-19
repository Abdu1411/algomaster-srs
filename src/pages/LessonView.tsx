import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Trash2,
  Edit3,
  Loader2,
  Layers,
  Sparkles,
  Share2,
  Folder as FolderIcon
} from 'lucide-react';
import { useDecks } from '../store';
import { MarkdownCodeRenderer } from '../components/CodeBlock';
import { Deck, Card } from '../types';

export function LessonView() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { lessons, folders, deleteLesson, updateLesson, addDeck } = useDecks();

  const lesson = lessons.find((l) => l.id === lessonId);
  const parentFolder = folders.find((f) => f.id === lesson?.folderId);

  const [copied, setCopied] = useState(false);
  const [isSynthesizingCards, setIsSynthesizingCards] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');

  if (!lesson) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-400">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Lesson Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">This lecture note may have been deleted or moved.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Dashboard
        </Link>
      </div>
    );
  }

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(lesson.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitleValue.trim()) return;
    await updateLesson({
      ...lesson,
      title: editTitleValue.trim()
    });
    setIsEditingTitle(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this lecture note?')) {
      await deleteLesson(lesson.id);
      navigate('/');
    }
  };

  const handleSynthesizeFlashcards = async () => {
    setIsSynthesizingCards(true);
    try {
      const response = await fetch('/api/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `${lesson.title} - ${lesson.topic}`,
          url: lesson.sourceUrl
        })
      });

      const responseText = await response.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : [];
      } catch (err) {
        throw new Error(`Server returned invalid response: ${responseText.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed with status ${response.status}`);
      }

      const generatedCards = Array.isArray(data) ? data : data.cards || [];
      if (!generatedCards.length) {
        throw new Error('Could not synthesize flashcards from this note.');
      }

      const now = Date.now();
      const newDeck: Deck = {
        id: crypto.randomUUID(),
        title: `${lesson.title} (SRS Deck)`,
        folderId: lesson.folderId,
        createdAt: now,
        cards: generatedCards.map((c: any) => ({
          ...c,
          id: crypto.randomUUID(),
          nextReview: now,
          interval: 0,
          ease: 2.5,
          reps: 0
        })) as Card[]
      };

      await addDeck(newDeck);
      navigate(`/deck/${newDeck.id}`);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to synthesize deck: ${err.message}`);
    } finally {
      setIsSynthesizingCards(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to={lesson.folderId ? `/?folder=${lesson.folderId}` : '/'}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          {parentFolder ? `Back to 📁 ${parentFolder.name}` : 'Back to Lessons'}
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Copy entire markdown note"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            {copied ? 'Copied' : 'Copy Markdown'}
          </button>

          <button
            onClick={handleDelete}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-200 cursor-pointer"
            title="Delete lecture note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lesson Header Hero Card */}
      <div className="bg-white/95 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/90 p-6 sm:p-8 backdrop-blur-md mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-4">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold font-mono">
              <BookOpen className="w-3.5 h-3.5" />
              {lesson.topic}
            </span>

            {parentFolder && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-semibold">
                <FolderIcon className="w-3.5 h-3.5 text-blue-500" />
                {parentFolder.name}
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 ml-auto">
              <Calendar className="w-3 h-3" />
              {new Date(lesson.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>

          {/* Title row */}
          {isEditingTitle ? (
            <form onSubmit={handleSaveTitle} className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-lg font-extrabold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTitle(false)}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                {lesson.title}
              </h1>
              <button
                onClick={() => {
                  setEditTitleValue(lesson.title);
                  setIsEditingTitle(true);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                title="Edit title"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Source Link */}
          {lesson.sourceUrl && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-400">Source:</span>
              <a
                href={lesson.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:underline font-mono truncate max-w-md"
              >
                {lesson.sourceUrl}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}

          {/* Quick Action: Convert to Flashcards */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Turn these lecture notes into active recall flashcards to memorize with spaced repetition.
            </p>

            <button
              onClick={handleSynthesizeFlashcards}
              disabled={isSynthesizingCards}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {isSynthesizingCards ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating 25 Flashcards...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Synthesize SRS Flashcards
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Note Content Section */}
      <article className="bg-white/90 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/80 p-6 sm:p-10 backdrop-blur-md">
        <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-headings:font-black prose-headings:tracking-tight prose-h1:text-2xl prose-h2:text-xl prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2 prose-h2:mt-8 prose-h3:text-lg prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-strong:text-slate-900 prose-strong:font-bold prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:bg-emerald-50/50 prose-blockquote:py-3 prose-blockquote:px-4 prose-blockquote:rounded-r-2xl prose-blockquote:text-emerald-950 prose-blockquote:not-italic prose-blockquote:my-6">
          <ReactMarkdown components={{ code: MarkdownCodeRenderer }}>
            {lesson.content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
