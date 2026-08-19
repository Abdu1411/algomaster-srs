import React, { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useDecks } from '../store';
import {
  Trash2,
  Play,
  Sliders,
  Sparkles,
  BookOpen,
  Layers,
  FolderGit2,
  Plus,
  FolderPlus,
  FolderOpen,
  ArrowLeft,
  Edit2,
  MoveRight,
  X,
  AlertTriangle,
  Check,
  Tag,
  Folder as FolderIcon,
  Search,
  PenTool,
  Bot,
  ExternalLink,
  FileText,
  Clock
} from 'lucide-react';
import { AICardGenerator } from '../components/AICardGenerator';
import { ProgressDashboard } from '../components/ProgressDashboard';
import { ManualCardCreator } from '../components/ManualCardCreator';
import { LessonGenerator } from '../components/LessonGenerator';
import { CustomStudyModal } from '../components/CustomStudyModal';
import { Deck, Folder, Lesson } from '../types';

export function Home() {
  const navigate = useNavigate();
  const {
    decks,
    folders,
    lessons,
    addDeck,
    deleteDeck,
    renameDeck,
    addCardToDeck,
    addFolder,
    updateFolder,
    deleteFolder,
    moveDeckToFolder,
    addLesson,
    updateLesson,
    deleteLesson,
    renameLesson,
    moveLessonToFolder
  } = useDecks();

  const [searchParams, setSearchParams] = useSearchParams();
  const currentViewParam = searchParams.get('view');
  const isAllView = currentViewParam === 'all';
  const isLessonsOnlyView = currentViewParam === 'lessons';
  const activeFolderId = searchParams.get('folder');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [creationTab, setCreationTab] = useState<'ai' | 'lesson' | 'manual'>('ai');

  // Custom Study Modal State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [selectedDeckForCustom, setSelectedDeckForCustom] = useState<string>('all');

  // Folder Modals State
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#2563eb');

  const [folderToRename, setFolderToRename] = useState<Folder | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');

  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [deleteDecksWithFolder, setDeleteDecksWithFolder] = useState(false);

  const [deckToMove, setDeckToMove] = useState<Deck | null>(null);
  const [targetMoveFolderId, setTargetMoveFolderId] = useState<string>('');

  const [lessonToMove, setLessonToMove] = useState<Lesson | null>(null);
  const [targetMoveLessonFolderId, setTargetMoveLessonFolderId] = useState<string>('');

  // Deck Renaming State
  const [deckToRename, setDeckToRename] = useState<Deck | null>(null);
  const [renameDeckTitle, setRenameDeckTitle] = useState('');

  const safeDecks = Array.isArray(decks) ? decks : [];
  const safeFolders = Array.isArray(folders) ? folders : [];
  const safeLessons = Array.isArray(lessons) ? lessons : [];

  const currentFolder = safeFolders.find(f => f.id === activeFolderId);

  const totalCards = safeDecks.reduce((acc, d) => acc + (d?.cards?.length || 0), 0);
  const totalDue = safeDecks.reduce((acc, d) => acc + (d?.cards || []).filter(c => c.nextReview <= Date.now()).length, 0);

  const openCustomStudy = (targetId: string = 'all') => {
    setSelectedDeckForCustom(targetId);
    setIsCustomModalOpen(true);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await addFolder(newFolderName.trim(), newFolderColor);
    setNewFolderName('');
    setIsNewFolderOpen(false);
  };

  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToRename || !renameFolderName.trim()) return;
    await updateFolder(folderToRename.id, renameFolderName.trim());
    setFolderToRename(null);
  };

  const handleRenameDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckToRename || !renameDeckTitle.trim()) return;
    await renameDeck(deckToRename.id, renameDeckTitle.trim());
    setDeckToRename(null);
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    await deleteFolder(folderToDelete.id, deleteDecksWithFolder);
    setFolderToDelete(null);
    if (activeFolderId === folderToDelete.id) {
      setSearchParams({ view: 'folders' });
    }
  };

  const handleMoveDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckToMove) return;
    await moveDeckToFolder(deckToMove.id, targetMoveFolderId || undefined);
    setDeckToMove(null);
  };

  const handleMoveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonToMove) return;
    await moveLessonToFolder(lessonToMove.id, targetMoveLessonFolderId || undefined);
    setLessonToMove(null);
  };

  // Color options for folder creation
  const colorOptions = [
    { label: 'Blue', hex: '#2563eb' },
    { label: 'Indigo', hex: '#4f46e5' },
    { label: 'Cyan', hex: '#0891b2' },
    { label: 'Emerald', hex: '#059669' },
    { label: 'Amber', hex: '#d97706' },
    { label: 'Rose', hex: '#e11d48' },
    { label: 'Purple', hex: '#9333ea' },
    { label: 'Slate', hex: '#475569' }
  ];

  // Filtered decks, lessons & folders based on search
  const filteredDecks = useMemo(() => {
    if (!searchQuery.trim()) return safeDecks;
    const q = searchQuery.toLowerCase();
    return safeDecks.filter(d => (d?.title || '').toLowerCase().includes(q));
  }, [safeDecks, searchQuery]);

  const filteredLessons = useMemo(() => {
    if (!searchQuery.trim()) return safeLessons;
    const q = searchQuery.toLowerCase();
    return safeLessons.filter(
      l =>
        (l?.title || '').toLowerCase().includes(q) ||
        (l?.topic || '').toLowerCase().includes(q) ||
        (l?.content || '').toLowerCase().includes(q)
    );
  }, [safeLessons, searchQuery]);

  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return safeFolders;
    const q = searchQuery.toLowerCase();
    return safeFolders.filter(f => (f?.name || '').toLowerCase().includes(q));
  }, [safeFolders, searchQuery]);

  // Helper renderer for a single deck card
  const renderDeckCard = (deck: Deck) => {
    const dueCards = deck.cards.filter(c => c.nextReview <= Date.now()).length;
    const hasCards = deck.cards.length > 0;
    const activeCount = dueCards > 0 ? dueCards : deck.cards.length;
    const parentFolder = folders.find(f => f.id === deck.folderId);

    const studyUrl = dueCards > 0
      ? `/deck/${deck.id}`
      : `/deck/${deck.id}?mode=custom&filter=all`;

    return (
      <div
        key={deck.id}
        className="group relative bg-white/95 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/90 p-6 flex flex-col justify-between transition-all duration-300 hover:border-blue-300 hover:shadow-[0_16px_40px_rgba(37,99,235,0.08)] hover:-translate-y-1"
      >
        <div>
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-bold text-base text-slate-900 line-clamp-1 italic tracking-tight">{deck.title}</h3>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                onClick={() => {
                  setDeckToRename(deck);
                  setRenameDeckTitle(deck.title);
                }}
                className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50 cursor-pointer"
                title="Rename Deck"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setDeckToMove(deck);
                  setTargetMoveFolderId(deck.folderId || '');
                }}
                className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50 cursor-pointer"
                title="Move to Folder"
              >
                <FolderGit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteDeck(deck.id)}
                className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                title="Delete deck"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Folder Tag if in All Decks view */}
          {isAllView && (
            <div className="mb-4">
              {parentFolder ? (
                <span
                  onClick={() => setSearchParams({ folder: parentFolder.id })}
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
          <div className="flex items-center gap-4 mb-5 p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
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
        </div>

        <div className="pt-3 border-t border-slate-100 flex gap-2">
          {hasCards ? (
            <>
              <Link
                to={studyUrl}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:bg-[length:200%_auto] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_18px_rgba(37,99,235,0.35)]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {dueCards > 0 ? `Study (${activeCount})` : `Review All (${activeCount})`}
              </Link>
              <button
                onClick={() => openCustomStudy(deck.id)}
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
  };

  // Helper renderer for a single lesson card
  const renderLessonCard = (lesson: Lesson) => {
    const parentFolder = folders.find(f => f.id === lesson.folderId);

    return (
      <div
        key={lesson.id}
        className="group relative bg-white/95 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/90 p-6 flex flex-col justify-between transition-all duration-300 hover:border-emerald-300 hover:shadow-[0_16px_40px_rgba(16,185,129,0.08)] hover:-translate-y-1"
      >
        <div>
          <div className="flex justify-between items-start mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <BookOpen className="w-3 h-3" />
              {lesson.topic}
            </span>

            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                onClick={() => {
                  setLessonToMove(lesson);
                  setTargetMoveLessonFolderId(lesson.folderId || '');
                }}
                className="text-slate-400 hover:text-emerald-600 transition-colors p-1.5 rounded-lg hover:bg-emerald-50 cursor-pointer"
                title="Move to Folder"
              >
                <FolderGit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteLesson(lesson.id)}
                className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                title="Delete lecture note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <Link to={`/lesson/${lesson.id}`} className="block group-hover:text-emerald-600 transition-colors">
            <h3 className="font-bold text-base text-slate-900 line-clamp-2 tracking-tight mb-2 group-hover:text-emerald-600">
              {lesson.title}
            </h3>
          </Link>

          {/* Folder Tag if in All / Root view */}
          {parentFolder && (
            <div className="mb-3">
              <span
                onClick={() => setSearchParams({ folder: parentFolder.id })}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100/90 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer transition-all border border-slate-200/70"
              >
                <FolderIcon className="w-3 h-3 text-blue-500" />
                {parentFolder.name}
              </span>
            </div>
          )}

          <p className="text-xs text-slate-500 font-sans line-clamp-3 mb-4 leading-relaxed">
            {lesson.content.replace(/[#*`_$-]/g, '').slice(0, 140)}...
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(lesson.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>

          <Link
            to={`/lesson/${lesson.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            Read Notes <MoveRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      {/* Analytics Dashboard */}
      <ProgressDashboard />

      {/* Unified Creation Hub */}
      <section className="bg-white/95 rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-6 sm:p-8 backdrop-blur-md relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-blue-400/10 via-emerald-400/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        {/* Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              AlgoMaster Creation Studio
            </h2>
            <p className="text-xs text-slate-500 font-sans mt-0.5">Synthesize 30-card decks with AI, generate professor-grade CS notes, or craft cards manually</p>
          </div>

          <div className="inline-flex p-1 bg-slate-100/90 border border-slate-200/80 rounded-2xl self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setCreationTab('ai')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                creationTab === 'ai'
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              AI Deck Synthesizer
            </button>
            <button
              onClick={() => setCreationTab('lesson')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                creationTab === 'lesson'
                  ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              CS Lecture Notes
            </button>
            <button
              onClick={() => setCreationTab('manual')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                creationTab === 'manual'
                  ? 'bg-white text-amber-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              Manual Card Forge
            </button>
          </div>
        </div>

        {/* Selected Tab Content */}
        <div className="animate-fadeIn">
          {creationTab === 'ai' && (
            <AICardGenerator onDeckGenerated={addDeck} />
          )}
          {creationTab === 'lesson' && (
            <LessonGenerator onLessonGenerated={(l) => {
              addLesson(l);
              navigate(`/lesson/${l.id}`);
            }} />
          )}
          {creationTab === 'manual' && (
            <ManualCardCreator decks={decks} onAddDeck={addDeck} onAddCard={addCardToDeck} />
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SEARCH & CONTROLS BAR */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Field */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search decks, lessons, or folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/90 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-sans text-slate-800 placeholder-slate-400 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchParams({ view: 'folders' })}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer ${
              !isAllView && !isLessonsOnlyView && !currentFolder
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            Folders
          </button>

          <button
            onClick={() => setSearchParams({ view: 'all' })}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer ${
              isAllView
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            All Decks ({decks.length})
          </button>

          <button
            onClick={() => setSearchParams({ view: 'lessons' })}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer ${
              isLessonsOnlyView
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Lessons ({lessons.length})
          </button>

          {!isAllView && !isLessonsOnlyView && !currentFolder && (
            <button
              onClick={() => setIsNewFolderOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[0_4px_14px_rgba(37,99,235,0.25)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Folder
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: ALL DECKS FLAT VIEW */}
      {/* ========================================================================= */}
      {isAllView && (
        <section className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/80 shadow-2xs">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm text-slate-900 uppercase tracking-wider font-extrabold flex items-center gap-2">
                  All Dart Decks ({filteredDecks.length})
                </h2>
                <p className="text-xs text-slate-500 font-sans">Showing all decks across all folders in a unified flat grid</p>
              </div>
            </div>
          </div>

          {filteredDecks.length === 0 ? (
            <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 bg-white/60 rounded-3xl text-slate-500 font-sans text-sm shadow-xs">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 mb-1">
                {searchQuery ? `No decks matching "${searchQuery}"` : 'No Dart decks available yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Generate a 30-card deck with AI or craft flashcards manually in the studio above.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDecks.map(renderDeckCard)}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: ALL CS LESSONS VIEW */}
      {/* ========================================================================= */}
      {isLessonsOnlyView && (
        <section className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/80 shadow-2xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm text-slate-900 uppercase tracking-wider font-extrabold flex items-center gap-2">
                  All CS Lecture Notes ({filteredLessons.length})
                </h2>
                <p className="text-xs text-slate-500 font-sans">Structured, professor-grade computer science notes with IDE code blocks and Big-O analysis</p>
              </div>
            </div>
          </div>

          {filteredLessons.length === 0 ? (
            <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 bg-white/60 rounded-3xl text-slate-500 font-sans text-sm shadow-xs">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 mb-1">
                {searchQuery ? `No lecture notes matching "${searchQuery}"` : 'No CS lecture notes generated yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Paste any article URL or topic in the Creation Studio above to synthesize your first lecture note.
              </p>
              <button
                onClick={() => setCreationTab('lesson')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Lecture Notes
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLessons.map(renderLessonCard)}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 3: DRILLED DOWN INTO A SPECIFIC FOLDER */}
      {/* ========================================================================= */}
      {!isAllView && !isLessonsOnlyView && currentFolder && (
        <section className="space-y-8 animate-fadeIn">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSearchParams({ view: 'folders' })}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600 transition-colors py-1.5 px-3 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-blue-200 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to All Folders
            </button>
          </div>

          {/* Folder Hero Banner */}
          {(() => {
            const folderDecks = decks.filter(d => d.folderId === currentFolder.id);
            const folderLessons = lessons.filter(l => l.folderId === currentFolder.id);
            const folderCardsCount = folderDecks.reduce((acc, d) => acc + d.cards.length, 0);
            const folderDueCount = folderDecks.reduce(
              (acc, d) => acc + d.cards.filter(c => c.nextReview <= Date.now()).length,
              0
            );

            const studyFolderUrl = folderDueCount > 0
              ? `/deck/folder-${currentFolder.id}`
              : `/deck/folder-${currentFolder.id}?mode=custom&filter=all`;

            return (
              <div className="bg-white/95 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/90 p-6 sm:p-8 backdrop-blur-md relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 bottom-0 w-2.5"
                  style={{ backgroundColor: currentFolder.color || '#2563eb' }}
                ></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-2">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md shrink-0 text-white"
                      style={{ backgroundColor: currentFolder.color || '#2563eb' }}
                    >
                      <FolderOpen className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{currentFolder.name}</h2>
                        <button
                          onClick={() => {
                            setFolderToRename(currentFolder);
                            setRenameFolderName(currentFolder.name);
                          }}
                          className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Rename Folder"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setFolderToDelete(currentFolder)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Folder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 font-sans mt-1">
                        {folderDecks.length} Decks • {folderLessons.length} Lessons • {folderCardsCount} Total Cards • {folderDueCount} Due Today
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {folderCardsCount > 0 && (
                      <Link
                        to={studyFolderUrl}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_18px_rgba(37,99,235,0.35)]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {folderDueCount > 0 ? `Study Folder (${folderDueCount})` : `Review Folder (${folderCardsCount})`}
                      </Link>
                    )}

                    {folderCardsCount > 0 && (
                      <button
                        onClick={() => openCustomStudy(`folder-${currentFolder.id}`)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5 text-blue-600" />
                        Custom Study
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Section A: Decks in this folder */}
          {(() => {
            const folderDecks = filteredDecks.filter(d => d.folderId === currentFolder.id);

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs text-slate-500 uppercase tracking-widest font-extrabold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Decks in {currentFolder.name} ({folderDecks.length})
                  </h3>
                </div>

                {folderDecks.length === 0 ? (
                  <div className="text-center py-10 px-4 border border-dashed border-slate-200 bg-white/40 rounded-2xl text-slate-400 font-sans text-xs">
                    No flashcard decks in this folder yet.
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {folderDecks.map(renderDeckCard)}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Section B: Lessons in this folder */}
          {(() => {
            const folderLessons = filteredLessons.filter(l => l.folderId === currentFolder.id);

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs text-slate-500 uppercase tracking-widest font-extrabold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    Lecture Notes in {currentFolder.name} ({folderLessons.length})
                  </h3>
                </div>

                {folderLessons.length === 0 ? (
                  <div className="text-center py-10 px-4 border border-dashed border-slate-200 bg-white/40 rounded-2xl text-slate-400 font-sans text-xs">
                    No lecture notes in this folder yet.
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {folderLessons.map(renderLessonCard)}
                  </div>
                )}
              </div>
            );
          })()}
        </section>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 4: ROOT FOLDERS + UNFILED DECKS & LESSONS (DEFAULT) */}
      {/* ========================================================================= */}
      {!isAllView && !isLessonsOnlyView && !currentFolder && (
        <div className="space-y-10">
          {/* Folders Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xs text-slate-500 uppercase tracking-widest font-extrabold flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-blue-600" />
                  Your Folders ({filteredFolders.length})
                </h2>
              </div>
            </div>

            {filteredFolders.length === 0 ? (
              <div
                onClick={() => setIsNewFolderOpen(true)}
                className="group cursor-pointer text-center py-12 px-6 border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white/60 hover:bg-blue-50/40 rounded-3xl text-slate-500 transition-all shadow-xs"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <FolderPlus className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  {searchQuery ? `No folders matching "${searchQuery}"` : 'Create your first folder'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Organize your Dart algorithm decks and CS lecture notes into sections (e.g., "Trees & Graphs", "Dynamic Programming").
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFolders.map((folder) => {
                  const folderDecks = decks.filter(d => d.folderId === folder.id);
                  const folderLessons = lessons.filter(l => l.folderId === folder.id);
                  const folderCardsCount = folderDecks.reduce((acc, d) => acc + d.cards.length, 0);
                  const folderDueCount = folderDecks.reduce(
                    (acc, d) => acc + d.cards.filter(c => c.nextReview <= Date.now()).length,
                    0
                  );

                  return (
                    <div
                      key={folder.id}
                      className="group relative bg-white/95 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/90 p-6 flex flex-col justify-between transition-all duration-300 hover:border-blue-300 hover:shadow-[0_16px_40px_rgba(37,99,235,0.08)] hover:-translate-y-1"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm"
                              style={{ backgroundColor: folder.color || '#2563eb' }}
                            >
                              <FolderIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3
                                onClick={() => setSearchParams({ folder: folder.id })}
                                className="font-bold text-base text-slate-900 line-clamp-1 hover:text-blue-600 cursor-pointer transition-colors"
                              >
                                {folder.name}
                              </h3>
                              <span className="text-xs text-slate-500 font-sans">
                                {folderDecks.length} {folderDecks.length === 1 ? 'Deck' : 'Decks'} • {folderLessons.length} {folderLessons.length === 1 ? 'Note' : 'Notes'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setFolderToRename(folder);
                                setRenameFolderName(folder.name);
                              }}
                              className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Rename Folder"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setFolderToDelete(folder)}
                              className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Folder"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
                          <div className="text-xs flex flex-col flex-1">
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Cards</span>
                            <span className="font-mono font-bold text-slate-800 text-sm">{folderCardsCount}</span>
                          </div>
                          <div className="w-px h-7 bg-slate-200"></div>
                          <div className="text-xs flex flex-col flex-1">
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Due</span>
                            <span className={`font-mono font-bold text-sm ${folderDueCount > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                              {folderDueCount}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex gap-2">
                        <button
                          onClick={() => setSearchParams({ folder: folder.id })}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                          Open Folder
                        </button>

                        {folderDueCount > 0 && (
                          <Link
                            to={`/deck/folder-${folder.id}`}
                            className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-1.5"
                            title="Study All Due Cards in Folder"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            {folderDueCount}
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Unfiled Decks Section */}
          {(() => {
            const unfiledDecks = filteredDecks.filter(d => !d.folderId);

            return (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xs text-slate-500 uppercase tracking-widest font-extrabold flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-500" />
                      Unfiled Decks ({unfiledDecks.length})
                    </h2>
                  </div>
                </div>

                {unfiledDecks.length === 0 ? (
                  <div className="text-center py-8 px-4 border border-dashed border-slate-200 bg-white/40 rounded-2xl text-slate-400 font-sans text-xs">
                    {decks.length === 0 ? (
                      <span>No decks available yet. Create or generate a deck above!</span>
                    ) : (
                      <span>All your decks are neatly organized into folders.</span>
                    )}
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {unfiledDecks.map(renderDeckCard)}
                  </div>
                )}
              </section>
            );
          })()}

          {/* Unfiled Lessons Section */}
          {(() => {
            const unfiledLessons = filteredLessons.filter(l => !l.folderId);

            return (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xs text-slate-500 uppercase tracking-widest font-extrabold flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      Unfiled CS Lecture Notes ({unfiledLessons.length})
                    </h2>
                  </div>
                </div>

                {unfiledLessons.length === 0 ? (
                  <div className="text-center py-8 px-4 border border-dashed border-slate-200 bg-white/40 rounded-2xl text-slate-400 font-sans text-xs">
                    {lessons.length === 0 ? (
                      <span>No lecture notes generated yet. Generate your first one in the Creation Studio above!</span>
                    ) : (
                      <span>All your lecture notes are organized into folders.</span>
                    )}
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {unfiledLessons.map(renderLessonCard)}
                  </div>
                )}
              </section>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Create Folder Modal */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-scaleIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-2xs">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Create New Folder</h3>
              </div>
              <button
                onClick={() => setIsNewFolderOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Trees & Graphs, Dynamic Programming, System Design"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-xs font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
                  Accent Color
                </label>
                <div className="flex items-center gap-2.5">
                  {colorOptions.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setNewFolderColor(c.hex)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                        newFolderColor === c.hex ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    >
                      {newFolderColor === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Rename Folder Modal */}
      {folderToRename && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-scaleIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Rename Folder</h3>
              </div>
              <button
                onClick={() => setFolderToRename(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameFolder} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={renameFolderName}
                  onChange={(e) => setRenameFolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-xs font-sans"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setFolderToRename(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameFolderName.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Delete Folder Modal */}
      {folderToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-scaleIn">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete "{folderToDelete.name}"?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Choose how you want to handle the decks and lessons currently stored inside this folder.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 my-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="deleteChoice"
                  checked={!deleteDecksWithFolder}
                  onChange={() => setDeleteDecksWithFolder(false)}
                  className="mt-0.5 text-blue-600 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Keep Decks & Notes (Move to Unfiled)</span>
                  <span className="text-[11px] text-slate-500 block">The folder will be deleted, but all items are preserved in unfiled.</span>
                </div>
              </label>

              <div className="border-t border-slate-200 my-2"></div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="deleteChoice"
                  checked={deleteDecksWithFolder}
                  onChange={() => setDeleteDecksWithFolder(true)}
                  className="mt-0.5 text-rose-600 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-rose-600 block">Delete Folder and All Contained Items</span>
                  <span className="text-[11px] text-slate-500 block">Permanently delete this folder and all flashcard decks & lessons inside it.</span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFolder}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Delete Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Move Deck to Folder Modal */}
      {deckToMove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-scaleIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-2xs">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Move Deck</h3>
                  <p className="text-xs text-slate-500 font-sans line-clamp-1 italic">{deckToMove.title}</p>
                </div>
              </div>
              <button
                onClick={() => setDeckToMove(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMoveDeck} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">
                  Select Destination Folder
                </label>
                <select
                  value={targetMoveFolderId}
                  onChange={(e) => setTargetMoveFolderId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-xs font-sans cursor-pointer"
                >
                  <option value="">📁 Unfiled / Root (No Folder)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setDeckToMove(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Move Deck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Move Lesson to Folder Modal */}
      {lessonToMove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-scaleIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Move Lecture Note</h3>
                  <p className="text-xs text-slate-500 font-sans line-clamp-1 italic">{lessonToMove.title}</p>
                </div>
              </div>
              <button
                onClick={() => setLessonToMove(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMoveLesson} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">
                  Select Destination Folder
                </label>
                <select
                  value={targetMoveLessonFolderId}
                  onChange={(e) => setTargetMoveLessonFolderId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 text-xs font-sans cursor-pointer"
                >
                  <option value="">📁 Unfiled / Root (No Folder)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setLessonToMove(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Move Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Rename Deck Modal */}
      {deckToRename && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-scaleIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Rename Deck</h3>
              </div>
              <button
                onClick={() => setDeckToRename(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameDeck} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">
                  Deck Title
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={renameDeckTitle}
                  onChange={(e) => setRenameDeckTitle(e.target.value)}
                  placeholder="e.g. Binary Search Trees"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-xs font-sans"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setDeckToRename(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameDeckTitle.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Custom Study Modal */}
      <CustomStudyModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        decks={decks}
        initialDeckId={selectedDeckForCustom}
      />
    </div>
  );
}
