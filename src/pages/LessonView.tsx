import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
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
  Folder as FolderIcon,
  Info,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  FileText,
  PenTool,
  ChevronDown,
  ChevronUp,
  Timer,
  Clock,
  Play,
  Pause,
  Scissors,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { useDecks } from '../store';
import { MarkdownCodeRenderer } from '../components/CodeBlock';
import { YouTubeEmbed, YouTubePlayerHandle } from '../components/YouTubeEmbed';
import { RichNoteEditor } from '../components/RichNoteEditor';
import { ManualCardCreator } from '../components/ManualCardCreator';
import { Deck, Card, Lesson } from '../types';
import { useActiveView } from '../context/ActiveViewContext';

export function LessonView() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { lessons, folders, decks, deleteLesson, updateLesson, addLesson, addDeck, updateDeck, addFolder, addCardToDeck } = useDecks();
  const { setActiveResource } = useActiveView();

  const lesson = lessons.find((l) => l.id === lessonId);
  const parentFolder = folders.find((f) => f.id === lesson?.folderId);

  const [copied, setCopied] = useState(false);
  const [isSynthesizingCards, setIsSynthesizingCards] = useState(false);
  const [isScrubbingLesson, setIsScrubbingLesson] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [isCardCreatorOpen, setIsCardCreatorOpen] = useState(false);
  const playerRef = useRef<YouTubePlayerHandle>(null);

  // Video time tracking
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [videoPauseTime, setVideoPauseTime] = useState<number>(0);

  const handleVideoPause = (currentTime: number) => {
    const rounded = Math.round(currentTime);
    if (rounded > 0) {
      setVideoPauseTime(rounded);
    }
  };

  React.useEffect(() => {
    if (lesson) {
      setActiveResource({
        title: lesson.title,
        type: 'lesson',
        contextText: `CURRENT CS LECTURE NOTE VIEWED BY USER:
Title: ${lesson.title}
Subject/Topic: ${lesson.topic}
Sources & Citations: ${lesson.sources?.join(', ') || lesson.sourceUrl || 'N/A'}

FULL NOTE CONTENT:
${lesson.content}`,
        suggestedPrompts: [
          `Summarize the key algorithmic concepts in "${lesson.title}"`,
          'Explain the time complexity and systems trade-offs',
          'Quiz me on this lesson with 3 conceptual questions',
          'Provide an advanced Dart pattern implementation'
        ]
      });
    }
    return () => setActiveResource(null);
  }, [lesson, setActiveResource]);

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

  const handleExportToLesson = async (contentToExport?: string) => {
    const finalContent = contentToExport || lesson.content;
    const now = Date.now();

    // Ensure folder exists under the live lecture title
    let targetFolderId = lesson.folderId;
    const lessonTitleTrimmed = lesson.title.trim();
    const existingFolder = folders.find(
      f => f.name.trim().toLowerCase() === lessonTitleTrimmed.toLowerCase()
    );

    if (existingFolder) {
      targetFolderId = existingFolder.id;
    } else {
      const createdFolder = await addFolder(lessonTitleTrimmed, '#e11d48');
      targetFolderId = createdFolder.id;
    }

    if (!lesson.folderId || lesson.folderId !== targetFolderId) {
      await updateLesson({ ...lesson, folderId: targetFolderId });
    }

    const exportedLesson: Lesson = {
      id: crypto.randomUUID(),
      title: `${lessonTitleTrimmed} (Lecture Notes)`,
      topic: lesson.topic || 'Exported Notes',
      content: finalContent,
      folderId: targetFolderId,
      createdAt: now,
      sources: lesson.sources || (lesson.videoUrl ? [lesson.videoUrl] : undefined),
      sourceUrl: lesson.videoUrl,
    };

    await addLesson(exportedLesson);
    navigate(`/lesson/${exportedLesson.id}`);
  };

  const handleSynthesizeFlashcards = async () => {
    setIsSynthesizingCards(true);
    try {
      const response = await fetch('/api/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: lesson.title,
          url: lesson.sourceUrl || lesson.videoUrl,
          rawText: lesson.content,
          count: 8 // High-yield deck covering core CS archetypes with LaTeX math
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
      const newCardsWithIds = generatedCards.map((c: any) => ({
        ...c,
        id: crypto.randomUUID(),
        nextReview: now,
        interval: 0,
        ease: 2.5,
        reps: 0
      })) as Card[];

      // 1. Ensure folder under the same name as the live lesson exists
      let targetFolderId = lesson.folderId;
      const lessonTitleTrimmed = lesson.title.trim();
      const existingFolder = folders.find(
        f => f.name.trim().toLowerCase() === lessonTitleTrimmed.toLowerCase()
      );

      if (existingFolder) {
        targetFolderId = existingFolder.id;
      } else {
        const createdFolder = await addFolder(lessonTitleTrimmed, '#e11d48');
        targetFolderId = createdFolder.id;
      }

      // Link lesson to folder if not linked yet
      if (!lesson.folderId || lesson.folderId !== targetFolderId) {
        await updateLesson({ ...lesson, folderId: targetFolderId });
      }

      // 2. Keep adding cards to the SAME deck as long as user keeps making them
      const existingDeck = decks.find(
        d =>
          (d.folderId === targetFolderId && (d.title.trim().toLowerCase() === lessonTitleTrimmed.toLowerCase() || d.title.includes(lessonTitleTrimmed))) ||
          d.title.trim().toLowerCase() === lessonTitleTrimmed.toLowerCase()
      );

      if (existingDeck) {
        // Append cards to the existing deck
        const updatedDeck: Deck = {
          ...existingDeck,
          folderId: targetFolderId,
          cards: [...existingDeck.cards, ...newCardsWithIds]
        };
        await updateDeck(updatedDeck);
        navigate(`/deck/${updatedDeck.id}`);
      } else {
        // Create the master deck for this live lesson in its folder
        const newDeck: Deck = {
          id: crypto.randomUUID(),
          title: lessonTitleTrimmed,
          folderId: targetFolderId,
          createdAt: now,
          cards: newCardsWithIds
        };
        await addDeck(newDeck);
        navigate(`/deck/${newDeck.id}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to synthesize deck: ${err.message}`);
    } finally {
      setIsSynthesizingCards(false);
    }
  };

  const handleScrubLesson = async () => {
    setIsScrubbingLesson(true);
    try {
      const response = await fetch('/api/scrub-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: lesson.title,
          url: lesson.videoUrl || lesson.sourceUrl,
          rawText: lesson.content
        })
      });

      const responseText = await response.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (err) {
        throw new Error(`Server returned invalid response: ${responseText.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed with status ${response.status}`);
      }

      // Ensure folder under the same name as the live lesson exists
      let targetFolderId = lesson.folderId;
      const lessonTitleTrimmed = lesson.title.trim();
      const existingFolder = folders.find(
        f => f.name.trim().toLowerCase() === lessonTitleTrimmed.toLowerCase()
      );

      if (existingFolder) {
        targetFolderId = existingFolder.id;
      } else {
        const createdFolder = await addFolder(lessonTitleTrimmed, '#e11d48');
        targetFolderId = createdFolder.id;
      }

      if (!lesson.folderId || lesson.folderId !== targetFolderId) {
        await updateLesson({ ...lesson, folderId: targetFolderId });
      }

      const now = Date.now();
      const createdLesson: Lesson = {
        id: crypto.randomUUID(),
        title: data.title || `${lessonTitleTrimmed} (Lecture Notes)`,
        topic: data.topic || lesson.topic || 'CS Lecture Notes',
        content: data.content || lesson.content,
        folderId: targetFolderId,
        createdAt: now,
        sources: lesson.videoUrl ? [lesson.videoUrl] : undefined,
        sourceUrl: lesson.videoUrl,
      };

      await addLesson(createdLesson);
      navigate(`/lesson/${createdLesson.id}`);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to scrub lecture: ${err.message}`);
    } finally {
      setIsScrubbingLesson(false);
    }
  };

  // Custom component renderers for Markdown
  const markdownComponents = {
    code: MarkdownCodeRenderer,
    table: ({ children }: any) => (
      <div className="my-6 overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
        <table className="w-full text-left text-xs border-collapse">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-800 uppercase tracking-wider">
        {children}
      </thead>
    ),
    th: ({ children }: any) => (
      <th className="px-4 py-3 font-extrabold text-slate-900 border-r border-slate-200/60 last:border-r-0">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-4 py-3 text-slate-700 border-b border-slate-100 border-r border-slate-100 last:border-r-0 font-sans leading-relaxed">
        {children}
      </td>
    ),
    blockquote: ({ children }: any) => {
      return (
        <div className="my-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-slate-50 border-l-4 border-emerald-500 shadow-2xs text-emerald-950 not-italic">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm font-sans leading-relaxed space-y-1">
              {children}
            </div>
          </div>
        </div>
      );
    },
    h1: ({ children }: any) => (
      <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-10 mb-4 pb-3 border-b border-slate-200/80 flex items-center gap-2">
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-8 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-base font-bold text-slate-800 tracking-tight mt-6 mb-2">
        {children}
      </h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="text-sm font-bold text-slate-800 mt-4 mb-1.5 uppercase tracking-wide">
        {children}
      </h4>
    ),
    p: ({ children }: any) => (
      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed my-3 font-sans">
        {children}
      </p>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc list-inside space-y-1.5 my-3 pl-2 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-inside space-y-1.5 my-3 pl-2 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="leading-relaxed text-slate-700">
        {children}
      </li>
    ),
    hr: () => (
      <hr className="my-8 border-t border-slate-200/80" />
    ),
    a: ({ href, children }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-emerald-600 hover:text-emerald-700 underline font-semibold transition-colors inline-flex items-center gap-1"
      >
        {children}
      </a>
    ),
    strong: ({ children }: any) => (
      <strong className="font-extrabold text-slate-900">
        {children}
      </strong>
    )
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to={lesson.folderId ? `/?folder=${lesson.folderId}` : (lesson.videoUrl ? '/?view=live' : '/?view=lessons')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          {parentFolder ? `Back to 📁 ${parentFolder.name}` : (lesson.videoUrl ? 'Back to Live Lectures' : 'Back to Lessons')}
        </Link>

        <div className="flex items-center gap-2">
          {lesson.videoUrl && (
            <button
              onClick={() => handleExportToLesson()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
              title="Export as a standalone CS Lecture Note in the Lessons tab"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Export to Lesson
            </button>
          )}

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

          {/* Multiple Sources & Media References */}
          {(() => {
            const allSources: string[] = Array.isArray(lesson.sources) && lesson.sources.length > 0
              ? lesson.sources
              : (lesson.sourceUrl ? [lesson.sourceUrl] : []);

            if (allSources.length === 0) return null;

            return (
              <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Synthesized Sources ({allSources.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allSources.map((src, i) => {
                    const isUrl = src.startsWith('http://') || src.startsWith('https://');
                    if (isUrl) {
                      let displayDomain = src;
                      try {
                        displayDomain = new URL(src).hostname.replace('www.', '');
                      } catch {
                        // fallback
                      }
                      return (
                        <a
                          key={i}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-mono font-medium transition-all shadow-2xs group max-w-full"
                          title={src}
                        >
                          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                          <span className="truncate max-w-xs">{displayDomain}</span>
                        </a>
                      );
                    }
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-sans font-medium shadow-2xs"
                      >
                        <FileText className="w-3 h-3 text-emerald-600" />
                        {src}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Quick Action: Convert to Flashcards (Only shown for standard CS notes, live lectures use timestamp synthesizer) */}
          {!lesson.videoUrl && (
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Turn these lecture notes into active recall flashcards to memorize with spaced repetition.
              </p>

              <button
                onClick={() => handleSynthesizeFlashcards()}
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
          )}
        </div>
      </div>

        {/* Video Embed & Live Lecture AI Suite */}
        {lesson.videoUrl && (
          <div className="space-y-6 mb-8">
            <YouTubeEmbed
              ref={playerRef}
              videoUrl={lesson.videoUrl}
              onPause={handleVideoPause}
              onTimeUpdate={(t) => setVideoCurrentTime(t)}
            />

            {/* Make Flashcards Action Button */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleSynthesizeFlashcards}
                disabled={isSynthesizingCards}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer active:scale-95 whitespace-nowrap"
              >
                {isSynthesizingCards ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Making Flashcards...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Make Flashcards
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Rich Note Editor */}
        <RichNoteEditor
          content={lesson.content}
          onStartTyping={() => {
            playerRef.current?.pause();
            const t = playerRef.current?.getCurrentTime() || 0;
            if (t > 0) {
              setVideoPauseTime(Math.round(t));
            }
          }}
          onExportToLesson={lesson.videoUrl ? handleExportToLesson : undefined}
          onChange={async (newContent) => {
            await updateLesson({ ...lesson, content: newContent });
            setActiveResource({
              title: lesson.title,
              type: 'lesson',
              contextText: newContent,
            });
          }}
        />

        {/* In-Lesson Flashcard Forge */}
        <div className="mt-8 bg-white/95 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/90 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/80 shadow-2xs">
                <PenTool className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm text-slate-900 uppercase tracking-wider font-extrabold flex items-center gap-2">
                  Create Flashcards from this Lecture
                </h2>
                <p className="text-xs text-slate-500 font-sans">
                  Craft Concept, Complexity, Cloze, Pattern, or Code implementation cards while studying
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCardCreatorOpen(!isCardCreatorOpen)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              {isCardCreatorOpen ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" /> Collapse Forge
                </>
              ) : (
                <>
                  <PenTool className="w-3.5 h-3.5" /> Open Flashcard Forge
                </>
              )}
            </button>
          </div>

          {isCardCreatorOpen && (
            <div className="mt-6 pt-6 border-t border-slate-100 animate-fadeIn">
              <ManualCardCreator
                decks={decks}
                onAddDeck={addDeck}
                onAddCard={addCardToDeck}
              />
            </div>
          )}
        </div>
      </div>
  );
}