import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store';
import { formatCurrency, formatDate, localToUTC } from '../../lib/utils';
import { ArrowDown, ArrowUp, Trash, Edit, X, Search, Filter } from 'lucide-react';
import { calculatePersonalFinance, sortTransactions } from '../../lib/calculations';
import { Transaction } from '../../types';

export function TransactionHistory() {
  const { data, config, updateData } = useAppStore();
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<{ id: string, parentId?: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  
  const [editForm, setEditForm] = useState({ whoOrBill: '', person: '', billType: '', amount: '', note: '', date: '', time: '', enableExemptions: false, exemptions: [] as string[] });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredTransactions = useMemo(() => {
     const sorted = sortTransactions(data.transactions, 'desc');
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
  }, [data.transactions, searchQuery, filterCategory, dateFrom, dateTo, config]);

  const openDelete = (id: string, parentId?: string) => {
    setDeletingTx({ id, parentId });
    setDeleteReason('');
  };

  const confirmDelete = async () => {
    if (!deletingTx) return;
    const { id, parentId } = deletingTx;
    
    let commitMsg = '';
    const newData = { ...data, transactions: [...data.transactions] };
    
    if (parentId) {
        const toDelete = newData.transactions.filter(t => t.parentId === parentId);
        const creditTx = toDelete.find(t => t.type === 'credit');
        const debitTx = toDelete.find(t => t.type === 'debit');

        if (creditTx && debitTx) {
            const personName = config.people.find(p => p.id === creditTx.whoOrBill)?.name || creditTx.whoOrBill;
            const billName = config.billTypes.find(b => b.id === debitTx.whoOrBill)?.name || debitTx.whoOrBill;
            commitMsg = `Deleted Expense: ${personName} paid ${config.currency}${creditTx.amount} for ${billName}${deleteReason ? ` (${deleteReason})` : ''}`;
        } else if (toDelete.length === 2 && toDelete.every(t => t.type === 'credit')) {
            const positiveTx = toDelete.find(t => t.amount > 0);
            const negativeTx = toDelete.find(t => t.amount < 0);
            if (positiveTx && negativeTx) {
                 const fromName = config.people.find(p => p.id === negativeTx.whoOrBill)?.name || negativeTx.whoOrBill;
                 const toName = config.people.find(p => p.id === positiveTx.whoOrBill)?.name || positiveTx.whoOrBill;
                 const typeName = positiveTx.note?.toLowerCase().includes('settlement') ? 'Settlement' : 'Transfer';
                 commitMsg = `Deleted ${typeName}: ${fromName} to ${toName} (${config.currency}${positiveTx.amount})${deleteReason ? ` - ${deleteReason}` : ''}`;
            } else {
                 const total = toDelete.reduce((acc, t) => acc + Math.abs(t.amount), 0) / 2;
                 commitMsg = `Deleted Group Transaction (${config.currency}${total})${deleteReason ? `: ${deleteReason}` : ''}`;
            }
        } else if (toDelete.length > 0) {
            const total = toDelete.find(t => t.distributionTotal)?.distributionTotal || (toDelete.reduce((acc, t) => acc + Math.abs(t.amount), 0) / 2);
            commitMsg = `Deleted Distribution (${config.currency}${total})${deleteReason ? `: ${deleteReason}` : ''}`;
        }

        toDelete.forEach(tx => {
            if (tx.type === 'credit') {
                newData.people[tx.whoOrBill] = (newData.people[tx.whoOrBill] || 0) - tx.amount;
            } else {
                newData.billTypes[tx.whoOrBill] = (newData.billTypes[tx.whoOrBill] || 0) - tx.amount;
            }
        });
        newData.transactions = newData.transactions.filter(t => t.parentId !== parentId);
    } else {
        const tx = newData.transactions.find(t => t.id === id);
        if (tx) {
            if (tx.type === 'credit') {
                const personName = config.people.find(p => p.id === tx.whoOrBill)?.name || tx.whoOrBill;
                commitMsg = `Deleted Credit: ${personName} (${config.currency}${tx.amount})${deleteReason ? ` - ${deleteReason}` : ''}`;
                newData.people[tx.whoOrBill] = (newData.people[tx.whoOrBill] || 0) - tx.amount;
            } else {
                const billName = config.billTypes.find(b => b.id === tx.whoOrBill)?.name || tx.whoOrBill;
                commitMsg = `Deleted Debit: ${billName} (${config.currency}${tx.amount})${deleteReason ? ` - ${deleteReason}` : ''}`;
                newData.billTypes[tx.whoOrBill] = (newData.billTypes[tx.whoOrBill] || 0) - tx.amount;
            }
            newData.transactions = newData.transactions.filter(t => t.id !== id);
        }
    }

    if (!commitMsg) {
        commitMsg = deleteReason ? `Deleted transaction: ${deleteReason}` : `Deleted transaction - ${new Date().toLocaleString()}`;
    }

    await updateData(newData, commitMsg);
    setDeletingTx(null);
  };

  const openEdit = (tx: Transaction) => {
      setEditingTx(tx);
      const parts = tx.date.split('T');
      const timePart = parts.length > 1 ? parts[1].substring(0, 5) : '12:00';
      const datePart = parts[0];
      
      const activeIds = config.people.filter(p=>p.active).map(p=>p.id);
      
      let person = '';
      let billType = '';
      let splitAmong = tx.splitAmong || [];
      let note = tx.note || '';

      if (tx.parentId) {
          const group = data.transactions.filter(t => t.parentId === tx.parentId);
          if (group.length === 2) {
              const credit = group.find(t => t.type === 'credit');
              const debit = group.find(t => t.type === 'debit');
              if (credit && debit) {
                  person = credit.whoOrBill;
                  billType = debit.whoOrBill;
                  splitAmong = debit.splitAmong || [];
                  const billName = config.billTypes.find(b => b.id === billType)?.name || '';
                  const personName = config.people.find(p => p.id === person)?.name || '';
                  if (debit.note && debit.note.endsWith(` is paid by ${personName}`)) {
                      const refName = debit.note.substring(0, debit.note.length - ` is paid by ${personName}`.length);
                      note = refName === billName ? '' : refName;
                  }
              }
          }
      }
      
      const exemptions = (tx.type === 'debit' || person) && splitAmong.length > 0 
          ? activeIds.filter(id => !splitAmong.includes(id)) 
          : (tx.exemptions || []);
      
      setEditForm({
          whoOrBill: tx.whoOrBill,
          person,
          billType,
          amount: Math.abs(tx.amount).toString(),
          note: note,
          date: datePart,
          time: timePart,
          enableExemptions: exemptions.length > 0,
          exemptions: exemptions
      });
  }

  const handleEditSave = async () => {
      if(!editingTx) return;
      const amount = parseFloat(editForm.amount);
      if(isNaN(amount) || amount <= 0) return;
      
      const newData = { ...data, transactions: [...data.transactions] };
      const index = newData.transactions.findIndex(t => t.id === editingTx.id);
      if(index === -1) return;

      const oldTx = newData.transactions[index];
      let commitMsg = '';

      if (editForm.person && editForm.billType && oldTx.parentId) {
          // It's a Quick Expense! Update both credit and debit correctly.
          const group = newData.transactions.filter(t => t.parentId === oldTx.parentId);
          const oldCreditIndex = newData.transactions.findIndex(t => t.id === group.find(g => g.type === 'credit')?.id);
          const oldDebitIndex = newData.transactions.findIndex(t => t.id === group.find(g => g.type === 'debit')?.id);
          
          if (oldCreditIndex !== -1 && oldDebitIndex !== -1) {
              const oldCreditTx = newData.transactions[oldCreditIndex];
              const oldDebitTx = newData.transactions[oldDebitIndex];
              
              // Rollback old balances
              newData.people[oldCreditTx.whoOrBill] = (newData.people[oldCreditTx.whoOrBill] || 0) - oldCreditTx.amount;
              newData.billTypes[oldDebitTx.whoOrBill] = (newData.billTypes[oldDebitTx.whoOrBill] || 0) - oldDebitTx.amount;
              
              const transactionDate = localToUTC(editForm.date, editForm.time);
              const personName = config.people.find(p => p.id === editForm.person)?.name || 'Person';
              const billTypeName = config.billTypes.find(b => b.id === editForm.billType)?.name || 'Bill';
              const referenceName = editForm.note || billTypeName;
              
              const activeIds = config.people.filter(p=>p.active).map(p=>p.id);
              const splitAmong = editForm.enableExemptions 
                  ? activeIds.filter(id => !editForm.exemptions.includes(id))
                  : activeIds;
              
              const newCreditTx = {
                  ...oldCreditTx,
                  whoOrBill: editForm.person,
                  amount,
                  note: `${personName} paid for ${referenceName}`,
                  date: transactionDate
              };
              
              const newDebitTx = {
                  ...oldDebitTx,
                  whoOrBill: editForm.billType,
                  amount,
                  note: `${referenceName} is paid by ${personName}`,
                  date: transactionDate,
                  splitAmong
              };
              delete newDebitTx.exemptions;
              
              // Apply new balances
              newData.people[newCreditTx.whoOrBill] = (newData.people[newCreditTx.whoOrBill] || 0) + newCreditTx.amount;
              newData.billTypes[newDebitTx.whoOrBill] = (newData.billTypes[newDebitTx.whoOrBill] || 0) + newDebitTx.amount;
              
              newData.transactions[oldCreditIndex] = newCreditTx;
              newData.transactions[oldDebitIndex] = newDebitTx;
              
              commitMsg = `Edited Expense: ${personName} paid ${config.currency}${amount} for ${billTypeName}${editForm.note ? ` (${editForm.note})` : ''} - Split among ${splitAmong.length}`;
          }
      } else {
          // Standard single transaction or settlement edit
          const newTx = { ...oldTx, whoOrBill: editForm.whoOrBill, amount, note: editForm.note, date: localToUTC(editForm.date, editForm.time) };

          if (newTx.type === 'debit') {
              const activeIds = config.people.filter(p=>p.active).map(p=>p.id);
              newTx.splitAmong = editForm.enableExemptions 
                  ? activeIds.filter(id => !editForm.exemptions.includes(id))
                  : activeIds;
              delete newTx.exemptions;
          }

          // Rollback old balances
          if (oldTx.type === 'credit') {
              newData.people[oldTx.whoOrBill] = (newData.people[oldTx.whoOrBill] || 0) - oldTx.amount;
          } else {
              newData.billTypes[oldTx.whoOrBill] = (newData.billTypes[oldTx.whoOrBill] || 0) - oldTx.amount;
          }

          // Apply new balances
          if (newTx.type === 'credit') {
              newData.people[newTx.whoOrBill] = (newData.people[newTx.whoOrBill] || 0) + newTx.amount;
          } else {
              newData.billTypes[newTx.whoOrBill] = (newData.billTypes[newTx.whoOrBill] || 0) + newTx.amount;
          }

          newData.transactions[index] = newTx;

          // Update linked transaction if it exists (for Settlements/Transfers)
          if (oldTx.parentId) {
              const linkedTxs = newData.transactions.filter(t => t.parentId === oldTx.parentId && t.id !== oldTx.id);
              if (linkedTxs.length === 1) {
                  const oldLinkedTx = linkedTxs[0];
                  const linkedIndex = newData.transactions.findIndex(t => t.id === oldLinkedTx.id);
                  
                  let newLinkedAmount = amount;
                  if (oldTx.type === 'credit' && oldLinkedTx.type === 'credit') {
                      newLinkedAmount = (oldLinkedTx.amount === -oldTx.amount) ? -amount : amount;
                  }
                  
                  const newLinkedTx = { ...oldLinkedTx, amount: newLinkedAmount, date: newTx.date };
                  
                  // Rollback old linked balances
                  if (oldLinkedTx.type === 'credit') {
                      newData.people[oldLinkedTx.whoOrBill] = (newData.people[oldLinkedTx.whoOrBill] || 0) - oldLinkedTx.amount;
                  } else {
                      newData.billTypes[oldLinkedTx.whoOrBill] = (newData.billTypes[oldLinkedTx.whoOrBill] || 0) - oldLinkedTx.amount;
                  }

                  // Apply new linked balances
                  if (newLinkedTx.type === 'credit') {
                      newData.people[newLinkedTx.whoOrBill] = (newData.people[newLinkedTx.whoOrBill] || 0) + newLinkedTx.amount;
                  } else {
                      newData.billTypes[newLinkedTx.whoOrBill] = (newData.billTypes[newLinkedTx.whoOrBill] || 0) + newLinkedTx.amount;
                  }

                  newData.transactions[linkedIndex] = newLinkedTx;

                  if (newTx.type === 'debit' && newLinkedTx.type === 'credit') {
                      const personName = config.people.find(p => p.id === newLinkedTx.whoOrBill)?.name || newLinkedTx.whoOrBill;
                      const billName = config.billTypes.find(b => b.id === newTx.whoOrBill)?.name || newTx.whoOrBill;
                      commitMsg = `Edited Expense: ${personName} paid ${config.currency}${amount} for ${billName}${editForm.note ? ` (${editForm.note})` : ''}`;
                  } else if (newTx.type === 'credit' && newLinkedTx.type === 'debit') {
                      const personName = config.people.find(p => p.id === newTx.whoOrBill)?.name || newTx.whoOrBill;
                      const billName = config.billTypes.find(b => b.id === newLinkedTx.whoOrBill)?.name || newLinkedTx.whoOrBill;
                      commitMsg = `Edited Expense: ${personName} paid ${config.currency}${amount} for ${billName}${editForm.note ? ` (${editForm.note})` : ''}`;
                  } else if (newTx.type === 'credit' && newLinkedTx.type === 'credit') {
                      const positiveTx = newTx.amount > 0 ? newTx : newLinkedTx;
                      const negativeTx = newTx.amount < 0 ? newTx : newLinkedTx;
                      const fromName = config.people.find(p => p.id === negativeTx.whoOrBill)?.name || negativeTx.whoOrBill;
                      const toName = config.people.find(p => p.id === positiveTx.whoOrBill)?.name || positiveTx.whoOrBill;
                      const typeName = positiveTx.note?.toLowerCase().includes('settlement') ? 'Settlement' : 'Transfer';
                      commitMsg = `Edited ${typeName}: ${fromName} to ${toName} (${config.currency}${positiveTx.amount})${editForm.note ? ` - ${editForm.note}` : ''}`;
                  }
              } else if (linkedTxs.length > 1) {
                  const total = linkedTxs.find(t => t.distributionTotal)?.distributionTotal || amount;
                  commitMsg = `Edited Distribution Item (${config.currency}${amount})${editForm.note ? ` - ${editForm.note}` : ''}`;
              }
          }

          if (!commitMsg) {
              if (newTx.type === 'credit') {
                  const personName = config.people.find(p => p.id === newTx.whoOrBill)?.name || newTx.whoOrBill;
                  commitMsg = `Edited Credit: ${personName} added ${config.currency}${amount}${editForm.note ? ` for ${editForm.note}` : ''}`;
              } else if (newTx.type === 'debit') {
                  const billName = config.billTypes.find(b => b.id === newTx.whoOrBill)?.name || newTx.whoOrBill;
                  commitMsg = `Edited Debit: ${config.currency}${amount} used for ${billName}${editForm.note ? ` (${editForm.note})` : ''}`;
              } else {
                  commitMsg = `Edited Transaction: ${config.currency}${amount}${editForm.note ? ` - ${editForm.note}` : ''}`;
              }
          }
      }

      await updateData(newData, commitMsg);
      setEditingTx(null);
  }

  return (
    <>
    <div className="bg-white dark:bg-slate-900 backdrop-blur rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest text-sm">Transaction History</h2>
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
                            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
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
        <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {filteredTransactions.map(tx => {
                        const isCredit = tx.type === 'credit';
                        let displayName = tx.whoOrBill;
                        if(isCredit) displayName = config.people.find(p => p.id === tx.whoOrBill)?.name || tx.whoOrBill;
                        else displayName = config.billTypes.find(b => b.id === tx.whoOrBill)?.name || tx.whoOrBill;
                        return (
                            <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <td className="p-4 pl-6 w-16">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCredit ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                                        <ArrowDown className={`w-3 h-3 ${!isCredit && '-rotate-180'}`}/>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{displayName}</div>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{formatDate(tx.date)}</div>
                                    {tx.parentId && <div className="text-[10px] text-blue-500 font-mono">Grouped</div>}
                                </td>
                                <td className="p-4 text-xs text-slate-500 dark:text-slate-400 hidden sm:table-cell max-w-[150px] truncate">
                                    {tx.note || '-'}
                                </td>
                                <td className="p-4 text-right">
                                    <span className={`font-bold ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                        {isCredit ? (tx.amount >= 0 ? '+' : '-') : '-'}{formatCurrency(Math.abs(tx.amount))}
                                    </span>
                                </td>
                                <td className="p-4 pr-6 text-right">
                                    <button onClick={() => openEdit(tx)} className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 mr-1"><Edit className="w-4 h-4"/></button>
                                    <button onClick={() => openDelete(tx.id, tx.parentId)} className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30"><Trash className="w-4 h-4"/></button>
                                </td>
                            </tr>
                        )
                    })}
                    {filteredTransactions.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">No transactions found</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>

        {editingTx && document.body && createPortal(
            <div className="fixed inset-0 bg-slate-900 dark:bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md flex flex-col shadow-2xl max-h-[90vh]">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800 shrink-0 rounded-t-3xl">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">
                            {editForm.person && editForm.billType ? 'Edit Quick Expense' : `Edit ${editingTx.type === 'credit' ? 'Credit' : 'Debit'}`}
                        </h3>
                        <button onClick={() => setEditingTx(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"><X className="w-4 h-4"/></button>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                        {editForm.person && editForm.billType ? (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Person</label>
                                    <select className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm" value={editForm.person} onChange={e => setEditForm({...editForm, person: e.target.value})}>
                                        {config.people.map(p => <option key={p.id} value={p.id}>{p.name}{p.active ? '' : ' (Inactive)'}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Bill Type</label>
                                    <select className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm" value={editForm.billType} onChange={e => setEditForm({...editForm, billType: e.target.value})}>
                                        {config.billTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </>
                        ) : (
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{editingTx.type === 'credit' ? 'Person' : 'Bill Type'}</label>
                                <select className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm" value={editForm.whoOrBill} onChange={e => setEditForm({...editForm, whoOrBill: e.target.value})}>
                                    {editingTx.type === 'credit' 
                                        ? config.people.map(p => <option key={p.id} value={p.id}>{p.name}{p.active ? '' : ' (Inactive)'}</option>)
                                        : config.billTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                    }
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Amount</label>
                            <input type="number" step="0.01" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})}/>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Note</label>
                            <input type="text" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm" value={editForm.note} onChange={e => setEditForm({...editForm, note: e.target.value})}/>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Date</label>
                                <input type="date" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Time</label>
                                <input type="time" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm" value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value})}/>
                            </div>
                        </div>

                        {(editingTx.type === 'debit' || (editForm.person && editForm.billType)) && (
                            <div className="pt-2">
                                <label className="flex items-center text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                                    <input type="checkbox" checked={editForm.enableExemptions} onChange={e => setEditForm({...editForm, enableExemptions: e.target.checked})} className="mr-2 rounded text-rose-600 dark:text-rose-400"/> Customize who splits this bill
                                </label>
                                {editForm.enableExemptions && (
                                    <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 p-3 rounded-xl grid grid-cols-2 gap-2">
                                        <p className="col-span-2 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Select people to exclude:</p>
                                        {config.people.filter(p=>p.active).map(p => (
                                            <label key={p.id} className="flex items-center space-x-2 text-xs">
                                                <input type="checkbox" checked={editForm.exemptions.includes(p.id)} onChange={e => {
                                                    const ext = e.target.checked ? [...editForm.exemptions, p.id] : editForm.exemptions.filter(id=>id!==p.id);
                                                    setEditForm({...editForm, exemptions: ext});
                                                }} className="rounded text-rose-600 dark:text-rose-400"/> <span>{p.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2 shrink-0 rounded-b-3xl">
                        <button onClick={() => setEditingTx(null)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition">Cancel</button>
                        <button onClick={handleEditSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition shadow-md">Save Changes</button>
                    </div>
                </div>
            </div>
        , document.body)}

        {deletingTx && document.body && createPortal(
            <div className="fixed inset-0 bg-slate-900 dark:bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm flex flex-col shadow-2xl max-h-[90vh]">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-rose-50 dark:bg-rose-900/30 shrink-0 rounded-t-3xl">
                        <h3 className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2"><Trash className="w-4 h-4"/> Delete Transaction</h3>
                        <button onClick={() => setDeletingTx(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-500"><X className="w-4 h-4"/></button>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Are you sure you want to permanently delete this transaction{deletingTx.parentId ? ' and its group' : ''}? This calculates the new balances.
                        </p>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Reason for deletion (optional)</label>
                            <input type="text" placeholder="e.g. Mistake, duplicated entry..." className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500" value={deleteReason} onChange={e => setDeleteReason(e.target.value)}/>
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2 shrink-0 rounded-b-3xl">
                        <button onClick={() => setDeletingTx(null)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition">Cancel</button>
                        <button onClick={confirmDelete} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-medium transition shadow-md">Confirm</button>
                    </div>
                </div>
            </div>
        , document.body)}
    </>
  );
}
