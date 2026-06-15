import React from 'react';
import { useAppStore } from '../../store';
import { ExpenseForm } from './forms/ExpenseForm';
import { CreditForm } from './forms/CreditForm';
import { DebitForm } from './forms/DebitForm';

export function TransactionForms() {
  const { config } = useAppStore();
  const activePeople = config.people.filter(p => p.active);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ExpenseForm activePeople={activePeople} />
        <CreditForm allPeople={config.people} />
        <DebitForm activePeople={activePeople} />
    </div>
  );
}
