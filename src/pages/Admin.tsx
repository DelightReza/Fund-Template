import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../store';
import { Save, Github, Settings as SettingsIcon, PlusCircle, Key, RefreshCw, Loader2, RotateCcw, Trash2, Lock, Unlock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { TransactionForms } from '../components/admin/TransactionForms';
import { AdvancedTools } from '../components/admin/AdvancedTools';
import { TransactionHistory } from '../components/admin/TransactionHistory';
import { SettingsPanel } from '../components/admin/SettingsPanel';
import { BalancesPanel } from '../components/admin/BalancesPanel';
import { ResetCommitModal } from '../components/admin/ResetCommitModal';

export function Admin() {
  const { pat, setPat, config, verifyGithubToken, adminVerification, setAdminVerification, saveDataToGithub, saveConfigToGithub, syncFromGithub, clearLocalData } = useAppStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isCommittingData, setIsCommittingData] = useState(false);
  const [isCommittingConfig, setIsCommittingConfig] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationInput, setVerificationInput] = useState('');

  useEffect(() => {
     if (pat && !adminVerification.isVerified) {
         setIsVerifying(true);
         verifyGithubToken(pat).then(res => {
             setAdminVerification(res);
             setIsVerifying(false);
         });
     }
  }, [pat, config.repoOwner, config.repoName]);

  const handleVerify = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsVerifying(true);
      const res = await verifyGithubToken(verificationInput);
      setAdminVerification(res);
      if (res.isVerified) {
          setPat(verificationInput);
      }
      setIsVerifying(false);
  };

  const handleLockAdmin = () => {
      setPat('');
      setAdminVerification({ isVerified: false });
      setVerificationInput('');
  };

  const handlePull = async () => {
    setIsPulling(true);
    try {
      await syncFromGithub();
    } finally {
      setIsPulling(false);
    }
  };

  const handleCommitData = async () => {
    setIsCommittingData(true);
    try {
      await saveDataToGithub(undefined, `Manual Data Sync - ${new Date().toLocaleString()}`);
    } finally {
      setIsCommittingData(false);
    }
  };

  const handleCommitConfig = async () => {
    setIsCommittingConfig(true);
    try {
      await saveConfigToGithub(undefined, `Manual Config Sync - ${new Date().toLocaleString()}`);
    } finally {
      setIsCommittingConfig(false);
    }
  };

  if (!adminVerification.isVerified) {
      return (
          <main className="max-w-md mx-auto px-4 mt-20 animate-fade-in">
              <div className="bg-white dark:bg-slate-900/90 backdrop-blur rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800 text-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <ShieldAlert className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Admin Verification</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                      Please enter a valid GitHub Personal Access Token with write/push permissions for 
                      <span className="font-semibold text-slate-700 dark:text-slate-300 mx-1">{config.repoOwner}/{config.repoName}</span>
                      to access the admin panel.
                  </p>
                  
                  <form onSubmit={handleVerify} className="space-y-4 text-left">
                      <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">GitHub PAT</label>
                          <input 
                              type="password"
                              value={verificationInput}
                              onChange={(e) => setVerificationInput(e.target.value)}
                              placeholder="ghp_..."
                              className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                              required
                          />
                      </div>
                      {adminVerification.error && (
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
                              {adminVerification.error}
                          </div>
                      )}
                      <button 
                          type="submit" 
                          disabled={isVerifying || !verificationInput}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] duration-150 flex justify-center items-center shadow-lg shadow-blue-500/20"
                      >
                          {isVerifying ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Unlock className="w-5 h-5 mr-2" />}
                          {isVerifying ? 'Verifying...' : 'Verify Access'}
                      </button>
                  </form>
              </div>
          </main>
      );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in relative">
        {/* Settings Button & Status - Top of the content area */}
        <div className="xl:col-span-3 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-400 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Admin {adminVerification.adminHandle ? `(@${adminVerification.adminHandle})` : ''}
            </div>
            
            <button 
                onClick={() => setShowSettings(true)}
                className="bg-white dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-900 transition-all hover:scale-105 active:scale-95 duration-150 shadow-sm flex items-center ml-auto"
            >
                <SettingsIcon className="w-4 h-4 mr-2" />
                Settings
            </button>
        </div>

        <div className="xl:col-span-2 space-y-8">
            <div className="bg-white dark:bg-slate-900/90 backdrop-blur rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-2 rounded-xl flex-shrink-0"><PlusCircle className="w-5 h-5"/></span> Transaction Entry
                </h2>
                
                <TransactionForms />
                <AdvancedTools />
            </div>

            <TransactionHistory />
        </div>

        <div className="space-y-8">
             <BalancesPanel />
             <div className="bg-white dark:bg-slate-900/90 backdrop-blur rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100">
                <h2 className="text-lg font-bold mb-2 flex items-center text-slate-800 dark:text-slate-100"><Github className="w-5 h-5 mr-2 text-slate-500 dark:text-slate-400"/> Deploy Changes</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Push your state and configuration to your GitHub repository.</p>
                 <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                        <button onClick={handleLockAdmin} className="flex-1 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/40 border border-amber-200 dark:border-amber-700/50 py-2 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-400 transition-all hover:scale-105 active:scale-95 duration-150 flex justify-center items-center">
                            <Lock className="w-3 h-3 mr-1" /> Lock Admin
                        </button>
                        <button onClick={handlePull} disabled={isPulling} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 duration-150 flex justify-center items-center shadow-sm">
                            {isPulling ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : null}
                            Pull Data
                        </button>
                    </div>
                    <button onClick={handleCommitData} disabled={isCommittingData} className="w-full bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 py-3 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] duration-150 shadow-lg shadow-blue-500/20 flex justify-center items-center">
                        {isCommittingData ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Commit & Push Data
                    </button>
                    <button onClick={handleCommitConfig} disabled={isCommittingConfig} className="w-full bg-slate-700 dark:bg-slate-800 hover:bg-slate-600 dark:hover:bg-slate-700 text-white disabled:opacity-50 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] duration-150 shadow border border-slate-600 dark:border-slate-700 flex justify-center items-center">
                        {isCommittingConfig ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <SettingsIcon className="w-4 h-4 mr-2"/>}
                        Commit Configuration
                    </button>
                    <button 
                        onClick={() => setShowResetModal(true)} 
                        className="w-full bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.99] duration-150 flex justify-center items-center gap-1.5 shadow-sm"
                    >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Reset Commit
                    </button>
                    <button 
                        onClick={() => {
                            if(window.confirm('Are you sure you want to clear your local storage and reload? Any unpushed changes will be lost.')) {
                                clearLocalData();
                            }
                        }} 
                        className="w-full bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.99] duration-150 flex justify-center items-center gap-1.5 shadow-sm"
                    >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        Clear Local Cache
                    </button>
                </div>
             </div>
        </div>

        {/* Reset Commit Modal */}
        <ResetCommitModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} />

        {/* Settings Modal */}
        {showSettings && document.body && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900 dark:bg-slate-950/60 backdrop-blur-sm animate-fade-in">
                <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                            <SettingsIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 mr-2" /> Configuration
                        </h3>
                        <button 
                            onClick={() => setShowSettings(false)}
                            className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                        <SettingsPanel />
                    </div>
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-right shrink-0">
                        <button 
                            onClick={() => setShowSettings(false)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-6 py-2 rounded-xl text-sm font-medium transition-all shadow-sm"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        , document.body)}
    </main>
  );
}


