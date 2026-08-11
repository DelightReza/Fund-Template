import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Config, AppData } from './types';
import defaultDataJson from '../data.json';
import defaultConfigJson from '../config.json';

import { formatJsonString } from './lib/utils';

interface StatusMessage {
  text: string;
  type: 'info' | 'success' | 'error' | 'processing';
}

export interface GitCommitInfo {
  sha: string;
  message: string;
  date: string;
  author: string;
  index: number;
}

interface AppContextType {
  config: Config;
  data: AppData;
  pat: string;
  updateConfig: (newConfig: Config, commitMessage?: string) => Promise<void>;
  updateData: (newData: AppData, commitMessage?: string) => Promise<void>;
  setPat: (token: string) => void;
  saveDataToGithub: (newData?: AppData, commitMessage?: string) => Promise<void>;
  saveConfigToGithub: (newConfig?: Config, commitMessage?: string) => Promise<void>;
  syncFromGithub: (token?: string, overrideConfig?: Config, silent?: boolean) => Promise<void>;
  fetchRecentCommits: () => Promise<GitCommitInfo[]>;
  resetGithubCommit: (targetSha: string, headOffset?: number) => Promise<boolean>;
  clearLocalData: () => void;
  verifyGithubToken: (token: string) => Promise<{isVerified: boolean, adminHandle?: string, error?: string}>;
  adminVerification: {isVerified: boolean, adminHandle?: string, error?: string};
  setAdminVerification: (status: {isVerified: boolean, adminHandle?: string, error?: string}) => void;
  statusMsg: StatusMessage | null;
  setStatusMsg: (msg: StatusMessage | null) => void;
  isLoading: boolean;
  isSyncing: boolean;
}

const getSafeConfig = (c: any): Config => ({
  siteTitle: c?.siteTitle || 'Fund',
  siteSubtitle: c?.siteSubtitle || 'Expenses Tracker',
  currency: c?.currency || '₹',
  repoOwner: c?.repoOwner || '',
  repoName: c?.repoName || '',
  repoBranch: c?.repoBranch || '',
  dataFileName: c?.dataFileName || 'data.json',
  people: Array.isArray(c?.people) ? c.people : [],
  billTypes: Array.isArray(c?.billTypes) ? c.billTypes : []
});

export const getSafeData = (d: any): AppData => ({
  people: d?.people || {},
  billTypes: d?.billTypes || {},
  transactions: Array.isArray(d?.transactions) ? d.transactions : []
});

const defaultConfig: Config = getSafeConfig(defaultConfigJson);
const defaultData: AppData = getSafeData(defaultDataJson);

const mergeWithDefaultData = (parsedData: AppData): AppData => {
  const existingIds = new Set(parsedData.transactions.map((t) => t.id));
  const missing = defaultData.transactions.filter((tx) => !existingIds.has(tx.id));
  if (missing.length === 0) return parsedData;

  const mergedTx = [...parsedData.transactions, ...missing];
  const updatedPeople = { ...parsedData.people };
  missing.forEach((tx) => {
    if (tx.type === 'credit' && tx.whoOrBill) {
      updatedPeople[tx.whoOrBill] = (updatedPeople[tx.whoOrBill] || 0) + tx.amount;
    }
  });

  return {
    ...parsedData,
    people: updatedPeople,
    transactions: mergedTx
  };
};

const getStorageKey = (key: string): string => {
  const owner = defaultConfig.repoOwner || 'unknown';
  const name = defaultConfig.repoName || 'unknown';
  return `fund_${owner}_${name}_${key}`;
};

const setStorageItem = (key: string, value: string): void => {
  if (key === 'pat' || key === 'pat_time') {
    sessionStorage.setItem(getStorageKey(key), value);
    // Remove from localStorage if it exists there from a previous session
    localStorage.removeItem(getStorageKey(key));
  } else {
    localStorage.setItem(getStorageKey(key), value);
  }
};

const removeStorageItem = (key: string): void => {
  if (key === 'pat' || key === 'pat_time') {
    sessionStorage.removeItem(getStorageKey(key));
  } else {
    localStorage.removeItem(getStorageKey(key));
  }
};

