import React, { useMemo } from 'react';
import { useAppStore } from '../../store';
import { calculatePersonalFinance, calculateDebtSettlements } from '../../lib/calculations';
import { formatCurrency } from '../../lib/utils';
import { Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BalancesPanel() {
  const { data, config } = useAppStore();
  const allIds = config.people.map(p => p.id);
  const fin = useMemo(() => calculatePersonalFinance(data, allIds) as Record<string, { credits: number; debits: number; netBalance: number }>, [data, allIds]);
  const finList = useMemo(() => Object.values(fin), [fin]);
  const settlements = useMemo(() => calculateDebtSettlements(fin), [fin]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                <Users className="w-5 h-5 text-blue-500 mr-2" /> Balances
            </h2>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm">
                <thead className="text-xs text-slate-400 dark:text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                        <th className="px-4 py-3 font-bold text-left">Person</th>
                        <th className="px-4 py-3 font-bold text-right hidden sm:table-cell">Added</th>
                        <th className="px-4 py-3 font-bold text-right hidden sm:table-cell">Share</th>
                        <th className="px-4 py-3 font-bold text-right">Balance</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {config.people.map(person => {
                        const credits = fin[person.id]?.credits || 0;
                        const debits = fin[person.id]?.debits || 0;
                        const balance = fin[person.id]?.netBalance || 0;
                        const isPos = balance >= 0;
                        return (
                            <tr key={person.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <Link to={`/profile/${person.id}`} className="font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400">
                                          {person.name}
                                      </Link>
                                      {!person.active && <span className="text-[10px] bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Inactive</span>}
                                    </div>
                                    <div className="sm:hidden text-xs text-slate-500 dark:text-slate-400 mt-1">
                                      Added: {formatCurrency(credits, config.currency)} &nbsp;|&nbsp; Share: {formatCurrency(debits, config.currency)}
                                    </div>
                                  </td>
                                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300 font-medium hidden sm:table-cell">
                                    {formatCurrency(credits, config.currency)}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300 font-medium hidden sm:table-cell">
                                    {formatCurrency(debits, config.currency)}
                                </td>
                                <td className={`px-4 py-3 text-right font-bold ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                    {isPos ? '+' : ''}{formatCurrency(balance, config.currency)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                    <tr className="font-bold sm:hidden">
                        <td className="px-4 py-3 text-right text-slate-800 dark:text-slate-100" colSpan={2}>
                            House Balance: <span className={(finList.reduce((acc, curr) => acc + curr.netBalance, 0)) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}>{(finList.reduce((acc, curr) => acc + curr.netBalance, 0)) >= 0 ? '+' : ''}{formatCurrency(finList.reduce((acc, curr) => acc + curr.netBalance, 0), config.currency)}</span>
                        </td>
                    </tr>
                    <tr className="font-bold hidden sm:table-row">
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">Totals</td>
                        <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(finList.reduce((acc, curr) => acc + curr.credits, 0), config.currency)}
                        </td>
                        <td className="px-4 py-3 text-right text-rose-500">
                            {formatCurrency(finList.reduce((acc, curr) => acc + curr.debits, 0), config.currency)}
                        </td>
                        <td className={`px-4 py-3 text-right ${
                            (finList.reduce((acc, curr) => acc + curr.netBalance, 0)) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                        }`}>
                            {(finList.reduce((acc, curr) => acc + curr.netBalance, 0)) >= 0 ? '+' : ''}{formatCurrency(finList.reduce((acc, curr) => acc + curr.netBalance, 0), config.currency)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
        
        {settlements.length > 0 && (
            <div className="p-6 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wide">Debt Simplifier</h3>
                <div className="space-y-3">
                    {settlements.map((s, i) => {
                        const fromPerson = config.people.find(p => p.id === s.from);
                        const toPerson = config.people.find(p => p.id === s.to);
                        return (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="font-semibold text-slate-700 dark:text-slate-200">{fromPerson?.name}</div>
                                    <ArrowRight className="w-4 h-4 text-slate-400" />
                                    <div className="font-semibold text-slate-700 dark:text-slate-200">{toPerson?.name}</div>
                                </div>
                                <div className="font-bold text-slate-800 dark:text-slate-100">
                                    {formatCurrency(s.amount, config.currency)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
    </div>
  );
}
