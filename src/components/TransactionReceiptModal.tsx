import React, { useMemo } from 'react';
import { useAppStore } from '../store';
import defaultDataJson from '../../data.json';
import { Transaction } from '../types';
import { X, CheckCircle, SplitSquareVertical } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { calculatePersonRunningBalance } from '../lib/calculations';
import { cn } from '../lib/utils';

interface TransactionReceiptModalProps {
  transaction: Transaction | null;
  personId?: string | null;
  onClose: () => void;
}

export function TransactionReceiptModal({ transaction, personId, onClose }: TransactionReceiptModalProps) {
  const { config, data } = useAppStore();

  const allTxList = useMemo(() => {
    const existing = new Set(data.transactions.map(t => t.id));
    const missing = (defaultDataJson.transactions as Transaction[]).filter(t => !existing.has(t.id));
    return [...data.transactions, ...missing];
  }, [data.transactions]);

  if (!transaction) return null;

  const isCredit = transaction.type === 'credit';
  
  let personName = '';
  let billTypeName = '';
  let icon = '🧾';

  if (isCredit) {
    const person = config.people.find(p => p.id === transaction.whoOrBill);
    personName = person?.name || transaction.whoOrBill;
  } else {
    const bill = config.billTypes.find(b => b.id === transaction.whoOrBill);
    billTypeName = bill?.name || transaction.whoOrBill;
    if (transaction.whoOrBill === 'other' && transaction.note) billTypeName = transaction.note;
    icon = bill?.icon || '🧾';
  }

  // If this transaction is part of an expense group, try to find the other side
  if (transaction.parentId && transaction.parentId.includes('tx_exp')) {
      const otherTx = allTxList.find(t => t.parentId === transaction.parentId && t.id !== transaction.id);
      if (otherTx) {
          if (otherTx.type === 'credit') {
             const person = config.people.find(p => p.id === otherTx.whoOrBill);
             personName = person?.name || otherTx.whoOrBill;
          } else {
             const bill = config.billTypes.find(b => b.id === otherTx.whoOrBill);
             billTypeName = bill?.name || otherTx.whoOrBill;
             if (otherTx.whoOrBill === 'other' && otherTx.note) billTypeName = otherTx.note;
             icon = bill?.icon || '🧾';
          }
      }
  }

  // Calculate split amounts (we use the debit transaction to find splits)
  let splitAmong = transaction.splitAmong;
  if (!splitAmong && transaction.parentId && transaction.parentId.includes('tx_exp')) {
      const otherTx = allTxList.find(t => t.parentId === transaction.parentId && t.id !== transaction.id);
      if (otherTx && otherTx.splitAmong) {
          splitAmong = otherTx.splitAmong;
      }
  }

  const splitCount = splitAmong ? splitAmong.length : 0;
  const splitAmount = splitCount > 0 ? transaction.amount / splitCount : 0;

  // Target person for running balance (only set when personId is explicitly provided, e.g. from Profile page)
  const allIds = config.people.map(p => p.id);
  const targetPersonId = personId || null;

  const targetPerson = targetPersonId ? config.people.find(p => p.id === targetPersonId) : null;
  const targetPersonName = targetPerson?.name || targetPersonId;

  // Running balance calculation if targetPersonId is available
  let balanceBefore = 0;
  let balanceAfter = 0;
  let hasBalanceData = false;
  let personShare = 0;

  if (targetPersonId) {
      const balances = calculatePersonRunningBalance(allTxList, transaction.id, targetPersonId, allIds);
      balanceBefore = balances.balanceBefore;
      balanceAfter = balances.balanceAfter;
      hasBalanceData = true;

      if (transaction.type === 'credit' && transaction.whoOrBill === targetPersonId) {
          personShare = transaction.amount;
      } else if (transaction.type === 'debit') {
          const paying = splitAmong && splitAmong.length > 0 ? splitAmong : allIds.filter(p => !(transaction.exemptions || []).includes(p));
          if (paying.includes(targetPersonId)) {
              personShare = -(transaction.amount / paying.length);
          }
      }
  }

  return (
    <div className="fixed inset-0 bg-slate-900 dark:bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
        <div 
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md flex flex-col shadow-2xl max-h-[90vh] animate-slide-up" 
            onClick={e => e.stopPropagation()}
        >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800 shrink-0 rounded-t-3xl">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className={cn("w-6 h-6 rounded flex items-center justify-center text-sm shadow-sm", isCredit && !billTypeName ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700")}>
                        {isCredit && !billTypeName ? '💰' : icon}
                    </span>
                    Transaction Details
                </h3>
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                    <X className="w-4 h-4"/>
                </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                
                {personName && (
                    <div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Person (Paid By)</div>
                        <div className="font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl p-3">👤 {personName}</div>
                    </div>
                )}
                
                {billTypeName && (
                    <div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Bill Type</div>
                        <div className="font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl p-3">{icon} {billTypeName}</div>
                    </div>
                )}
                
                <div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                        {transaction.type === 'debit' ? 'Total Bill Amount' : 'Amount'}
                    </div>
                    <div className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center">
                        <span>{formatCurrency(transaction.amount, config.currency)}</span>
                        {transaction.type === 'debit' && personShare !== 0 && targetPersonName && (
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-700/60 px-2.5 py-1 rounded-lg">
                                {targetPersonName}'s Share: <strong className={personShare < 0 ? "text-rose-500" : "text-emerald-500"}>{formatCurrency(Math.abs(personShare), config.currency)}</strong>
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Date</div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatDate(transaction.date)}</div>
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Status</div>
                        <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Success</div>
                    </div>
                </div>

                {transaction.note && (
                    <div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Note</div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">{transaction.note}</div>
                    </div>
                )}

                {hasBalanceData && targetPersonName && (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                👤 {targetPersonName}'s Balance
                            </span>
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg ${personShare >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'}`}>
                                Change: {personShare >= 0 ? '+' : ''}{formatCurrency(personShare, config.currency)}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-1">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Balance Before</div>
                                <div className={`text-base font-bold ${balanceBefore >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                    {balanceBefore >= 0 ? '+' : ''}{formatCurrency(balanceBefore, config.currency)}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Balance After</div>
                                <div className={`text-base font-bold ${balanceAfter >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                    {balanceAfter >= 0 ? '+' : ''}{formatCurrency(balanceAfter, config.currency)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Transaction ID</div>
                    <div className="text-xs font-mono text-slate-400 dark:text-slate-500 break-all">{transaction.id}</div>
                </div>

                {splitCount > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 mt-6 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                            <SplitSquareVertical className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Split Details
                        </div>
                        <div className="space-y-2">
                            {splitAmong?.map(personId => {
                                const person = config.people.find(p => p.id === personId);
                                return (
                                    <div key={personId} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600 dark:text-slate-300 font-medium">{person?.name || personId}</span>
                                        <span className="text-slate-800 dark:text-slate-100 font-bold">{formatCurrency(splitAmount, config.currency)}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2 shrink-0 rounded-b-3xl">
                <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition shadow-md">
                    Close
                </button>
            </div>
        </div>
    </div>
  );
}
