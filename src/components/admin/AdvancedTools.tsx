import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { generateTransactionId, getLocalNow, localToUTC } from '../../lib/utils';
import { Crown, Handshake, ArrowRightLeft, Loader2, X } from 'lucide-react';
import { Transaction } from '../../types';
import { createPortal } from 'react-dom';

interface DistributeFormData {
  amount: number;
  splitAmong: string[];
  note: string;
  customDate: boolean;
  date: string;
  time: string;
}

interface TransferFormData {
  from: string;
  to: string;
  amount: number;
  note: string;
  customDate: boolean;
  date: string;
  time: string;
}

export function AdvancedTools() {
  const { config, data, updateData } = useAppStore();
  const activePeople = config.people.filter(p => p.active);
  
  const [distAmount, setDistAmount] = useState('');
  const [distNote, setDistNote] = useState('');
  const [distEnableExemptions, setDistEnableExemptions] = useState(false);
  const [distExemptions, setDistExemptions] = useState<string[]>([]);
  const [distCustomDate, setDistCustomDate] = useState(false);
  const [distDate, setDistDate] = useState('');
  const [distTime, setDistTime] = useState('');
  
  const [transferFrom, setTransferFrom] = useState(activePeople[0]?.id || '');
  const [transferTo, setTransferTo] = useState(activePeople[1]?.id || activePeople[0]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferCustomDate, setTransferCustomDate] = useState(false);
  const [transferDate, setTransferDate] = useState('');
  const [transferTime, setTransferTime] = useState('');
  
  const [settlementFrom, setSettlementFrom] = useState(activePeople[0]?.id || '');
  const [settlementTo, setSettlementTo] = useState(activePeople[1]?.id || activePeople[0]?.id || '');
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settlementNote, setSettlementNote] = useState('');
  const [settlementCustomDate, setSettlementCustomDate] = useState(false);
  const [settlementDate, setSettlementDate] = useState('');
  const [settlementTime, setSettlementTime] = useState('');

  const [loadingAction, setLoadingAction] = useState(false);
  const [confirmData, setConfirmData] = useState<
    | { type: 'distribute'; data: DistributeFormData }
    | { type: 'settlement'; data: TransferFormData }
    | { type: 'transfer'; data: TransferFormData }
    | null
  >(null);

  const executeDistribution = async (formData: DistributeFormData) => {
      setLoadingAction(true);
      const amount = formData.amount;
      const splitAmong = formData.splitAmong;
      
      const amountPerPerson = amount / splitAmong.length;
      let transactionDate = getLocalNow();
      if (formData.customDate && formData.date) {
          transactionDate = localToUTC(formData.date, formData.time);
      }
      const baseTransactionId = generateTransactionId('tx_dist');
      
      const newTransactions: Transaction[] = [];
      const newData = { ...data, transactions: [...data.transactions] };
      
      splitAmong.forEach((personId: string, index: number) => {
          const tx: Transaction = {
            id: `${baseTransactionId}_${index}`,
            type: 'credit',
            whoOrBill: personId,
            note: formData.note || 'From distribution',
            amount: amountPerPerson,
            date: transactionDate,
            parentId: baseTransactionId,
            distributionTotal: amount
          };
          newTransactions.push(tx);
          newData.people[personId] = (newData.people[personId] || 0) + amountPerPerson;
      });
      
      newData.transactions = [...newTransactions, ...newData.transactions];
      await updateData(newData, `Distributed ${config.currency}${amount} among ${splitAmong.length} people${formData.note ? ` for ${formData.note}` : ''}`);
      setLoadingAction(false);
      setDistAmount('');
      setDistNote('');
      setDistEnableExemptions(false);
      setDistExemptions([]);
      setDistCustomDate(false);
      setDistDate('');
      setDistTime('');
      setConfirmData(null);
  }

  const executeSettlement = async (formData: TransferFormData) => {
      setLoadingAction(true);
      const amount = formData.amount;
      
      let transactionDate = getLocalNow();
      if (formData.customDate && formData.date) {
          transactionDate = localToUTC(formData.date, formData.time);
      }
      const baseId = generateTransactionId('tx_set');
      
      const fromName = config.people.find(p=>p.id === formData.from)?.name;
      const toName = config.people.find(p=>p.id === formData.to)?.name;

      const payerTx: Transaction = {
          id: `${baseId}_payer`,
          type: 'credit',
          whoOrBill: formData.from,
          note: formData.note ? `Settlement: ${formData.note}` : `Settlement to ${toName}`,
          amount: amount,
          date: transactionDate,
          parentId: baseId
      };

      const receiverTx: Transaction = {
          id: `${baseId}_rcvr`,
          type: 'credit',
          whoOrBill: formData.to,
          note: formData.note ? `Settlement: ${formData.note}` : `Settlement from ${fromName}`,
          amount: -amount,
          date: transactionDate,
          parentId: baseId
      };

      const newData = { ...data, transactions: [payerTx, receiverTx, ...data.transactions] };
      newData.people[formData.from] = (newData.people[formData.from] || 0) + amount;
      newData.people[formData.to] = (newData.people[formData.to] || 0) - amount;
      
      await updateData(newData, `Settlement: ${fromName} paid ${config.currency}${amount} to ${toName}`);
      setLoadingAction(false);
      setSettlementAmount('');
      setSettlementNote('');
      setSettlementCustomDate(false);
      setSettlementDate('');
      setSettlementTime('');
      setConfirmData(null);
  }

  const executeTransfer = async (formData: TransferFormData) => {
      setLoadingAction(true);
      const amount = formData.amount;

      let transactionDate = getLocalNow();
      if (formData.customDate && formData.date) {
          transactionDate = localToUTC(formData.date, formData.time);
      }
      const baseId = generateTransactionId('tx_trf');
      
      const fromName = config.people.find(p=>p.id === formData.from)?.name;
      const toName = config.people.find(p=>p.id === formData.to)?.name;

      const senderTx: Transaction = {
          id: `${baseId}_send`,
          type: 'credit',
          whoOrBill: formData.from,
          note: formData.note ? `Transfer: ${formData.note}` : `Transfer to ${toName}`,
          amount: -amount,
          date: transactionDate,
          parentId: baseId
      };

      const receiverTx: Transaction = {
          id: `${baseId}_rcpt`,
          type: 'credit',
          whoOrBill: formData.to,
          note: formData.note ? `Transfer: ${formData.note}` : `Transfer from ${fromName}`,
          amount: amount,
          date: transactionDate,
          parentId: baseId
      };

      const newData = { ...data, transactions: [senderTx, receiverTx, ...data.transactions] };
      newData.people[formData.from] = (newData.people[formData.from] || 0) - amount;
      newData.people[formData.to] = (newData.people[formData.to] || 0) + amount;
      
      await updateData(newData, `Transfer: ${fromName} transferred ${config.currency}${amount} to ${toName}`);
      setLoadingAction(false);
      setTransferAmount('');
      setTransferNote('');
      setTransferCustomDate(false);
      setTransferDate('');
      setTransferTime('');
      setConfirmData(null);
  }

  const handleDistribution = () => {
      const amount = parseFloat(distAmount);
      const splitAmong = distEnableExemptions ? activePeople.filter(p => !distExemptions.includes(p.id)).map(p => p.id) : activePeople.map(p => p.id);
      if(!amount || amount <= 0 || splitAmong.length === 0) return;
      setConfirmData({ type: 'distribute', data: { amount, splitAmong, note: distNote, customDate: distCustomDate, date: distDate, time: distTime } });
  }

  const handleSettlement = () => {
      const amount = parseFloat(settlementAmount);
      if(!amount || amount <= 0 || settlementFrom === settlementTo) return;
      setConfirmData({ type: 'settlement', data: { amount, from: settlementFrom, to: settlementTo, note: settlementNote, customDate: settlementCustomDate, date: settlementDate, time: settlementTime } });
  }

  const handleTransfer = () => {
      const amount = parseFloat(transferAmount);
      if(!amount || amount <= 0 || transferFrom === transferTo) return;
      setConfirmData({ type: 'transfer', data: { amount, from: transferFrom, to: transferTo, note: transferNote, customDate: transferCustomDate, date: transferDate, time: transferTime } });
  }

  return (
    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mb-8">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide mb-4">Advanced Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* Distribution Tool */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col h-full">
                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200 mb-1 flex items-center">
                    <Crown className="w-4 h-4 mr-2 text-purple-500" /> Distribution
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 mb-3">Distribute cost equally to everyone.</p>
                <div className="space-y-2 flex-grow">
                    <input type="number" min="0.01" step="0.01" value={distAmount} onChange={e=>setDistAmount(e.target.value)} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm outline-none focus:ring-1 focus:ring-purple-500 w-full" placeholder="Amount" />
                    <input type="text" value={distNote} onChange={e=>setDistNote(e.target.value)} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm outline-none focus:ring-1 focus:ring-purple-500 w-full" placeholder="Note (e.g. Rent)" />
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                        <label className="flex items-center">
                            <input type="checkbox" checked={distEnableExemptions} onChange={e => setDistEnableExemptions(e.target.checked)} className="mr-2 rounded text-purple-600"/>
                            Customize who gets this split
                        </label>
                        {distEnableExemptions && (
                            <div className="mt-2 pl-6 grid grid-cols-2 gap-1 text-[10px]">
                                {activePeople.map(p => (
                                    <label key={`dist_ex_${p.id}`} className={`flex items-center ${distExemptions.includes(p.id) ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                                        <input type="checkbox" 
                                            checked={!distExemptions.includes(p.id)} 
                                            onChange={e => {
                                                const newExemptions = e.target.checked ? distExemptions.filter(id => id !== p.id) : [...distExemptions, p.id];
                                                setDistExemptions(newExemptions);
                                            }} 
                                            className="mr-1 rounded text-purple-400 focus:ring-purple-400 w-3 h-3"/>
                                        {p.name}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                        <label className="flex items-center text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                            <input type="checkbox" checked={distCustomDate} onChange={e => setDistCustomDate(e.target.checked)} className="mr-2 rounded text-purple-600"/>
                            Custom date
                        </label>
                        {distCustomDate && (
                            <div className="grid grid-cols-2 gap-2">
                                <input type="date" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs w-full" required value={distDate} onChange={e => setDistDate(e.target.value)}/>
                                <input type="time" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs w-full" value={distTime} onChange={e => setDistTime(e.target.value)}/>
                            </div>
                        )}
                    </div>
                </div>
                <button onClick={handleDistribution} disabled={!distAmount || parseFloat(distAmount) <= 0 || (distEnableExemptions && distExemptions.length === activePeople.length)} className="mt-3 w-full bg-purple-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-purple-700 shadow-md shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center">
                    Distribute
                </button>
            </div>

            {/* Offline Settlement Tool */}
            <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-4 flex flex-col h-full">
                <h3 className="font-bold text-sm text-emerald-800 dark:text-emerald-200 mb-1 flex items-center">
                    <Handshake className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" /> Offline Payment
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 mb-3">Someone paid cash to clear debt.</p>
                <div className="space-y-2 flex-grow">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase">Paid By</label>
                            <select value={settlementFrom} onChange={e=>setSettlementFrom(e.target.value)} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-emerald-200 dark:border-emerald-700 w-full rounded-xl p-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500">
                                {config.people.map(p => <option key={p.id} value={p.id} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">{p.name}{p.active ? '' : ' (Inactive)'}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase mb-1 block">Received By</label>
                            <select value={settlementTo} onChange={e=>setSettlementTo(e.target.value)} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-emerald-200 dark:border-emerald-700 w-full rounded-xl p-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500">
                                {config.people.map(p => <option key={p.id} value={p.id} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">{p.name}{p.active ? '' : ' (Inactive)'}</option>)}
                            </select>
                        </div>
                    </div>
                    <input type="number" min="0.01" step="0.01" value={settlementAmount} onChange={e=>setSettlementAmount(e.target.value)} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-emerald-200 dark:border-emerald-700 rounded-xl p-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500 w-full" placeholder="Amount" />
                    <input type="text" value={settlementNote} onChange={e=>setSettlementNote(e.target.value)} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-emerald-200 dark:border-emerald-700 rounded-xl p-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500 w-full" placeholder="Note (Optional)" />
                    <div className="pt-2 border-t border-emerald-200 dark:border-emerald-700/50 mt-2">
                        <label className="flex items-center text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                            <input type="checkbox" checked={settlementCustomDate} onChange={e => setSettlementCustomDate(e.target.checked)} className="mr-2 rounded text-emerald-600 dark:text-emerald-400"/>
                            Custom date
                        </label>
                        {settlementCustomDate && (
                            <div className="grid grid-cols-2 gap-2">
                                <input type="date" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-emerald-200 dark:border-emerald-700 rounded-lg p-2 text-xs w-full" required value={settlementDate} onChange={e => setSettlementDate(e.target.value)}/>
                                <input type="time" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-emerald-200 dark:border-emerald-700 rounded-lg p-2 text-xs w-full" value={settlementTime} onChange={e => setSettlementTime(e.target.value)}/>
                            </div>
                        )}
                    </div>
                </div>
                <button onClick={handleSettlement} disabled={!settlementAmount || parseFloat(settlementAmount) <= 0 || settlementFrom === settlementTo} className="mt-3 w-full bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center">
                    Settle Debt
                </button>
            </div>

            {/* Fund Transfer Tool */}
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 flex flex-col h-full">
                <h3 className="font-bold text-sm text-blue-800 dark:text-blue-200 mb-1 flex items-center">
                    <ArrowRightLeft className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" /> Balance Transfer
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 mb-3">Move app funds between members.</p>
                <div className="space-y-2 flex-grow">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase">From</label>
                            <select value={transferFrom} onChange={e=>setTransferFrom(e.target.value)} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-blue-200 dark:border-blue-700 w-full rounded-xl p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500">
                                {config.people.map(p => <option key={p.id} value={p.id} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">{p.name}{p.active ? '' : ' (Inactive)'}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase mb-1 block">To Account</label>
                            <select value={transferTo} onChange={e=>setTransferTo(e.target.value)} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-blue-200 dark:border-blue-700 w-full rounded-xl p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500">
                                {config.people.map(p => <option key={p.id} value={p.id} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">{p.name}{p.active ? '' : ' (Inactive)'}</option>)}
                            </select>
                        </div>
                    </div>
                    <input type="number" min="0.01" step="0.01" value={transferAmount} onChange={e=>setTransferAmount(e.target.value)} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-blue-200 dark:border-blue-700 rounded-xl p-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 w-full" placeholder="Amount" />
                    <input type="text" value={transferNote} onChange={e=>setTransferNote(e.target.value)} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-blue-200 dark:border-blue-700 rounded-xl p-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 w-full" placeholder="Note (Optional)" />
                    <div className="pt-2 border-t border-blue-200 dark:border-blue-700/50 mt-2">
                        <label className="flex items-center text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                            <input type="checkbox" checked={transferCustomDate} onChange={e => setTransferCustomDate(e.target.checked)} className="mr-2 rounded text-blue-600 dark:text-blue-400"/>
                            Custom date
                        </label>
                        {transferCustomDate && (
                            <div className="grid grid-cols-2 gap-2">
                                <input type="date" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-blue-200 dark:border-blue-700 rounded-lg p-2 text-xs w-full" required value={transferDate} onChange={e => setTransferDate(e.target.value)}/>
                                <input type="time" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-blue-200 dark:border-blue-700 rounded-lg p-2 text-xs w-full" value={transferTime} onChange={e => setTransferTime(e.target.value)}/>
                            </div>
                        )}
                    </div>
                </div>
                <button onClick={handleTransfer} disabled={!transferAmount || parseFloat(transferAmount) <= 0 || transferFrom === transferTo} className="mt-3 w-full bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center">
                    Transfer Funds
                </button>
            </div>

        </div>

        {confirmData && document.body && createPortal(
            <div className="fixed inset-0 bg-slate-900 dark:bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">
                           Confirm {confirmData.type === 'distribute' ? 'Distribution' : confirmData.type === 'settlement' ? 'Settlement' : 'Transfer'}
                        </h3>
                        <button onClick={() => setConfirmData(null)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4 mb-6">
                            {(confirmData.type === 'settlement' || confirmData.type === 'transfer') && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">From</div>
                                        <div className="font-medium text-slate-800 dark:text-slate-100">👤 {config.people.find(p => p.id === confirmData.data.from)?.name}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">To</div>
                                        <div className="font-medium text-slate-800 dark:text-slate-100">👤 {config.people.find(p => p.id === confirmData.data.to)?.name}</div>
                                    </div>
                                </div>
                            )}
                            {confirmData.type === 'distribute' && (
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Distributing To</div>
                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{confirmData.data.splitAmong.length} People ({config.currency}{(confirmData.data.amount / confirmData.data.splitAmong.length).toFixed(2)} each)</div>
                                </div>
                            )}
                            <div>
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Amount</div>
                                <div className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">{config.currency}{parseFloat(confirmData.data.amount).toFixed(2)}</div>
                            </div>
                            {confirmData.data.note && (
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Note</div>
                                    <div className="text-sm text-slate-600 dark:text-slate-300">{confirmData.data.note}</div>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex space-x-3">
                            <button onClick={() => setConfirmData(null)} disabled={loadingAction} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">Cancel</button>
                            <button 
                                onClick={() => {
                                    if(confirmData.type === 'distribute') executeDistribution(confirmData.data);
                                    else if(confirmData.type === 'settlement') executeSettlement(confirmData.data);
                                    else executeTransfer(confirmData.data);
                                }}
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
    </div>
  );
}
