import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  FolderPlus,
  Plus,
  Play,
  Sliders,
  Edit2,
  Trash2,
  Folder as FolderIcon,
  Search,
  X,
  Layers,
  ArrowUpDown,
  Filter,
  MoveRight,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { Deck, Folder, Lesson, CardType, ARCHETYPE_CONFIG } from '../types';
import { WorkspaceTab } from '../components/Sidebar';

interface DecksViewProps {
  decks: Deck[];
  folders: Folder[];
  lessons: Lesson[];
  activeFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onOpenNewFolder: () => void;
  onOpenRenameFolder: (folder: Folder) => void;
  onOpenDeleteFolder: (folder: Folder) => void;
  onOpenMoveDeck: (deck: Deck) => void;
  onOpenRenameDeck: (deck: Deck) => void;
  onDeleteDeck: (deckId: string) => void;
  onOpenCustomStudy: (deckId: string) => void;
  onNavigateTab: (tab: WorkspaceTab) => void;
  onOpenBrowseDeckCards?: (deck: Deck) => void;
}

type SortOption = 'due' | 'cards' | 'name' | 'recent';

export function DecksView({
  decks,
  folders,
  lessons,
  activeFolderId,
  onSelectFolder,
  onOpenNewFolder,
  onOpenRenameFolder,
  onOpenDeleteFolder,
  onOpenMoveDeck,
  onOpenRenameDeck,
  onDeleteDeck,
  onOpenCustomStudy,
  onNavigateTab,
  onOpenBrowseDeckCards
}: DecksViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('due');
  const [viewScope, setViewScope] = useState<'folders' | 'all' | 'unfiled'>('folders');

  const safeDecks = Array.isArray(decks) ? decks : [];
  const safeFolders = Array.isArray(folders) ? folders : [];
  const currentFolder = safeFolders.find((f) => f.id === activeFolderId);

  // Filtered Decks based on folder and search query
  const displayedDecks = useMemo(() => {
    let list = [...safeDecks];

    if (activeFolderId) {
      list = list.filter((d) => d.folderId === activeFolderId);
    } else if (viewScope === 'unfiled') {
      list = list.filter((d) => !d.folderId);
    } else if (viewScope === 'folders') {
      // In root folders view, we display unfiled decks below folder cards
      list = list.filter((d) => !d.folderId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d) => (d?.title || '').toLowerCase().includes(q));
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'due') {
        const aDue = (a.cards || []).filter((c) => c.nextReview <= Date.now()).length;
        const bDue = (b.cards || []).filter((c) => c.nextReview <= Date.now()).length;
        return bDue - aDue;
      }
      if (sortBy === 'cards') {
        return (b.cards?.length || 0) - (a.cards?.length || 0);
      }
      if (sortBy === 'name') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'recent') {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      return 0;
    });

    return list;
  }, [safeDecks, activeFolderId, viewScope, searchQuery, sortBy]);

  // Lessons inside active folder
  const folderLessons = useMemo(() => {
    if (!activeFolderId) return [];
    let list = (lessons || []).filter((l) => l.folderId === activeFolderId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((l) => (l.title || '').toLowerCase().includes(q) || (l.topic || '').toLowerCase().includes(q));
    }
    return list;
  }, [lessons, activeFolderId, searchQuery]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1">
            <button
              onClick={() => {
                onSelectFolder(null);
                setViewScope('folders');
              }}
              className={`hover:text-blue-600 cursor-pointer ${!activeFolderId ? 'text-blue-600' : ''}`}
            >
              Library
            </button>
            {currentFolder && (
              <>
                <span>/</span>
                <span className="text-slate-800 flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: currentFolder.color || '#2563eb' }}
                  ></div>
                  {currentFolder.name}
                </span>
              </>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderGit2 className="w-6 h-6 text-blue-600" />
            {currentFolder ? currentFolder.name : 'Flashcard Decks & Folders'}
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            {currentFolder
              ? `Manage decks and notes organized inside "${currentFolder.name}"`
              : 'Organize your spaced repetition study library into custom folders'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {currentFolder ? (
            <>
              <button
                onClick={() => onOpenRenameFolder(currentFolder)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Rename Folder
              </button>
              <button
                onClick={() => onOpenDeleteFolder(currentFolder)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </>
          ) : (
            <button
              onClick={onOpenNewFolder}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
          )}

          <button
            onClick={() => onNavigateTab('deck-generator')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Create Deck
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/80 p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search decks..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View mode toggle & Sort */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {!activeFolderId && (
            <div className="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded-xl">
              <button
                onClick={() => setViewScope('folders')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewScope === 'folders'
                    ? 'bg-white text-blue-600 shadow-2xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Folders View
              </button>
              <button
                onClick={() => setViewScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewScope === 'all'
                    ? 'bg-white text-blue-600 shadow-2xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Decks ({safeDecks.length})
              </button>
            </div>
          )}

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-slate-700 font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="due">Most Due</option>
              <option value="cards">Most Cards</option>
              <option value="name">Title (A-Z)</option>
              <option value="recent">Recently Created</option>
            </select>
          </div>
        </div>
      </div>

      {/* Root Folder Cards Grid (when viewing root and folders mode is active) */}
      {!activeFolderId && viewScope === 'folders' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Folders ({safeFolders.length})
            </h2>
          </div>

          {safeFolders.length === 0 ? (
            <div className="bg-white/80 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
              <p className="text-xs text-slate-500 font-sans">No folders created yet.</p>
              <button
                onClick={onOpenNewFolder}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                Create First Folder
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {safeFolders.map((folder) => {
                const folderDecks = safeDecks.filter((d) => d.folderId === folder.id);
                const folderDeckCards = folderDecks.reduce((acc, d) => acc + (d.cards?.length || 0), 0);
                const folderDue = folderDecks.reduce(
                  (acc, d) => acc + (d.cards || []).filter((c) => c.nextReview <= Date.now()).length,
                  0
                );
                const folderLessonCount = (lessons || []).filter((l) => l.folderId === folder.id).length;

                return (
                  <div
                    key={folder.id}
                    onClick={() => onSelectFolder(folder.id)}
                    className="group bg-white/95 rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs"
                          style={{
                            backgroundColor: `${folder.color || '#2563eb'}15`,
                            borderColor: `${folder.color || '#2563eb'}40`,
                            color: folder.color || '#2563eb'
                          }}
                        >
                          <FolderIcon className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                            {folder.name}
                          </h3>
                          <span className="text-[11px] text-slate-500 font-sans">
                            {folderDecks.length} {folderDecks.length === 1 ? 'deck' : 'decks'}
                            {folderLessonCount > 0 ? ` • ${folderLessonCount} notes` : ''}
                          </span>
                        </div>
                      </div>

                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <button
                          onClick={() => onOpenRenameFolder(folder)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50"
                          title="Rename Folder"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenDeleteFolder(folder)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                          title="Delete Folder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-mono text-slate-500">
                        {folderDeckCards} cards total
                      </span>
                      {folderDue > 0 ? (
                        <span className="font-mono font-bold text-blue-600 text-[11px]">
                          {folderDue} due
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">0 due</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Decks Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            {activeFolderId
              ? `Decks in this Folder (${displayedDecks.length})`
              : viewScope === 'folders'
              ? `Unfiled Decks (${displayedDecks.length})`
              : `All Decks (${displayedDecks.length})`}
          </h2>
        </div>

        {displayedDecks.length === 0 ? (
          <div className="bg-white/80 rounded-3xl border border-dashed border-slate-200 p-8 text-center">
            <h3 className="text-sm font-bold text-slate-800">No Decks Found</h3>
            <p className="text-xs text-slate-500 font-sans mt-1">
              {searchQuery
                ? 'Try a different search term.'
                : activeFolderId
                ? 'This folder does not contain any decks yet.'
                : 'Create or generate your first flashcard deck in the Creation Studio.'}
            </p>
            <button
              onClick={() => onNavigateTab('studio')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-all cursor-pointer shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Synthesize Deck
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedDecks.map((deck) => {
              const dueCards = (deck.cards || []).filter((c) => c.nextReview <= Date.now()).length;
              const hasCards = (deck.cards || []).length > 0;
              const parentFolder = safeFolders.find((f) => f.id === deck.folderId);
              const studyUrl = dueCards > 0 ? `/deck/${deck.id}` : `/deck/${deck.id}?mode=custom&filter=all`;

              return (
                <div
                  key={deck.id}
                  className="group relative bg-white/95 rounded-3xl shadow-xs border border-slate-200/90 p-6 flex flex-col justify-between transition-all duration-300 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-base text-slate-900 line-clamp-1 italic tracking-tight">
                        {deck.title}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {onOpenBrowseDeckCards && (
                          <button
                            onClick={() => onOpenBrowseDeckCards(deck)}
                            className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50 cursor-pointer"
                            title="Browse & Edit Flashcards"
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onOpenRenameDeck(deck)}
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50 cursor-pointer"
                          title="Rename Deck"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenMoveDeck(deck)}
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50 cursor-pointer"
                          title="Move to Folder"
                        >
                          <FolderGit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteDeck(deck.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                          title="Delete Deck"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Folder Badge in All Decks view */}
                    {!activeFolderId && (
                      <div className="mb-4">
                        {parentFolder ? (
                          <span
                            onClick={() => onSelectFolder(parentFolder.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100/90 text-slate-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-all border border-slate-200/70"
                          >
                            <FolderIcon className="w-3.5 h-3.5 text-blue-500" />
                            {parentFolder.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-400 border border-slate-200/60">
                            Unfiled
                          </span>
                        )}
                      </div>
                    )}

                    {/* Stats Bar */}
                    <div className="flex items-center gap-4 mb-3 p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
                      <div className="text-xs flex flex-col flex-1">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total</span>
                        <span className="font-mono font-bold text-slate-800 text-sm">{deck.cards.length} cards</span>
                      </div>
                      <div className="w-px h-7 bg-slate-200"></div>
                      <div className="text-xs flex flex-col flex-1">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Due Queue</span>
                        <span className={`font-mono font-bold text-sm ${dueCards > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                          {dueCards} cards
                        </span>
                      </div>
                    </div>

                    {/* 1-Click Archetype Study Pills */}
                    {hasCards && (
                      <div className="mb-4">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1.5">
                          Study by Archetype:
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(() => {
                            const counts: Record<string, number> = {};
                            deck.cards.forEach(c => {
                              const t = c.type || 'Concept';
                              counts[t] = (counts[t] || 0) + 1;
                            });
                            return Object.entries(counts).map(([type, count]) => {
                              const meta = ARCHETYPE_CONFIG[type as CardType] || ARCHETYPE_CONFIG.Concept;
                              return (
                                <Link
                                  key={type}
                                  to={`/deck/${deck.id}?types=${type}&filter=all`}
                                  title={`Study ${count} ${meta.label} (${type}) cards in this deck`}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${meta.bg} ${meta.text} ${meta.border} border hover:scale-105 transition-transform shadow-2xs`}
                                >
                                  <span>{meta.icon}</span>
                                  <span>{count}</span>
                                </Link>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex gap-2">
                    {hasCards ? (
                      <>
                        <Link
                          to={studyUrl}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_18px_rgba(37,99,235,0.35)]"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          {dueCards > 0 ? `Study (${dueCards})` : `Review All (${deck.cards.length})`}
                        </Link>
                        <button
                          onClick={() => onOpenCustomStudy(deck.id)}
                          className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-blue-600 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                          title="Custom Study Options"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="w-full text-center py-2 text-xs font-sans text-slate-400">No cards in deck</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CS Lecture Notes inside this folder (if activeFolderId is set) */}
      {activeFolderId && folderLessons.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-slate-200">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Lecture Notes in this Folder ({folderLessons.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {folderLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white/95 rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                    <BookOpen className="w-3 h-3" />
                    {lesson.topic}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-2 mb-2">{lesson.title}</h3>
                  <p className="text-xs text-slate-500 font-sans line-clamp-2">
                    {lesson.content.replace(/[#*`_$-]/g, '').slice(0, 80)}...
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end">
                  <Link
                    to={`/lesson/${lesson.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    Read Notes <MoveRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
