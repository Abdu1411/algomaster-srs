import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  Sparkles,
  Send,
  Loader2,
  X,
  Copy,
  Check,
  Bot,
  PlusCircle,
  Eye,
  FileText,
  Layers,
  BookOpen,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Code2
} from 'lucide-react';
import { useDecks } from '../store';
import { Card, Deck } from '../types';
import { MarkdownCodeRenderer } from './CodeBlock';
import { useActiveView } from '../context/ActiveViewContext';

interface AskAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  contextInfo?: string;
}

export function AskAIModal({ isOpen, onClose, initialQuery = '', contextInfo }: AskAIModalProps) {
  const { decks, addDeck, addCardToDeck } = useDecks();
  const { activeResource } = useActiveView();

  const [inquiry, setInquiry] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [lastInquiry, setLastInquiry] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cardSaved, setCardSaved] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [showContextPreview, setShowContextPreview] = useState(false);

  // Deck selector state if converting to flashcard
  const [selectedDeckId, setSelectedDeckId] = useState<string>(decks.length > 0 ? decks[0].id : 'new');
  const [newDeckTitle, setNewDeckTitle] = useState('AI Insights');

  // Compute effective context
  const effectiveContext = contextInfo || (includeContext ? activeResource?.contextText : undefined);

  // Dynamic context-aware query suggestions
  const defaultQueries = [
    'How do I implement a Trie in Dart?',
    'What is the time complexity of Dart SplayTreeMap?',
    'When should I use Two Pointers vs Sliding Window?',
    'Explain Breadth-First Search on a Graph in Dart'
  ];

  const contextQueries = activeResource?.suggestedPrompts || (
    activeResource?.type === 'flashcard' ? [
      'Explain the key intuition and invariant for this card',
      'How does this work under the hood in memory?',
      'Can you give me an alternative Dart implementation?',
      'Test me with a variation of this question'
    ] : activeResource?.type === 'lesson' ? [
      'Summarize the core takeaways and Big-O complexities',
      'Explain the systems trade-offs in this note',
      'Generate 3 active recall questions from these notes',
      'Show an interactive Dart example for this algorithm'
    ] : defaultQueries
  );

  React.useEffect(() => {
    if (initialQuery) {
      setInquiry(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToSend = customQuery || inquiry;
    if (!queryToSend.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setAnswer(null);
    setLastInquiry(queryToSend);
    setCardSaved(false);

    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry: queryToSend.trim(),
          context: effectiveContext
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setAnswer(data.answer);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to get answer from AI');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAsCard = async () => {
    if (!lastInquiry || !answer) return;

    const newCard: Card = {
      id: crypto.randomUUID(),
      type: 'Concept',
      front: lastInquiry,
      back: answer,
      nextReview: Date.now(),
      interval: 0,
      ease: 2.5,
      reps: 0
    };

    if (selectedDeckId === 'new') {
      const newDeck: Deck = {
        id: crypto.randomUUID(),
        title: newDeckTitle.trim() || 'AI Insights',
        createdAt: Date.now(),
        cards: [newCard]
      };
      await addDeck(newDeck);
      setSelectedDeckId(newDeck.id);
    } else {
      await addCardToDeck(selectedDeckId, newCard);
    }

    setCardSaved(true);
    setTimeout(() => setCardSaved(false), 3000);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-4xl lg:max-w-5xl h-[90vh] max-h-[880px] flex flex-col shadow-[0_25px_80px_rgba(0,0,0,0.35)] overflow-hidden relative animate-scaleIn my-auto">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500"></div>

        {/* Header */}
        <div className="px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 text-purple-600 flex items-center justify-center border border-purple-200/80 shadow-2xs">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase italic tracking-wide">
                  AlgoMaster AI Assistant
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  Gemini 3.6 Flash
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                Full-screen pop-up AI assistant with real-time access to your active flashcards, notes, & code
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Close / Exit modal (Esc)"
            >
              <X className="w-4 h-4" />
              <span>Exit</span>
            </button>
          </div>
        </div>

        {/* Currently Viewed Resource Context Banner */}
        {activeResource && (
          <div className="bg-gradient-to-r from-purple-50/95 via-indigo-50/85 to-blue-50/75 border-b border-purple-100/80 px-6 py-3 flex flex-col gap-2 text-xs shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-medium text-slate-800">
                <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs shadow-2xs">
                  {activeResource.type === 'lesson' ? <BookOpen className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                </div>
                <span>
                  <strong className="text-purple-900 uppercase tracking-wider text-[10px] font-mono mr-1.5">Active View Context:</strong>
                  <span className="text-slate-800 font-bold">{activeResource.title}</span>
                </span>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-white/70 px-2.5 py-1 rounded-lg border border-purple-200/60 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={includeContext}
                    onChange={(e) => setIncludeContext(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  AI Reads Active Screen
                </label>

                <button
                  type="button"
                  onClick={() => setShowContextPreview(!showContextPreview)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-800 cursor-pointer bg-white/70 px-2.5 py-1 rounded-lg border border-purple-200/60 shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showContextPreview ? 'Hide Context' : 'Preview Context'}
                  {showContextPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Context Data Preview Drawer */}
            {showContextPreview && (
              <div className="p-3.5 bg-white rounded-xl border border-purple-200 text-xs font-mono text-slate-700 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner animate-fadeIn">
                {activeResource.contextText}
              </div>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Inquiry Input Area */}
          <form onSubmit={(e) => handleSubmit(e)} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Your Inquiry / Question
              </label>

              {inquiry && (
                <button
                  type="button"
                  onClick={() => setInquiry('')}
                  className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  title="Clear text field"
                >
                  <X className="w-3 h-3" /> Clear Text
                </button>
              )}
            </div>

            <div className="relative">
              <textarea
                value={inquiry}
                onChange={(e) => setInquiry(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmit();
                  }
                }}
                rows={3}
                placeholder="Ask anything about the currently viewed note, flashcard, or Dart algorithms..."
                className="w-full px-4 py-3 pb-12 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800 text-xs font-sans placeholder-slate-400 transition-all resize-none shadow-2xs"
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all inline-flex items-center gap-1 cursor-pointer"
                  title="Exit AI Assistant"
                >
                  <X className="w-3.5 h-3.5" />
                  Exit
                </button>

                <button
                  type="submit"
                  disabled={isLoading || !inquiry.trim()}
                  className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Ask AI
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Inspiration Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-1">
                {activeResource ? 'Contextual Prompts:' : 'Suggestions:'}
              </span>
              {contextQueries.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setInquiry(q);
                    handleSubmit(undefined, q);
                  }}
                  className="text-[11px] px-2.5 py-1 bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-slate-200 hover:border-purple-200 rounded-lg font-sans transition-all cursor-pointer truncate max-w-[280px]"
                  title={q}
                >
                  {q}
                </button>
              ))}
            </div>
          </form>

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-medium animate-fadeIn">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="py-12 text-center space-y-3 bg-purple-50/30 rounded-2xl border border-purple-100 animate-pulse">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
              <p className="text-xs font-bold text-slate-700">Synthesizing Dart algorithm insights...</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto font-sans">
                Consulting Gemini for time complexities, idiomatic Dart code, and data structure proofs.
              </p>
            </div>
          )}

          {/* AI Response Card */}
          {answer && (
            <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs animate-fadeIn relative">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold font-mono">
                    AI
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">Response for:</h3>
                    <p className="text-[11px] text-slate-500 font-sans italic line-clamp-1">"{lastInquiry}"</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Markdown Content */}
              <div className="text-slate-800 text-xs sm:text-sm font-sans leading-relaxed space-y-3 prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900">
                <ReactMarkdown components={{ code: MarkdownCodeRenderer }}>{answer}</ReactMarkdown>
              </div>

              {/* Save As Flashcard Action */}
              <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                    Save to Deck:
                  </label>
                  <select
                    value={selectedDeckId}
                    onChange={(e) => setSelectedDeckId(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-sans focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.cards.length} cards)
                      </option>
                    ))}
                    <option value="new">+ Create New Deck ("AI Insights")</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAsCard}
                  className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all shadow-2xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {cardSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Saved to Deck!
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      Save as Flashcard
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-bold">Esc</kbd> to exit
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Exit AI Assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
