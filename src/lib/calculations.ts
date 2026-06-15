import { AppData, Transaction } from '../types';

export function sortTransactions(transactions: Transaction[], order: 'asc' | 'desc' = 'asc'): Transaction[] {
  return [...transactions].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    
    let diff = 0;
    if (timeA !== timeB) {
      diff = timeA - timeB;
    } else {
      const parentA = a.parentId || a.id;
      const parentB = b.parentId || b.id;
      if (parentA === parentB) {
        if (a.type !== b.type) {
          diff = a.type === 'credit' ? -1 : 1;
        } else {
          diff = a.id.localeCompare(b.id);
        }
      } else {
        diff = parentA.localeCompare(parentB);
        if (diff === 0) {
          diff = a.id.localeCompare(b.id);
        }
      }
    }
    
    return order === 'asc' ? diff : -diff;
  });
}

export function calculatePersonalFinance(data: AppData, allPeopleIds: string[]) {
  const personalFinance: Record<string, { credits: number; debits: number; netBalance: number }> = {};
  
  allPeopleIds.forEach(id => {
    personalFinance[id] = { credits: 0, debits: 0, netBalance: 0 };
  });

  data.transactions.forEach(tx => {
    if (tx.type === 'credit') {
      if (!personalFinance[tx.whoOrBill]) personalFinance[tx.whoOrBill] = { credits: 0, debits: 0, netBalance: 0 };
      personalFinance[tx.whoOrBill].credits += tx.amount;
      personalFinance[tx.whoOrBill].netBalance += tx.amount;
    } else if (tx.type === 'debit') {
      let payingPeople: string[] = [];
      if (tx.splitAmong && tx.splitAmong.length > 0) {
        payingPeople = tx.splitAmong;
      } else {
        const exemptions = tx.exemptions || [];
        payingPeople = allPeopleIds.filter(id => !exemptions.includes(id));
      }
      
      if (payingPeople.length > 0) {
        const amountPerPerson = tx.amount / payingPeople.length;
        payingPeople.forEach(id => {
          if (!personalFinance[id]) personalFinance[id] = { credits: 0, debits: 0, netBalance: 0 };
          personalFinance[id].debits += amountPerPerson;
          personalFinance[id].netBalance -= amountPerPerson;
        });
      }
    }
  });

  return personalFinance;
}

export function calculateTotals(data: AppData) {
  let totalCredits = 0;
  let totalDebits = 0;
  
  data.transactions.forEach(tx => {
    if (tx.type === 'credit') {
      totalCredits += tx.amount;
    } else {
      totalDebits += tx.amount;
    }
  });
  
  return { totalCredits, totalDebits, balance: totalCredits - totalDebits };
}

export function calculateRunningBalance(transactions: Transaction[], transactionId: string) {
  let runningBalance = 0;
  const sorted = sortTransactions(transactions, 'asc');
  
  let balanceBefore = 0;
  let balanceAfter = 0;
  
  for (const tx of sorted) {
    const change = tx.type === 'credit' ? tx.amount : -tx.amount;
    if (tx.id === transactionId) {
      balanceBefore = runningBalance;
      balanceAfter = runningBalance + change;
      break;
    }
    runningBalance += change;
  }
  
  return { balanceBefore, balanceAfter };
}

export function calculateDebtSettlements(personalFinance: Record<string, { netBalance: number }>) {
  const debtors = Object.entries(personalFinance)
    .filter(([_, data]) => data.netBalance < -0.01)
    .map(([id, data]) => ({ id, amount: Math.abs(data.netBalance) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = Object.entries(personalFinance)
    .filter(([_, data]) => data.netBalance > 0.01)
    .map(([id, data]) => ({ id, amount: data.netBalance }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: { from: string; to: string; amount: number }[] = [];

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(debtor.amount, creditor.amount);
    const roundedAmount = Math.round(amount * 100) / 100;

    if (roundedAmount >= 0.01) {
        settlements.push({
          from: debtor.id,
          to: creditor.id,
          amount: roundedAmount,
        });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.005) i++;
    if (creditor.amount < 0.005) j++;
  }

  return settlements;
}

export function calculatePersonRunningBalance(transactions: Transaction[], transactionId: string, personId: string, allPeopleIds: string[]) {
  let runningBalance = 0;
  
  const sorted = sortTransactions(transactions, 'asc');
  
  let balanceBefore = 0;
  let balanceAfter = 0;
  let found = false;
  
  for (const tx of sorted) {
    let change = 0;
    if (tx.type === 'credit' && tx.whoOrBill === personId) {
      change += tx.amount;
    } else if (tx.type === 'debit') {
      let payingPeople: string[] = [];
      if (tx.splitAmong && tx.splitAmong.length > 0) {
        payingPeople = tx.splitAmong;
      } else {
        const exemptions = tx.exemptions || [];
        payingPeople = allPeopleIds.filter(id => !exemptions.includes(id));
      }
      
      if (payingPeople.includes(personId)) {
        change -= tx.amount / payingPeople.length;
      }
    }
    
    if (tx.id === transactionId) {
      found = true;
      balanceBefore = runningBalance;
      balanceAfter = runningBalance + change;
    }
    
    runningBalance += change;
    
    if (found) {
      break;
    }
  }
  
  return { balanceBefore, balanceAfter };
}
