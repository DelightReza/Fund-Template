import React, { useState } from 'react';
import { useAppStore } from '../../../store';
import { generateTransactionId, getLocalNow, localToUTC } from '../../../lib/utils';
import { Zap, Loader2, X } from 'lucide-react';
import { Transaction, ExpenseFormData } from '../../../types';
import { createPortal } from 'react-dom';

export function ExpenseForm({ activePeople }: { activePeople: any[] }) {
  const { config, data, updateData } = useAppStore();
  
  const [expenseForm, setExpenseForm] = useState<ExpenseFormData>({ person: activePeople[0]?.id || '', billType: config.billTypes[0]?.id || '', amount: '', note: '', customDate: false, date: '', time: '', enableExemptions: false, exemptions: [] });
  const [loadingAction, setLoadingAction] = useState(false);
  const [confirmTx, setConfirmTx] = useState<ExpenseFormData | null>(null);

  const executeAddExpense = async (formData: ExpenseFormData) => {
    setLoadingAction(true);
    let transactionDate = getLocalNow();
    if (formData.customDate && formData.date) {
        transactionDate = localToUTC(formData.date, formData.time);
    }

    const parentId = generateTransactionId('tx_exp');
    const amount = parseFloat(formData.amount);
    
    const personName = config.people.find(p => p.id === formData.person)?.name || 'Person';
    const billTypeName = config.billTypes.find(b => b.id === formData.billType)?.name || 'Bill';
    const referenceName = formData.note || billTypeName;
    
    const creditTx: Transaction = {
      id: `${parentId}_credit`,
      parentId,
      type: 'credit',
      whoOrBill: formData.person,
      amount: amount,
      note: `${personName} paid for ${referenceName}`,
      date: transactionDate,
    };

    const splitAmong = formData.enableExemptions 
        ? activePeople.map(p => p.id).filter(id => !formData.exemptions.includes(id))
        : activePeople.map(p => p.id);

    const debitTx: Transaction = {
      id: `${parentId}_debit`,
      parentId,
      type: 'debit',
      whoOrBill: formData.billType,
      amount: amount,
      note: `${referenceName} is paid by ${personName}`,
      date: transactionDate,
      splitAmong 
    };

    const newData = { ...data, transactions: [debitTx, creditTx, ...data.transactions] };
    newData.people[creditTx.whoOrBill] = (newData.people[creditTx.whoOrBill] || 0) + creditTx.amount;
    newData.billTypes[debitTx.whoOrBill] = (newData.billTypes[debitTx.whoOrBill] || 0) + debitTx.amount;
    
    await updateData(newData, `Expense: ${personName} paid ${config.currency}${amount} for ${billTypeName}${formData.note ? ` (${formData.note})` : ''} - Split among ${splitAmong.length}`);
    setLoadingAction(false);
    setExpenseForm({ person: activePeople[0]?.id || '', billType: config.billTypes[0]?.id || '', amount: '', note: '', customDate: false, date: '', time: '', enableExemptions: false, exemptions: [] });
    setConfirmTx(null);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.person || !expenseForm.billType) return;
    setConfirmTx(expenseForm);
  };

  const expensePeopleCount = activePeople.length - expenseForm.exemptions.length;
  const expenseSplitPreviewAmount = parseFloat(expenseForm.amount || '0') / Math.max(1, expensePeopleCount);

  return (
    <>
      <form onSubmit={handleAddExpense} className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-2xl p-5">
          <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-4 flex items-center uppercase tracking-wide"><Zap className="w-4 h-4 mr-2"/> Quick Expense</h3>
          <div className="space-y-3">
              <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Paid By</label>
                  <select className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-blue-200 dark:border-blue-700 rounded-xl p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" value={expenseForm.person} onChange={e => setExpenseForm({...expenseForm, person: e.target.value})}>
                      <option value="" disabled>Select</option>
                      {activePeople.map(p => <option key={p.id} value={p.id} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">👤 {p.name}</option>)}
                  </select>
              </div>
              <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">For Bill Type</label>
                  <select className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-blue-200 dark:border-blue-700 rounded-xl p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" value={expenseForm.billType} onChange={e => setExpenseForm({...expenseForm, billType: e.target.value})}>
                      <option value="" disabled>Select</option>
                      {config.billTypes.map(p => <option key={p.id} value={p.id} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">{p.icon} {p.name}</option>)}
                  </select>
              </div>
              <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Amount ({config.currency})</label>
                  <input type="number" min="0.01" step="0.01" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-blue-200 dark:border-blue-700 rounded-xl p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" required value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}/>
              </div>
              <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Note (Optional)</label>
                  <input type="text" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-blue-200 dark:border-blue-700 rounded-xl p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" value={expenseForm.note} onChange={e => setExpenseForm({...expenseForm, note: e.target.value})}/>
              </div>
              <div className="pt-2 border-t border-blue-100 dark:border-blue-800/50">
                  <label className="flex items-center text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                      <input type="checkbox" checked={expenseForm.customDate} onChange={e => setExpenseForm({...expenseForm, customDate: e.target.checked})} className="mr-2 rounded text-blue-600 dark:text-blue-400 focus:ring-blue-500"/>
                      Custom date
                  </label>
                  {expenseForm.customDate && (
                      <div className="grid grid-cols-2 gap-2 mb-2">
                          <input type="date" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-blue-200 dark:border-blue-700 rounded-lg p-2 text-xs" required value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}/>
                          <input type="time" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-blue-200 dark:border-blue-700 rounded-lg p-2 text-xs" value={expenseForm.time} onChange={e => setExpenseForm({...expenseForm, time: e.target.value})}/>
                      </div>
                  )}
                  
                  <label className="flex items-center text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                      <input type="checkbox" checked={expenseForm.enableExemptions} onChange={e => setExpenseForm({...expenseForm, enableExemptions: e.target.checked, exemptions: []})} className="mr-2 rounded text-blue-600 dark:text-blue-400 focus:ring-blue-500"/>
                      Exemptions
                  </label>
                  {expenseForm.enableExemptions && (
                       <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-100 dark:border-blue-800 mb-2">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Who doesn't pay?</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                              {activePeople.map(p => (
                                  <label key={p.id} className="flex items-center space-x-2">
                                      <input type="checkbox" value={p.id} checked={expenseForm.exemptions.includes(p.id)} onChange={e => {
                                          const newExemptions = e.target.checked ? [...expenseForm.exemptions, p.id] : expenseForm.exemptions.filter(id => id !== p.id);
                                          setExpenseForm({...expenseForm, exemptions: newExemptions});
                                      }} className="rounded text-blue-600 dark:text-blue-400 focus:ring-blue-500"/>
                                      <span>{p.name}</span>
                                  </label>
                              ))}
                          </div>
                          {parseFloat(expenseForm.amount || '0') > 0 && (
                              <div className="mt-2 pt-2 border-t border-dashed border-blue-200 dark:border-blue-700 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                  {expensePeopleCount === 0 ? "No one is paying!" : `${expenseSplitPreviewAmount.toFixed(2)} ${config.currency} per paying person (${expensePeopleCount})`}
                              </div>
                          )}
                       </div>
                  )}
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium shadow-md shadow-blue-500/20 mt-2 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center">
                  Record Expense
              </button>
          </div>
      </form>

      {confirmTx && document.body && createPortal(
          <div className="fixed inset-0 bg-slate-900 dark:bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100">Confirm Expense</h3>
                      <button onClick={() => setConfirmTx(null)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="p-6">
                      <div className="space-y-4 mb-6">
                          <div>
                              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Person</div>
                              <div className="font-medium text-slate-800 dark:text-slate-100">👤 {config.people.find(p => p.id === confirmTx.person)?.name}</div>
                          </div>
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
                              onClick={() => executeAddExpense(confirmTx)}
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
