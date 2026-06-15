import React, { useState } from 'react';
import { useAppStore } from '../../../store';
import { generateTransactionId, getLocalNow, localToUTC } from '../../../lib/utils';
import { ArrowUp, Loader2, X } from 'lucide-react';
import { Transaction, DebitFormData } from '../../../types';
import { createPortal } from 'react-dom';

export function DebitForm({ activePeople }: { activePeople: any[] }) {
  const { config, data, updateData } = useAppStore();
  
  const [debitForm, setDebitForm] = useState<DebitFormData>({ billType: config.billTypes[0]?.id || '', amount: '', note: '', customDate: false, date: '', time: '', enableExemptions: false, exemptions: [] });
  const [loadingAction, setLoadingAction] = useState(false);
  const [confirmTx, setConfirmTx] = useState<DebitFormData | null>(null);

  const executeAddDebit = async (formData: DebitFormData) => {
    setLoadingAction(true);
    let transactionDate = getLocalNow();
    if (formData.customDate && formData.date) {
        transactionDate = localToUTC(formData.date, formData.time);
    }

    const splitAmong = formData.enableExemptions 
        ? activePeople.map(p => p.id).filter(id => !formData.exemptions.includes(id))
        : activePeople.map(p => p.id);

    const tx: Transaction = {
      id: generateTransactionId(),
      type: 'debit',
      whoOrBill: formData.billType,
      amount: parseFloat(formData.amount),
      note: formData.note,
      date: transactionDate,
      splitAmong 
    };
    
    const newData = { ...data, transactions: [tx, ...data.transactions] };
    newData.billTypes[tx.whoOrBill] = (newData.billTypes[tx.whoOrBill] || 0) + tx.amount;
    
    const billName = config.billTypes.find(b => b.id === formData.billType)?.name || formData.billType;
    await updateData(newData, `Debit: ${config.currency}${formData.amount} used for ${billName}${formData.note ? ` (${formData.note})` : ''} - Split among ${splitAmong.length}`);
    setLoadingAction(false);
    setDebitForm({ billType: config.billTypes[0]?.id || '', amount: '', note: '', customDate: false, date: '', time: '', enableExemptions: false, exemptions: [] });
    setConfirmTx(null);
  };

  const handleAddDebit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debitForm.amount || !debitForm.billType) return;
    setConfirmTx(debitForm);
  };

  const activePeopleCount = activePeople.length - debitForm.exemptions.length;
  const splitPreviewAmount = parseFloat(debitForm.amount || '0') / Math.max(1, activePeopleCount);

  return (
    <>
      <form onSubmit={handleAddDebit} className="bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 rounded-2xl p-5">
          <h3 className="font-bold text-rose-800 dark:text-rose-200 mb-4 flex items-center uppercase tracking-wide"><ArrowUp className="w-4 h-4 mr-2"/> Add Debit</h3>
          <div className="space-y-3">
              <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Bill Type</label>
                  <select className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-rose-200 dark:border-rose-700 rounded-xl p-2.5 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all" value={debitForm.billType} onChange={e => setDebitForm({...debitForm, billType: e.target.value})}>
                      <option value="" disabled>Select</option>
                      {config.billTypes.map(p => <option key={p.id} value={p.id} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">{p.icon} {p.name}</option>)}
                  </select>
              </div>
              <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Amount ({config.currency})</label>
                  <input type="number" min="0.01" step="0.01" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-rose-200 dark:border-rose-700 rounded-xl p-2.5 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all" required value={debitForm.amount} onChange={e => setDebitForm({...debitForm, amount: e.target.value})}/>
              </div>
              <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Note</label>
                  <input type="text" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-rose-200 dark:border-rose-700 rounded-xl p-2.5 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all" value={debitForm.note} onChange={e => setDebitForm({...debitForm, note: e.target.value})}/>
              </div>
              <div className="pt-2 border-t border-rose-100 dark:border-rose-800/50">
                  <label className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <input type="checkbox" checked={debitForm.customDate} onChange={e => setDebitForm({...debitForm, customDate: e.target.checked})} className="mr-2 rounded text-rose-600 dark:text-rose-400 focus:ring-rose-500"/>
                      Custom date
                  </label>
                  {debitForm.customDate && (
                      <div className="grid grid-cols-2 gap-2 mb-2">
                          <input type="date" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-rose-200 dark:border-rose-700 rounded-lg p-2 text-xs" required value={debitForm.date} onChange={e => setDebitForm({...debitForm, date: e.target.value})}/>
                          <input type="time" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-rose-200 dark:border-rose-700 rounded-lg p-2 text-xs" value={debitForm.time} onChange={e => setDebitForm({...debitForm, time: e.target.value})}/>
                      </div>
                  )}
                  
                  <label className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <input type="checkbox" checked={debitForm.enableExemptions} onChange={e => setDebitForm({...debitForm, enableExemptions: e.target.checked, exemptions: []})} className="mr-2 rounded text-rose-600 dark:text-rose-400 focus:ring-rose-500"/>
                      Exemptions
                  </label>
                  {debitForm.enableExemptions && (
                       <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-rose-100 dark:border-rose-800 mb-2">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Who doesn't pay?</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                              {activePeople.map(p => (
                                  <label key={p.id} className="flex items-center space-x-2">
                                      <input type="checkbox" value={p.id} checked={debitForm.exemptions.includes(p.id)} onChange={e => {
                                          const newExemptions = e.target.checked ? [...debitForm.exemptions, p.id] : debitForm.exemptions.filter(id => id !== p.id);
                                          setDebitForm({...debitForm, exemptions: newExemptions});
                                      }} className="rounded text-rose-600 dark:text-rose-400 focus:ring-rose-500"/>
                                      <span>{p.name}</span>
                                  </label>
                              ))}
                          </div>
                          {parseFloat(debitForm.amount || '0') > 0 && (
                              <div className="mt-2 pt-2 border-t border-dashed border-rose-200 dark:border-rose-700 text-xs text-rose-600 dark:text-rose-400 font-medium">
                                  {activePeopleCount === 0 ? "No one is paying!" : `${splitPreviewAmount.toFixed(2)} ${config.currency} per paying person (${activePeopleCount})`}
                              </div>
                          )}
                       </div>
                  )}
              </div>
              <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-medium shadow-md shadow-rose-500/20 mt-2 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center">
                  Record Debit
              </button>
          </div>
      </form>

      {confirmTx && document.body && createPortal(
          <div className="fixed inset-0 bg-slate-900 dark:bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100">Confirm Debit</h3>
                      <button onClick={() => setConfirmTx(null)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="p-6">
                      <div className="space-y-4 mb-6">
                          <div>
                              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Bill Type</div>
                              <div className="font-medium text-slate-800 dark:text-slate-100">
                                  {config.billTypes.find(b => b.id === confirmTx.billType)?.icon} {config.billTypes.find(b => b.id === confirmTx.billType)?.name}
                              </div>
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
                              onClick={() => executeAddDebit(confirmTx)}
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
