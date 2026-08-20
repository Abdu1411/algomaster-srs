import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  X,
  Plus,
  MoveRight,
  FolderGit2,
  Trash2,
  Clock,
  Folder as FolderIcon,
  Sparkles,
  Tag
} from 'lucide-react';
import { Lesson, Folder } from '../types';
import { WorkspaceTab } from '../components/Sidebar';

interface LessonsViewProps {
  lessons: Lesson[];
  folders: Folder[];
  onOpenMoveLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lessonId: string) => void;
  onNavigateTab: (tab: WorkspaceTab) => void;
}

export function LessonsView({
  lessons,
  folders,
  onOpenMoveLesson,
  onDeleteLesson,
  onNavigateTab
}: LessonsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');

  const safeLessons = Array.isArray(lessons) ? lessons : [];

  // Extract all unique topics
  const topics = useMemo(() => {
    const set = new Set<string>();
    safeLessons.forEach((l) => {
      if (l.topic) set.add(l.topic);
    });
    return Array.from(set);
  }, [safeLessons]);

  // Filtered lessons
  const filteredLessons = useMemo(() => {
    let list = [...safeLessons];

    if (selectedTopic !== 'all') {
      list = list.filter((l) => l.topic === selectedTopic);
    }

    if (selectedFolderId !== 'all') {
      if (selectedFolderId === 'unfiled') {
        list = list.filter((l) => !l.folderId);
      } else {
        list = list.filter((l) => l.folderId === selectedFolderId);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          (l.title || '').toLowerCase().includes(q) ||
          (l.topic || '').toLowerCase().includes(q) ||
          (l.content || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [safeLessons, selectedTopic, selectedFolderId, searchQuery]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1">
            <span>Library</span>
            <span>/</span>
            <span className="text-emerald-700">Lecture Notes</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            CS Lecture Notes & Docs
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Professor-grade computer science notes, markdown documentation & key terminology
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('lesson-generator')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          Generate Notes
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white/80 p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, topics, or content..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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

        {/* Filter dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Topic filter */}
          {topics.length > 0 && (
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="all">All Topics ({topics.length})</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          {/* Folder filter */}
          {folders.length > 0 && (
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="all">All Folders</option>
              <option value="unfiled">Unfiled Only</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Lecture Notes Grid */}
      {filteredLessons.length === 0 ? (
        <div className="bg-white/80 rounded-3xl border border-dashed border-slate-200 p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Lecture Notes Found</h3>
          <p className="text-xs text-slate-500 font-sans mt-1 max-w-sm mx-auto">
            {searchQuery || selectedTopic !== 'all'
              ? 'Try adjusting your filters or search query.'
              : 'Synthesize your first lecture note from any algorithm topic or URL in the Creation Studio.'}
          </p>
          <button
            onClick={() => onNavigateTab('studio')}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all cursor-pointer shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Synthesize Lecture Note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLessons.map((lesson) => {
            const parentFolder = folders.find((f) => f.id === lesson.folderId);
            return (
              <div
                key={lesson.id}
                className="group relative bg-white/95 rounded-3xl shadow-xs border border-slate-200/90 p-6 flex flex-col justify-between transition-all duration-300 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <BookOpen className="w-3 h-3" />
                      {lesson.topic}
                    </span>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => onOpenMoveLesson(lesson)}
                        className="text-slate-400 hover:text-emerald-600 transition-colors p-1.5 rounded-lg hover:bg-emerald-50 cursor-pointer"
                        title="Move to Folder"
                      >
                        <FolderGit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteLesson(lesson.id)}
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

                  {/* Folder Tag */}
                  {parentFolder && (
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100/90 text-slate-700 border border-slate-200/70">
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
          })}
        </div>
      )}
    </div>
  );
}
