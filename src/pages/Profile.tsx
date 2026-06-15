import React, { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { calculatePersonalFinance, sortTransactions } from '../lib/calculations';
import { formatCurrency, formatDate } from '../lib/utils';
import { ArrowLeft, ArrowDown, ArrowUp } from 'lucide-react';
import { Transaction } from '../types';

export function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { config, data } = useAppStore();
  
  const person = config.people.find(p => p.id === id) || { id: id || '', name: id || '', active: false };
  const allIds = config.people.map(p => p.id);
  const fin = useMemo(() => calculatePersonalFinance(data, allIds)[id || ''] || { credits: 0, debits: 0, netBalance: 0 }, [data, id, allIds]);

  const personTxs = useMemo(() => {
    const raw = data.transactions.map(tx => {
      if (tx.type === 'credit' && tx.whoOrBill === id) {
        return { ...tx, displayAmount: tx.amount, displayType: 'Credit', sign: '+', change: tx.amount };
      }
      if (tx.type === 'debit') {
        const paying = tx.splitAmong && tx.splitAmong.length > 0 ? tx.splitAmong : allIds.filter(p => !(tx.exemptions || []).includes(p));
        if (paying.includes(id || '')) {
          const share = tx.amount / paying.length;
          return { ...tx, displayAmount: share, displayType: 'Debit Share', sign: '-', change: -share };
        }
      }
      return null;
    }).filter(Boolean) as (Transaction & { displayAmount: number, displayType: string, sign: string, change: number, runningBalance?: number })[];

    // Calculate running balance in chronological order (oldest first)
    const chronological = sortTransactions(data.transactions, 'asc');

    let running = 0;
    const balanceMap = new Map<string, number>();
    chronological.forEach(tx => {
      let change = 0;
      if (tx.type === 'credit' && tx.whoOrBill === id) {
        change += tx.amount;
      } else if (tx.type === 'debit') {
        const paying = tx.splitAmong && tx.splitAmong.length > 0 ? tx.splitAmong : allIds.filter(p => !(tx.exemptions || []).includes(p));
        if (paying.includes(id || '')) {
          change -= (tx.amount / paying.length);
        }
      }
      running += change;
      balanceMap.set(tx.id, running);
    });

    const sortedRaw = sortTransactions(raw, 'desc');

    return sortedRaw.map(tx => ({
      ...tx,
      runningBalance: balanceMap.get(tx.id) ?? 0
    }));
  }, [data.transactions, id, allIds]);

  const isPos = fin.netBalance >= 0;

  return (
    <main className="max-w-5xl mx-auto px-4 flex flex-col gap-8 animate-fade-in">
       <div className="bg-white dark:bg-slate-900/90 backdrop-blur rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${isPos ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'}`}>
                  {person.name.charAt(0).toUpperCase()}
              </div>
              <div>
                  <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{person.name}</h1>
                  <p className="text-slate-500 dark:text-slate-400">Personal Finance Profile</p>
              </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Credits (Given)</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(fin.credits, config.currency)}</div>
              </div>
              <div className="bg-rose-50 dark:bg-rose-900/30 rounded-xl p-4 border border-rose-100 dark:border-rose-800">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Debits (Spent)</div>
                  <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(fin.debits, config.currency)}</div>
              </div>
              <div className={`bg-white dark:bg-slate-900 rounded-xl p-4 border shadow-sm ${isPos ? 'border-emerald-200 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400' : 'border-rose-200 dark:border-rose-700 text-rose-600 dark:text-rose-400'}`}>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Net Balance</div>
                  <div className="text-2xl font-bold">{isPos ? '+' : ''}{formatCurrency(fin.netBalance, config.currency)}</div>
              </div>
          </div>
       </div>

       <div className="bg-white dark:bg-slate-900/90 backdrop-blur rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
           <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">History</h2>
           </div>
           <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {personTxs.map(tx => {
                          const isCredit = tx.displayType === 'Credit';
                          const displayName = config.billTypes.find(b => b.id === tx.whoOrBill)?.name || tx.whoOrBill;
                          return (
                              <tr key={tx.id} onClick={() => navigate({ search: `?tx=${tx.id}&person=${id}` })} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer active:bg-slate-100 dark:bg-slate-800/50">
                                  <td className="p-4 pl-6 w-16">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCredit ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                                          {isCredit ? <ArrowDown className="w-4 h-4"/> : <ArrowUp className="w-4 h-4" />}
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      <div className="font-bold text-slate-700 dark:text-slate-200">{isCredit ? 'Credit' : displayName}</div>
                                      <div className="text-xs text-slate-400 dark:text-slate-500">{formatDate(tx.date)}</div>
                                  </td>
                                  <td className="p-4 pr-6 text-right">
                                      <div className={`font-bold ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                          {tx.sign === '+' && tx.displayAmount < 0 ? '-' : tx.sign}{formatCurrency(Math.abs(tx.displayAmount), config.currency)}
                                      </div>
                                      <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide flex items-center justify-end gap-1.5">
                                          <span>{tx.displayType}</span>
                                          <span>•</span>
                                          <span className={tx.runningBalance >= 0 ? "text-emerald-600/90 dark:text-emerald-400/90 font-medium" : "text-rose-500/90 font-medium"}>
                                            Bal: {tx.runningBalance >= 0 ? '+' : ''}{formatCurrency(tx.runningBalance, config.currency)}
                                          </span>
                                      </div>
                                  </td>
                              </tr>
                          )
                      })}
                      {personTxs.length === 0 && (
                          <tr><td colSpan={3} className="p-8 text-center text-slate-500 dark:text-slate-400">No transactions found</td></tr>
                      )}
                  </tbody>
               </table>
           </div>
       </div>
    </main>
  );
}
