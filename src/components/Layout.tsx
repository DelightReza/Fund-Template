import React from 'react';
import { Outlet, Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import defaultDataJson from '../../data.json';
import { Landmark, ArrowLeft, Heart, RefreshCw, Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils';
import { TransactionReceiptModal } from './TransactionReceiptModal';
import { useTheme } from '../hooks/useTheme';

export function Layout() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const txId = searchParams.get('tx');
  const isAdmin = location.pathname.startsWith('/admin');
  
  const { config, data, statusMsg, isSyncing, syncFromGithub, pat, isLoading } = useAppStore();
  const { theme, toggleTheme } = useTheme();

  const selectedTx = txId ? (data.transactions.find(t => t.id === txId) || (defaultDataJson.transactions as any[]).find(t => t.id === txId) || null) : null;
  const personId = searchParams.get('person');

  const closeTxModal = () => {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('tx');
      newParams.delete('person');
      navigate({ search: newParams.toString() }, { replace: true });
  };

  // Long press handling on Header Icon to go to Admin Panel
  const longPressTimerRef = React.useRef<any>(null);
  const isLongPressRef = React.useRef(false);

  const startLongPress = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      navigate('/admin');
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(50);
        } catch (e) {}
      }
    }, 600); // 600ms hold
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressRef.current = false;
    }
  };

  React.useEffect(() => {
    document.title = config.siteTitle || 'Fund';
  }, [config.siteTitle]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/50 selection:text-blue-900 dark:selection:text-blue-100">
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 mb-8 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              onClick={handleLinkClick}
              onMouseDown={startLongPress}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={startLongPress}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              title="Long press to open Admin Panel"
              className="text-white bg-slate-900 dark:bg-slate-800 w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20 transition-transform hover:scale-105 active:scale-95"
            >
              <Landmark className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-xl leading-tight tracking-tight text-slate-900 dark:text-slate-50">{config.siteTitle}</h1>
                  {pat && (
                      <button onClick={() => syncFromGithub(undefined, undefined, true)} disabled={isSyncing} className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Sync data">
                          <RefreshCw className={cn("w-4 h-4", isSyncing ? "animate-spin text-slate-900 dark:text-slate-50" : "")} />
                      </button>
                  )}
                  <button 
                      onClick={toggleTheme} 
                      className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 ml-1"
                      title="Toggle Theme"
                  >
                      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase mt-0.5">{config.siteSubtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isAdmin && (
               <Link to="/" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Public View
               </Link>
            )}
          </div>
        </div>
      </nav>
      
      {/* Toast Notification */}
      {statusMsg && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50">
            <div className={cn("px-6 py-3 rounded-2xl shadow-xl flex items-center font-bold text-sm animate-slide-up border transition-colors", 
                statusMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700' :
                statusMsg.type === 'error' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-700' :
                statusMsg.type === 'processing' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700' :
                'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700'
            )}>
               {statusMsg.text}
            </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 px-4">
          <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100 rounded-full animate-spin mb-6" />
          <p className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-widest uppercase animate-pulse">Loading Live Data</p>
        </div>
      ) : (
        <Outlet />
      )}
      
      {selectedTx && <TransactionReceiptModal transaction={selectedTx} personId={personId} onClose={closeTxModal} />}
    </div>
  );
}
