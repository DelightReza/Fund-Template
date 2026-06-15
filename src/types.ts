export interface Person {
  id: string;
  name: string;
  active: boolean;
}

export interface BillType {
  id: string;
  name: string;
  icon: string;
}

export interface Config {
  siteTitle: string;
  siteSubtitle: string;
  currency: string;
  repoOwner: string;
  repoName: string;
  repoBranch: string;
  dataFileName: string;
  people: Person[];
  billTypes: BillType[];
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  whoOrBill: string;
  amount: number;
  note?: string;
  date: string;
  splitAmong?: string[];
  exemptions?: string[];
  parentId?: string;
  distributionTotal?: number;
}

export interface ExpenseFormData {
  person: string;
  billType: string;
  amount: string;
  note: string;
  customDate: boolean;
  date: string;
  time: string;
  enableExemptions: boolean;
  exemptions: string[];
}

export interface CreditFormData {
  person: string;
  amount: string;
  note: string;
  customDate: boolean;
  date: string;
  time: string;
}

export interface DebitFormData {
  billType: string;
  amount: string;
  note: string;
  customDate: boolean;
  date: string;
  time: string;
  enableExemptions: boolean;
  exemptions: string[];
}

export interface AppData {
  people: Record<string, number>;
  billTypes: Record<string, number>;
  transactions: Transaction[];
}
