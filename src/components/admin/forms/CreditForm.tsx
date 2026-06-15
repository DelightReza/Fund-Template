import React, { useState } from 'react';
import { useAppStore } from '../../../store';
import { generateTransactionId, getLocalNow, localToUTC } from '../../../lib/utils';
import { ArrowDown, Loader2, X } from 'lucide-react';
import { Transaction, CreditFormData } from '../../../types';
import { createPortal } from 'react-dom';

export function CreditForm({ allPeople }: { allPeople: any[] }) {
  const { config, data, updateData } = useAppStore();
  
  const [creditForm, setCreditForm] = useState<CreditFormData>({ person: allPeople[0]?.id || '', amount: '', note: '', customDate: false, date: '', time: '' });
  const [loadingAction, setLoadingAction] = useState(false);
  const [confirmTx, setConfirmTx] = useState<CreditFormData | null>(null);

  const executeAddCredit = async (formData: CreditFormData) => {
    setLoadingAction(true);
    let transactionDate = getLocalNow();
    if (formData.customDate && formData.date) {
        transactionDate = localToUTC(formData.date, formData.time);
    }
    
    const tx: Transaction = {
      id: generateTransactionId(),
      type: 'credit',
      whoOrBill: formData.person,
      amount: parseFloat(formData.amount),
      note: formData.note,
      date: transactionDate,
    };
    
    const newData = { ...data, transactions: [tx, ...data.transactions] };
    newData.people[tx.whoOrBill] = (newData.people[tx.whoOrBill] || 0) + tx.amount;
    
    const personName = config.people.find(p => p.id === formData.person)?.name || formData.person;
    await updateData(newData, `Credit: ${personName} added ${config.currency}${formData.amount}${formData.note ? ` for ${formData.note}` : ''}`);
    setLoadingAction(false);
    setCreditForm({ person: allPeople[0]?.id || '', amount: '', note: '', customDate: false, date: '', time: '' });
    setConfirmTx(null);
  };

  const handleAddCredit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditForm.amount || !creditForm.person) return;
    setConfirmTx(creditForm);
  };

  return (
    <>
      <form onSubmit={handleAddCredit} className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-5">
          <h3 className="font-bold text-emerald-800 dark:text-emerald-200 mb-4 flex items-center uppercase tracking-wide"><ArrowDown className="w-4 h-4 mr-2"/> Add Credit</h3>
          <div className="space-y-3">
              <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Person</label>
                  <select className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-emerald-200 dark:border-emerald-700 rounded-xl p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" value={creditForm.person} onChange={e => setCreditForm({...creditForm, person: e.target.value})}>
                      <option value="" disabled>Select</option>
                      {allPeople.map(p => <option key={p.id} value={p.id} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">👤 {p.name}{p.active ? '' : ' (Inactive)'}</option>)}
                  </select>
              </div>
              <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Amount ({config.currency})</label>
                  <input type="number" min="0.01" step="0.01" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-emerald-200 dark:border-emerald-700 rounded-xl p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" required value={creditForm.amount} onChange={e => setCreditForm({...creditForm, amount: e.target.value})}/>
              </div>
              <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Note</label>
                  <input type="text" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-emerald-200 dark:border-emerald-700 rounded-xl p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" value={creditForm.note} onChange={e => setCreditForm({...creditForm, note: e.target.value})}/>
              </div>
              <div className="pt-2 border-t border-emerald-100 dark:border-emerald-800/50">
                  <label className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <input type="checkbox" checked={creditForm.customDate} onChange={e => setCreditForm({...creditForm, customDate: e.target.checked})} className="mr-2 rounded text-emerald-600 dark:text-emerald-400 focus:ring-emerald-500"/>
                      Custom date
                  </label>
                  {creditForm.customDate && (
                      <div className="grid grid-cols-2 gap-2">
                          <input type="date" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-emerald-200 dark:border-emerald-700 rounded-lg p-2 text-xs" required value={creditForm.date} onChange={e => setCreditForm({...creditForm, date: e.target.value})}/>
                          <input type="time" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-emerald-200 dark:border-emerald-700 rounded-lg p-2 text-xs" value={creditForm.time} onChange={e => setCreditForm({...creditForm, time: e.target.value})}/>
                      </div>
                  )}
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-medium shadow-md shadow-emerald-500/20 mt-2 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center">
                  Record Credit
              </button>
          </div>
      </form>

      {confirmTx && document.body && createPortal(
          <div className="fixed inset-0 bg-slate-900 dark:bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100">Confirm Credit</h3>
                      <button onClick={() => setConfirmTx(null)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="p-6">
                      <div className="space-y-4 mb-6">
                          <div>
                              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Person</div>
                              <div className="font-medium text-slate-800 dark:text-slate-100">👤 {config.people.find(p => p.id === confirmTx.person)?.name}</div>
                          </div>
                          <div>
                              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Amount</div>
                              <div className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">{config.currency}{parseFloat(confirmTx.amount).toFixed(2)}</div>
                          </div>
                          {confirmTx.note && (
                              <div>
                                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Note</div>
                                  <div className="text-sm text-slate-600 dark:text-slate-300">{confirmTx.note}</div>
                              </div>
                          )}
                      </div>
                      
                      <div className="flex space-x-3">
                          <button onClick={() => setConfirmTx(null)} disabled={loadingAction} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">Cancel</button>
                          <button 
                              onClick={() => executeAddCredit(confirmTx)}
                              disabled={loadingAction} 
                              className="flex-1 px-4 py-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-medium hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-lg shadow-slate-900/20 flex items-center justify-center disabled:opacity-50">
                              {loadingAction ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                              Confirm
                          </button>
                      </div>
                  </div>
              </div>
          </div>,
          document.body
      )}
    </>
  );
}
