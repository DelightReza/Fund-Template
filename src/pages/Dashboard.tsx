import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { calculateTotals, calculatePersonalFinance, sortTransactions } from '../lib/calculations';
import { formatCurrency, formatDate } from '../lib/utils';
import { ArrowDown, Flame, Landmark, Search, Filter } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { config, data } = useAppStore();
  const navigate = useNavigate();
  
  const homeData = data;
  const { totalCredits, totalDebits, balance } = useMemo(() => calculateTotals(homeData), [homeData]);
  const activePeopleIds = config.people.filter(p => p.active).map(p => p.id);
  const personalFinance = useMemo(() => calculatePersonalFinance(homeData, activePeopleIds), [homeData, activePeopleIds]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredTransactions = useMemo(() => {
     const sorted = sortTransactions(homeData.transactions, 'desc');
     return sorted.filter(tx => {
         if (searchQuery) {
             const lowerQuery = searchQuery.toLowerCase();
             let name = tx.whoOrBill;
             if (tx.type === 'credit') name = config.people.find(p => p.id === tx.whoOrBill)?.name || tx.whoOrBill;
             else if (tx.type === 'debit') name = config.billTypes.find(b => b.id === tx.whoOrBill)?.name || tx.whoOrBill;
             
             const matchesNote = tx.note?.toLowerCase().includes(lowerQuery);
             const matchesName = name.toLowerCase().includes(lowerQuery);
             const matchesAmount = tx.amount.toString().includes(lowerQuery);
             
             if (!matchesNote && !matchesName && !matchesAmount) return false;
         }

         if (filterCategory !== 'all') {
             if (filterCategory === 'credit' && tx.type !== 'credit') return false;
             if (filterCategory === 'debit' && tx.type !== 'debit') return false;
             if (filterCategory.startsWith('person_') && (tx.type !== 'credit' || tx.whoOrBill !== filterCategory.replace('person_', ''))) return false;
             if (filterCategory.startsWith('bill_') && (tx.type !== 'debit' || tx.whoOrBill !== filterCategory.replace('bill_', ''))) return false;
         }

         if (dateFrom && new Date(tx.date) < new Date(dateFrom)) return false;
         if (dateTo) {
             const to = new Date(dateTo);
             to.setHours(23, 59, 59, 999);
             if (new Date(tx.date) > to) return false;
         }

         return true;
     });
  }, [homeData.transactions, searchQuery, filterCategory, dateFrom, dateTo, config]);

  return (
    <main className="max-w-6xl mx-auto px-4 flex flex-col gap-10 animate-fade-in pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 dark:bg-slate-950 p-8 text-white shadow-xl shadow-slate-900/10">
                <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mb-2 relative z-10 uppercase tracking-wide">Current Balance</p>
                <h2 className="text-5xl font-bold tracking-tight relative z-10">{formatCurrency(balance, config.currency)}</h2>
                <Landmark className="absolute -right-6 -bottom-6 w-40 h-40 text-white/5 pointer-events-none" />
            </div>
            <div className="relative overflow-hidden rounded-3xl bg-emerald-50 dark:bg-emerald-900/30 p-8 shadow-sm border border-emerald-100 dark:border-emerald-800">
                <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-2 relative z-10 uppercase tracking-wide">Total Collected</p>
                <h2 className="text-4xl font-bold tracking-tight text-emerald-900 dark:text-emerald-100 relative z-10">{formatCurrency(totalCredits, config.currency)}</h2>
                <ArrowDown className="absolute -right-4 -bottom-4 w-32 h-32 text-emerald-200/50 pointer-events-none" />
            </div>
            <div className="relative overflow-hidden rounded-3xl bg-rose-50 dark:bg-rose-900/30 p-8 shadow-sm border border-rose-100 dark:border-rose-800">
                <p className="text-rose-600 dark:text-rose-400 text-sm font-medium mb-2 relative z-10 uppercase tracking-wide">Total Spent</p>
                <h2 className="text-4xl font-bold tracking-tight text-rose-900 dark:text-rose-100 relative z-10">{formatCurrency(totalDebits, config.currency)}</h2>
                <Flame className="absolute -right-4 -bottom-4 w-32 h-32 text-rose-200/50 pointer-events-none" />
            </div>
        </div>

        <section>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-6 px-1">Member Balances</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(Object.entries(personalFinance) as [string, { credits: number; debits: number; netBalance: number }][]).map(([id, fin]) => {
                     const person = config.people.find(p => p.id === id);
                     if(!person) return null;
                     const isPos = fin.netBalance >= 0;
                     return (
                        <Link to={`/profile/${id}`} key={id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer group flex flex-col justify-between">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${isPos ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-200' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 group-hover:bg-rose-200'}`}>
                                        {person.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{person.name}</h4>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">Given: {formatCurrency(fin.credits, config.currency)}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Net Balance</div>
                                <div className={`font-black text-2xl tracking-tight ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                    {formatCurrency(fin.netBalance, config.currency)}
                                </div>
                            </div>
                        </Link>
                     )
                })}
            </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest px-1">Transactions</h3>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-xl transition-colors ${showFilters ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        title="Toggle Filters"
                    >
                        <span className="text-lg leading-none flex items-center justify-center">ᯤ</span>
                    </button>
                </div>
                {showFilters && (
                    <div className="flex flex-col md:flex-row gap-3 mt-4 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <input 
                                type="text" 
                                placeholder="Search by notes, names, or amounts..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                            />
                        </div>
                        <div className="relative min-w-[200px]">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <select 
                                value={filterCategory}
                                onChange={e => setFilterCategory(e.target.value)}
                                className="w-full pl-11 pr-8 py-3 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer shadow-sm"
                                style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em'}}
                            >
                                <option value="all">All Categories</option>
                                <optgroup label="Type">
                                    <option value="credit">Income Only</option>
                                    <option value="debit">Expenses Only</option>
                                </optgroup>
                                <optgroup label="People">
                                    {config.people.map(p => <option key={p.id} value={`person_${p.id}`}>{p.name}</option>)}
                                </optgroup>
                                <optgroup label="Expenses">
                                    {config.billTypes.map(b => <option key={b.id} value={`bill_${b.id}`}>{b.name}</option>)}
                                </optgroup>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-600 dark:text-slate-300 shadow-sm" title="Start date"/>
                            <span className="text-slate-400 px-1 shrink-0">→</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-600 dark:text-slate-300 shadow-sm" title="End date"/>
                        </div>
                    </div>
                )}
            </div>
            <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-sm text-left">
                   <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/60">
                       {filteredTransactions.map(tx => {
                           const isCredit = tx.type === 'credit';
                           let displayName = tx.whoOrBill;
                           if(isCredit) displayName = config.people.find(p => p.id === tx.whoOrBill)?.name || tx.whoOrBill;
                           else displayName = config.billTypes.find(b => b.id === tx.whoOrBill)?.name || tx.whoOrBill;

                           return (
                               <tr key={tx.id} onClick={() => navigate({ search: `?tx=${tx.id}` })} className="group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                                    <td className="p-5 pl-6 w-20">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95 ${isCredit ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'}`}>
                                            <ArrowDown className={`w-5 h-5 ${!isCredit && '-rotate-180'}`}/>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="font-bold text-slate-800 dark:text-slate-100 text-base">{displayName}</div>
                                        <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">{formatDate(tx.date).split(' ')[0]}</div>
                                    </td>
                                    <td className="p-5 text-sm text-slate-500 dark:text-slate-400 hidden md:table-cell w-1/2">
                                        <div className="max-w-[400px] truncate">{tx.note || '-'}</div>
                                    </td>
                                    <td className="p-5 pr-8 text-right">
                                        <span className={`font-black tracking-tight text-lg ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                            {isCredit ? (tx.amount >= 0 ? '+' : '-') : '-'}{formatCurrency(Math.abs(tx.amount), config.currency)}
                                        </span>
                                    </td>
                               </tr>
                           )
                       })}
                       {filteredTransactions.length === 0 && (
                           <tr>
                               <td colSpan={4} className="p-16 text-center text-slate-400 dark:text-slate-500">
                                   <div className="flex flex-col items-center justify-center">
                                       <Search className="w-12 h-12 mb-4 text-slate-200" />
                                       <p className="font-medium text-slate-500 dark:text-slate-400">No transactions found</p>
                                       <p className="text-xs mt-1">Try adjusting your search or filters.</p>
                                   </div>
                               </td>
                           </tr>
                       )}
                   </tbody>
                </table>
            </div>
        </section>
    </main>
  );
}

