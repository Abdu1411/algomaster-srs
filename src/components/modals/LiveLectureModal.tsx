import React, { useState } from 'react';
import { Video, X, Sparkles, FolderGit2 } from 'lucide-react';
import { Folder } from '../../types';

interface LiveLectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  onCreate: (lectureData: {
    title: string;
    topic: string;
    videoUrl: string;
    folderId?: string;
  }) => Promise<void>;
}

export function LiveLectureModal({ isOpen, onClose, folders, onCreate }: LiveLectureModalProps) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [folderId, setFolderId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !topic.trim() || !videoUrl.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        topic: topic.trim(),
        videoUrl: videoUrl.trim(),
        folderId: folderId || undefined
      });
      setTitle('');
      setTopic('');
      setVideoUrl('');
      setFolderId('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-scaleIn">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shadow-2xs">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Schedule / Add Live Lecture</h3>
              <p className="text-xs text-slate-500 font-sans">
                Attach YouTube video streams or recorded courses with interactive notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">
              Lecture Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Masterclass: Dynamic Programming in Dart"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800 text-xs font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">
                Topic / Subject
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Graphs, Trees, Sorts"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800 text-xs font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">
                Assign to Folder
              </label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800 text-xs font-sans cursor-pointer"
              >
                <option value="">📁 Unfiled (No Folder)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">
              YouTube Video URL / Live Stream URL
            </label>
            <input
              type="url"
              required
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800 text-xs font-sans"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !topic.trim() || !videoUrl.trim() || isSubmitting}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Add Live Lecture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