const getStorageItem = (key: string): string | null => {
  const namespacedKey = getStorageKey(key);
  
  if (key === 'pat' || key === 'pat_time') {
     const sessionValue = sessionStorage.getItem(namespacedKey);
     if (sessionValue !== null) return sessionValue;
     // Fallback to check localStorage for migration purposes, but don't keep it there
     const localValue = localStorage.getItem(namespacedKey);
     if (localValue !== null) {
         sessionStorage.setItem(namespacedKey, localValue);
         localStorage.removeItem(namespacedKey);
         return localValue;
     }
  } else {
      const value = localStorage.getItem(namespacedKey);
      if (value !== null) return value;
  }

  // Fallback and migration for legacy prefixes (mess_app_, kharcha_, un-namespaced fund_)
  const host = window.location.hostname.replace(/\./g, '_');
  const path = window.location.pathname.replace(/\//g, '_').replace(/_$/, '');

  const legacyKeys = [
    `fund_${host}${path}_${key}`,
    `mess_app_${host}${path}_${key}`,
    `kharcha_${host}${path}_${key}`
  ];

  if (!path) {
    legacyKeys.push(`fund_${key}`, `mess_app_${key}`, `kharcha_${key}`);
  }

  for (const legacyKey of legacyKeys) {
    const legacyValue = localStorage.getItem(legacyKey);
    if (legacyValue !== null) {
      if (key === 'pat' || key === 'pat_time') {
        sessionStorage.setItem(namespacedKey, legacyValue);
        localStorage.removeItem(legacyKey);
      } else {
        localStorage.setItem(namespacedKey, legacyValue);
      }
      return legacyValue;
    }
  }

  return null;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<Config>(defaultConfig);
  const [data, setDataState] = useState<AppData>(defaultData);
  const [pat, setPatState] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [adminVerification, setAdminVerification] = useState<{isVerified: boolean, adminHandle?: string, error?: string}>({ isVerified: false });
  const isSyncingRef = React.useRef(false);
  const dataShaRef = React.useRef<string | undefined>(undefined);
  const [configSha, setConfigSha] = useState<string | undefined>(undefined);

  const verifyGithubToken = async (token: string) => {
    if (!token) return { isVerified: false };
    if (!config.repoOwner || !config.repoName) {
        return { isVerified: false, error: "Repository not configured" };
    }
    
    try {
        const userRes = await fetch('https://api.github.com/user', {
            headers: { Authorization: `token ${token}` }
        });
        if (!userRes.ok) {
            return { isVerified: false, error: "Invalid token" };
        }
        const userData = await userRes.json();
        
        const repoRes = await fetch(`https://api.github.com/repos/${config.repoOwner}/${config.repoName}`, {
            headers: { Authorization: `token ${token}` }
        });
        
        if (!repoRes.ok) {
            return { isVerified: false, error: "Repository not found or access denied" };
        }
        
        const repoData = await repoRes.json();
        if (!repoData.permissions?.push && !repoData.permissions?.admin) {
            return { isVerified: false, error: "Token lacks write/push permissions for this repository" };
        }
        
        return { isVerified: true, adminHandle: userData.login };
    } catch (e) {
        return { isVerified: false, error: "Network error during verification" };
    }
  };

  useEffect(() => {
    // Load from local storage initially
    let validPat = null;
    let validConfig = { ...defaultConfig };

    // Auto-detect if on GitHub Pages
    const hostname = window.location.hostname;
    if (hostname.endsWith('.github.io')) {
      validConfig.repoOwner = hostname.split('.')[0];
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      validConfig.repoName = pathParts[0] || '';
    }

    let hasCachedData = false;
    try {
      const savedConfigStr = getStorageItem('config');
      if (savedConfigStr) {
        const parsed = JSON.parse(savedConfigStr);
        // Always extract repository credentials so we can perform the fetch on the home page too
        if (parsed.repoOwner) validConfig.repoOwner = parsed.repoOwner;
        if (parsed.repoName) validConfig.repoName = parsed.repoName;
        if (parsed.repoBranch) validConfig.repoBranch = parsed.repoBranch;
        if (parsed.dataFileName) validConfig.dataFileName = parsed.dataFileName;

        const loadedConfig = getSafeConfig(parsed);
        // Preserve the auto-detected repo owner if the parsed one is empty
        if (!loadedConfig.repoOwner && validConfig.repoOwner) {
          loadedConfig.repoOwner = validConfig.repoOwner;
          loadedConfig.repoName = validConfig.repoName;
        }
        validConfig = loadedConfig;
        setConfigState(validConfig);
        
        const savedData = getStorageItem('data');
        if (savedData) {
          setDataState(mergeWithDefaultData(getSafeData(JSON.parse(savedData))));
          hasCachedData = true;
        }
      }
      
      const savedPat = getStorageItem('pat');
      const savedPatTime = getStorageItem('pat_time');
      if (savedPat && savedPatTime) {
        const timeDiff = Date.now() - parseInt(savedPatTime);
        if (timeDiff < 30 * 24 * 60 * 60 * 1000) { // 30 days
          setPatState(savedPat);
          validPat = savedPat;
        } else {
          removeStorageItem('pat');
          removeStorageItem('pat_time');
        }
      }
    } catch(e) {
        console.error(e)
    }
    
    const loadData = async () => {
      // If we don't have cached data (i.e. on home page or clear cache), show loader
      if (!hasCachedData) {
        setIsLoading(true);
      } else {
        setIsLoading(false);
      }

      try {
        await syncFromGithub(validPat || undefined, validConfig, true);
      } catch (err) {
        console.error("Initial load error", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateConfig = async (newConfig: Config, commitMessage?: string) => {
    setConfigState(newConfig);
    setStorageItem('config', formatJsonString(newConfig));
    await saveConfigToGithub(newConfig, commitMessage);
  };

  const updateData = async (newData: AppData, commitMessage?: string) => {
    setDataState(newData);
    setStorageItem('data', formatJsonString(newData));
    await saveDataToGithub(newData, commitMessage);
  };

  const setPat = (token: string) => {
    setPatState(token);
    if (!token) {
        removeStorageItem('pat');
        removeStorageItem('pat_time');
    } else {
        setStorageItem('pat', token);
        setStorageItem('pat_time', Date.now().toString());
    }
  };

  const showStatus = (text: string, type: 'info' | 'success' | 'error' | 'processing') => {
    setStatusMsg({ text, type });
    if (type !== 'processing') {
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const saveQueueRef = React.useRef<Promise<void>>(Promise.resolve());
  const configSaveQueueRef = React.useRef<Promise<void>>(Promise.resolve());

  const saveDataToGithub = async (newData?: AppData, commitMessage?: string) => {
    if (!pat) {
      if (!newData) showStatus('❌ Please set your PAT first', 'error');
      return;
    }
    const dataToSave = newData || data;
    
    // Queue the save operation to avoid concurrent 409 conflicts
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      showStatus('🔄 Committing Data to GitHub...', 'processing');
      try {
        const url = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/${config.dataFileName}`;
        let sha = dataShaRef.current;
        if (!sha) {
            try {
              const getRes = await fetch(url, { headers: { Authorization: `token ${pat}` }, cache: 'no-store' });
              if (getRes.ok) {
                const resData = await getRes.json();
                sha = resData.sha;
              }
            } catch (e) {}
        }

        const content = btoa(unescape(encodeURIComponent(formatJsonString(dataToSave))));
        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            Authorization: `token ${pat}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: commitMessage || `Update fund data - ${new Date().toLocaleString()}`,
            content,
            sha
          })
        });

        if (!res.ok) {
            if (res.status === 409 || res.status === 422) {
                dataShaRef.current = undefined;
            }
            throw new Error("Failed to commit");
        }
        
        const resData = await res.json();
        if (resData.content && resData.content.sha) {
            dataShaRef.current = resData.content.sha;
        }
        showStatus('✅ Data committed securely!', 'success');
      } catch (e) {
        showStatus('❌ Commit failed', 'error');
      }
    }).catch(() => {});
    
    return saveQueueRef.current;
  };

  const saveConfigToGithub = async (newConfig?: Config, commitMessage?: string) => {
      if (!pat) {
      // Don't show error if it's auto-save
      if (!newConfig) showStatus('❌ Please set your PAT first', 'error');
      return;
    }
    const configToSave = newConfig || config;

    configSaveQueueRef.current = configSaveQueueRef.current.then(async () => {
      showStatus('🔄 Saving Config to GitHub...', 'processing');
      try {
        const url = `https://api.github.com/repos/${configToSave.repoOwner}/${configToSave.repoName}/contents/config.json`;
        let sha = configSha;
        if (!sha) {
            try {
              const getRes = await fetch(url, { headers: { Authorization: `token ${pat}` }, cache: 'no-store' });
              if (getRes.ok) {
                const resData = await getRes.json();
                sha = resData.sha;
              }
            } catch (e) {}
        }

        const content = btoa(unescape(encodeURIComponent(formatJsonString(configToSave))));
        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            Authorization: `token ${pat}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: commitMessage || `Update config - ${new Date().toLocaleString()}`,
            content,
            sha
          })
        });

        if (!res.ok) {
            if (res.status === 409 || res.status === 422) {
                setConfigSha(undefined);
            }
            throw new Error("Failed to commit");
        }
        
        const resData = await res.json();
        if (resData.content && resData.content.sha) {
            setConfigSha(resData.content.sha);
        }
        showStatus('✅ Config updated remotely', 'success');
      } catch (e) {
        showStatus('❌ Commit failed', 'error');
      }
    }).catch(() => {});

    return configSaveQueueRef.current;
  };

  const syncFromGithub = async (token?: string, overrideConfig?: Config, silent: boolean = false) => {
    if (isSyncingRef.current) return;
    
    const activePat = token || pat;
    const currentConfig = overrideConfig || config;

    if (!silent) showStatus('🔄 Syncing data...', 'processing');
    setIsSyncing(true);
    isSyncingRef.current = true;
    try {
      const timestamp = Date.now();
      let fetchedDataObj: AppData | null = null;
      let fetchedConfigObj: Config | null = null;

      // 1. Try GitHub API if repo is configured
      if (currentConfig.repoOwner && currentConfig.repoName) {
        try {
          const dataFileName = currentConfig.dataFileName || 'data.json';
          const dataUrl = `https://api.github.com/repos/${currentConfig.repoOwner}/${currentConfig.repoName}/contents/${dataFileName}?t=${timestamp}`;
          const configUrl = `https://api.github.com/repos/${currentConfig.repoOwner}/${currentConfig.repoName}/contents/config.json?t=${timestamp}`;
          
          const headers: HeadersInit = { Accept: 'application/vnd.github.v3.raw' };
          if (activePat) {
            headers['Authorization'] = `token ${activePat}`;
          }

          const [dataRes, configRes] = await Promise.all([
            fetch(dataUrl, { headers, cache: 'no-store' }),
            fetch(configUrl, { headers, cache: 'no-store' })
          ]);

          if (dataRes.ok) {
            fetchedDataObj = getSafeData(await dataRes.json());
          }
          if (configRes.ok) {
            fetchedConfigObj = getSafeConfig(await configRes.json());
          }
        } catch (e) {
          console.warn("GitHub API sync failed, falling back to local files", e);
        }
      }

      // 2. Fall back to fetching deployed data.json and config.json directly with cache-busting
      if (!fetchedDataObj) {
        try {
          const localDataRes = await fetch(`./data.json?t=${timestamp}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
          });
          if (localDataRes.ok) {
            fetchedDataObj = getSafeData(await localDataRes.json());
          }
        } catch (e) {
          console.warn("Failed to fetch local data.json", e);
        }
      }

      if (!fetchedConfigObj) {
        try {
          const localConfigRes = await fetch(`./config.json?t=${timestamp}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
          });
          if (localConfigRes.ok) {
            fetchedConfigObj = getSafeConfig(await localConfigRes.json());
          }
        } catch (e) {
          console.warn("Failed to fetch local config.json", e);
        }
      }

      let updated = false;

      if (fetchedDataObj) {
        setDataState(fetchedDataObj);
        setStorageItem('data', formatJsonString(fetchedDataObj));
        dataShaRef.current = undefined;
        updated = true;
      }
      
      if (fetchedConfigObj) {
        setConfigState(fetchedConfigObj);
        setStorageItem('config', formatJsonString(fetchedConfigObj));
        setConfigSha(undefined);
        updated = true;
      }

      if (updated) {
        if (!silent) showStatus('✅ Synced latest data', 'success');
      } else {
        if (!silent) showStatus('❌ Failed to pull data', 'error');
      }
    } catch (error) {
       console.error("Sync error", error);
       if (!silent) showStatus('❌ Failed to pull data', 'error');
    } finally {
       setIsSyncing(false);
       isSyncingRef.current = false;
    }
  };

  const fetchRecentCommits = async (): Promise<GitCommitInfo[]> => {
    if (!config.repoOwner || !config.repoName) {
      showStatus('❌ Repository not configured', 'error');
      return [];
    }
    try {
      const branch = config.repoBranch || 'main';
      const headers: HeadersInit = { Accept: 'application/vnd.github.v3+json' };
      if (pat) headers['Authorization'] = `token ${pat}`;

      const res = await fetch(`https://api.github.com/repos/${config.repoOwner}/${config.repoName}/commits?sha=${encodeURIComponent(branch)}&per_page=15`, {
        headers,
        cache: 'no-store'
      });

      let commitsData = null;
      if (res.ok) {
        commitsData = await res.json();
      } else if (res.status === 404) {
        // Fallback: search without sha param in case branch name isn't 'main'
        const fallbackRes = await fetch(`https://api.github.com/repos/${config.repoOwner}/${config.repoName}/commits?per_page=15`, {
          headers,
          cache: 'no-store'
        });
        if (fallbackRes.ok) {
          commitsData = await fallbackRes.json();
        }
      }

      if (!commitsData || !Array.isArray(commitsData)) {
        throw new Error('Could not fetch commit list');
      }

      return commitsData.map((item: any, idx: number) => ({
        sha: item.sha,
        message: item.commit?.message || '',
        date: item.commit?.author?.date || '',
        author: item.commit?.author?.name || item.author?.login || 'Unknown',
        index: idx
      }));
    } catch (e: any) {
      console.error('Failed to fetch commits:', e);
      showStatus('❌ Failed to fetch commit history from GitHub', 'error');
      return [];
    }
  };

  const resetGithubCommit = async (targetSha: string, headOffset?: number): Promise<boolean> => {
    if (!pat) {
      showStatus('❌ Please set your GitHub Personal Access Token first', 'error');
      return false;
    }
    if (!config.repoOwner || !config.repoName) {
      showStatus('❌ Repository not configured', 'error');
      return false;
    }

    const branch = config.repoBranch || 'main';
    const offsetText = headOffset !== undefined ? ` (Last ${headOffset})` : '';
    showStatus(`🔄 Resetting branch ${branch} to ${targetSha.slice(0, 7)}${offsetText}...`, 'processing');

    try {
      const refUrl = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/git/refs/heads/${encodeURIComponent(branch)}`;
      const res = await fetch(refUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `token ${pat}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          sha: targetSha,
          force: true
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.message || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      dataShaRef.current = undefined;
      setConfigSha(undefined);

      showStatus(`✅ Branch reset to ${targetSha.slice(0, 7)}${offsetText}! Reloading state...`, 'success');
      await syncFromGithub(pat, config, false);
      return true;
    } catch (e: any) {
      console.error('Reset commit error:', e);
      showStatus(`❌ Reset failed: ${e.message || 'Unknown error'}`, 'error');
      return false;
    }
  };

  const clearLocalData = () => {
    removeStorageItem('config');
    removeStorageItem('data');
    removeStorageItem('pat');
    window.location.reload();
  };

  return (
    <AppContext.Provider value={{ config, data, pat, updateConfig, updateData, setPat, saveDataToGithub, saveConfigToGithub, syncFromGithub, fetchRecentCommits, resetGithubCommit, clearLocalData, verifyGithubToken, adminVerification, setAdminVerification, statusMsg, setStatusMsg, isLoading, isSyncing }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
}
