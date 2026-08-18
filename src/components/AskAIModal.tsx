import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Loader2,
  X,
  Copy,
  Check,
  Bot,
  PlusCircle,
  HelpCircle,
  Code2,
  RotateCcw,
  Zap
} from 'lucide-react';
import { useDecks } from '../store';
import { Card, Deck } from '../types';
import { MarkdownCodeRenderer } from './CodeBlock';

interface AskAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  contextInfo?: string;
}

export function AskAIModal({ isOpen, onClose, initialQuery = '', contextInfo }: AskAIModalProps) {
  const { decks, addDeck, addCardToDeck } = useDecks();

  const [inquiry, setInquiry] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [lastInquiry, setLastInquiry] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cardSaved, setCardSaved] = useState(false);

  // Deck selector state if converting to flashcard
  const [selectedDeckId, setSelectedDeckId] = useState<string>(decks.length > 0 ? decks[0].id : 'new');
  const [newDeckTitle, setNewDeckTitle] = useState('AI Insights');

  const presetQueries = [
    'How do I implement a Trie in Dart?',
    'What is the time complexity of Dart SplayTreeMap?',
    'When should I use Two Pointers vs Sliding Window?',
    'How does Dart manage list resizing amortized O(1)?',
    'Explain Breadth-First Search on a Graph in Dart'
  ];

  if (!isOpen) return null;

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
          context: contextInfo
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden relative">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500"></div>

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 text-purple-600 flex items-center justify-center border border-purple-200/80 shadow-2xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 uppercase italic tracking-wide">
                  AlgoMaster AI Assistant
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  Dart & DSA Tutor
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                Ask any algorithmic inquiry, time complexity question, or Dart pattern doubt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Inquiry Input Area */}
          <form onSubmit={(e) => handleSubmit(e)} className="space-y-3">
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Your Inquiry / Question
            </label>

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
                placeholder="e.g. How does Dart implement SplayTreeMap? Compare time complexities of ListQueue vs DoubleLinkedQueue..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800 text-xs font-sans placeholder-slate-400 transition-all resize-none shadow-2xs"
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Ctrl+Enter to send</span>
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
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-1">Suggestions:</span>
              {presetQueries.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setInquiry(q);
                    handleSubmit(undefined, q);
                  }}
                  className="text-[11px] px-2.5 py-1 bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-slate-200 hover:border-purple-200 rounded-lg font-sans transition-all cursor-pointer truncate max-w-[240px]"
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
      </div>
    </div>
  );
}
