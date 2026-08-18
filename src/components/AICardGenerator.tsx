import React, { useState } from 'react';
import { Plus, Link2, BookOpen, Loader2, Sparkles, Code2, FolderGit2 } from 'lucide-react';
import { Card, Deck } from '../types';
import { useDecks } from '../store';

interface AICardGeneratorProps {
  onDeckGenerated: (deck: Deck) => void;
}

export function AICardGenerator({ onDeckGenerated }: AICardGeneratorProps) {
  const { folders } = useDecks();
  const [url, setUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url && !topic) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, topic })
      });
      
      const responseText = await response.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : [];
      } catch (parseErr) {
        throw new Error(
          response.ok 
            ? 'Server returned invalid response format.' 
            : `Server error (${response.status}): ${responseText.slice(0, 150)}`
        );
      }

      if (!response.ok) {
        throw new Error((data && data.error) || `Generation failed with status ${response.status}`);
      }

      const generatedCards = Array.isArray(data) ? data : (data && data.cards) || [];
      if (!generatedCards.length) {
        throw new Error('AI generated 0 cards. Please specify a more detailed Dart topic.');
      }
      
      const now = Date.now();

      const newDeck: Deck = {
        id: crypto.randomUUID(),
        title: topic || (url ? new URL(url).hostname : 'New Dart Deck'),
        folderId: selectedFolderId || undefined,
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

      onDeckGenerated(newDeck);
      setUrl('');
      setTopic('');
    } catch (error: any) {
      console.error(error);
      alert(`Failed to generate deck: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="bg-white/90 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-200/80 p-7 backdrop-blur-md relative overflow-hidden group hover:border-blue-300 transition-all hover:shadow-[0_8px_30px_rgba(37,99,235,0.06)]">
      {/* Decorative ambient background */}
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
      
      <div className="max-w-2xl relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 uppercase italic">
              AI Dart Deck Synthesizer
            </h1>
          </div>
          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-600 border border-blue-200">
            Dart 3.x Engine
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-6 font-sans">
          Provide a Dart topic or paste an algorithm doc URL to instantly synthesize 30 cards across all 9 archetypes.
        </p>
        
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3.5">
            <div className="relative">
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">
                Dart Topic or Algorithm
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <Code2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Dart Binary Search Tree, Graph BFS"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400 font-sans text-xs"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">
                Algorithm Doc / Article URL (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <Link2 className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  placeholder="https://dart.dev/guides or wiki link"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400 font-sans text-xs"
                />
              </div>
            </div>
          </div>

          {folders.length > 0 && (
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-blue-600" /> Target Folder (Optional)
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-sans text-xs focus:bg-white focus:border-blue-500 focus:outline-none transition-all cursor-pointer"
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
              className="w-full sm:w-auto px-7 py-2.5 h-[42px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-[0_4px_16px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Synthesizing in Dart...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Generate 30 Dart Cards
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
