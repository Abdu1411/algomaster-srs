import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BrainCircuit, Flame, FolderGit2, Layers, Sparkles } from 'lucide-react';
import { useDecks } from '../store';
import { AskAIModal } from './AskAIModal';

export function Header() {
  const { stats } = useDecks();
  const location = useLocation();
  const isAllDecksView = location.search.includes('view=all');
  const [isAskAiOpen, setIsAskAiOpen] = useState(false);

  return (
    <header className="h-20 flex items-center justify-between px-6 lg:px-8 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl sticky top-0 z-40 shadow-xs">
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3.5 group">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-[0_4px_20px_rgba(37,99,235,0.3)] group-hover:scale-105 transition-transform">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase italic">
                AlgoMaster <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">SRS</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Dart Edition
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono tracking-wider">Dart Algorithm & Data Structures Accelerator</p>
          </div>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/?view=folders"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              !isAllDecksView
                ? 'bg-blue-50 text-blue-600 border border-blue-200/80 shadow-2xs'
                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100/70 border border-transparent'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            Folders
          </Link>

          <Link
            to="/?view=all"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              isAllDecksView
                ? 'bg-blue-50 text-blue-600 border border-blue-200/80 shadow-2xs'
                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100/70 border border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            All Decks
          </Link>

          <button
            onClick={() => setIsAskAiOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-purple-700 border border-purple-200/80 shadow-2xs cursor-pointer group"
            title="Ask AlgoMaster AI anything about Dart algorithms"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 group-hover:rotate-12 transition-transform" />
            Ask AI
          </button>

          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/70 shadow-xs">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-extrabold text-orange-600 font-mono">{stats.streak}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600/80">Day Streak</span>
            </div>
          </div>
        </nav>
      </div>

      <AskAIModal
        isOpen={isAskAiOpen}
        onClose={() => setIsAskAiOpen(false)}
      />
    </header>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans relative selection:bg-blue-500/20 selection:text-blue-900">
      {/* Decorative ambient color blobs */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulseGlow"></div>
      <div className="fixed top-1/3 right-10 w-[450px] h-[450px] bg-gradient-to-br from-cyan-400/10 to-blue-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulseGlow" style={{ animationDelay: '2s' }}></div>
      <div className="fixed bottom-10 left-10 w-[400px] h-[400px] bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulseGlow" style={{ animationDelay: '4s' }}></div>

      <Header />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {children}
      </main>

      <footer className="border-t border-slate-200/80 bg-white/60 backdrop-blur-md py-6 px-6 lg:px-8 relative z-10 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-sans">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">AlgoMaster SRS</span>
            <span>•</span>
            <span>Spaced Repetition for Dart & Computer Science Algorithms</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-slate-400">Study Shortcuts:</span>
            <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-bold">Space</span>
            <span className="text-slate-400">Flip</span>
            <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-bold">1</span>
            <span className="text-slate-400">Again</span>
            <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-bold">2</span>
            <span className="text-slate-400">Good</span>
            <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-bold">3</span>
            <span className="text-slate-400">Easy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
