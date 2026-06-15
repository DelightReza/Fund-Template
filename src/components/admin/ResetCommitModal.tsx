import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore, GitCommitInfo } from '../../store';
import { RotateCcw, AlertTriangle, Loader2, GitCommit, Check, X } from 'lucide-react';

interface ResetCommitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResetCommitModal({ isOpen, onClose }: ResetCommitModalProps) {
  const { config, pat, fetchRecentCommits, resetGithubCommit } = useAppStore();
  const [commits, setCommits] = useState<GitCommitInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<GitCommitInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCommits();
    } else {
      setSelectedCommit(null);
      setError(null);
    }
  }, [isOpen]);

  const loadCommits = async () => {
    setLoading(true);
    setError(null);
    try {
      const history = await fetchRecentCommits();
      setCommits(history);
      if (history.length > 1) {
        // Default select HEAD~1 if available
        setSelectedCommit(history[1]);
      } else if (history.length === 1) {
        setSelectedCommit(history[0]);
      }
    } catch (err: any) {
      setError('Failed to load commits from GitHub.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!selectedCommit) return;
    setResetting(true);
    setError(null);
    try {
      const success = await resetGithubCommit(selectedCommit.sha, selectedCommit.index);
      if (success) {
        onClose();
      } else {
        setError('Reset failed. Please check your GitHub PAT permissions or network connection.');
      }
    } catch (err: any) {
      setError(err.message || 'Reset failed.');
    } finally {
      setResetting(false);
    }
  };

  if (!isOpen || typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Reset Commit
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {!pat && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <strong>GitHub PAT Required:</strong> You need to set a GitHub Personal Access Token (PAT) with repo scope to perform force reset on remote commits.
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Quick Reset Shortcuts */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              Quick Reset Shortcuts
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((offset) => {
                const target = commits.find(c => c.index === offset);
                const isSelected = selectedCommit?.index === offset;
                return (
                  <button
                    key={`head_${offset}`}
                    onClick={() => target && setSelectedCommit(target)}
                    disabled={loading || !target}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-600/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <span>Last {offset}</span>
                    <span className="text-[10px] font-mono opacity-80">
                      {target ? target.sha.slice(0, 7) : 'N/A'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Commit List */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Select Target Commit to Reset To
              </label>
              <button
                onClick={loadCommits}
                disabled={loading}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs font-medium">Fetching commits from GitHub...</span>
              </div>
            ) : commits.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                No commits found or repo details not configured.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {commits.map((c) => {
                  const isSelected = selectedCommit?.sha === c.sha;
                  const isCurrentHead = c.index === 0;
                  return (
                    <div
                      key={c.sha}
                      onClick={() => setSelectedCommit(c)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-500'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                          isCurrentHead 
                            ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          <GitCommit className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {c.sha.slice(0, 7)}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isCurrentHead
                                ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {isCurrentHead ? 'Current' : `Last ${c.index}`}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mt-1 line-clamp-1">
                            {c.message}
                          </p>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 flex gap-2">
                            <span>{c.author}</span>
                            <span>•</span>
                            <span>{c.date ? new Date(c.date).toLocaleString() : ''}</span>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="p-1 rounded-full bg-amber-500 text-white shrink-0 mt-1">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Warning Banner */}
          {selectedCommit && selectedCommit.index > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-bold">Warning: Reset Target Selected</p>
                <p className="mt-1 opacity-90">
                  This will revert your GitHub repository to commit <span className="font-mono font-bold px-1 py-0.5 bg-amber-500/20 rounded">{selectedCommit.sha.slice(0, 7)}</span> (Last {selectedCommit.index}). The branch pointer will be moved back, and {selectedCommit.index} recent commit{selectedCommit.index > 1 ? 's' : ''} will be unlinked.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={resetting}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleReset}
            disabled={resetting || !selectedCommit || selectedCommit.index === 0 || !pat}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-600/20 flex items-center justify-center disabled:opacity-40 disabled:hover:scale-100"
          >
            {resetting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resetting Branch...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                {selectedCommit ? `Reset to Last ${selectedCommit.index}` : 'Reset Commit'}
              </>
            )}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
