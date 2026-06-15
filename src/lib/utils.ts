import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = '') {
  return parseFloat(amount.toString()).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' ' + currency;
}

export function formatDate(dateString: string) {
  if (!dateString) return '';
  return dateString.replace('T', ' ').substring(0, 16);
}

export function generateTransactionId(prefix = 'tx') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

export function getLocalNow() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:00`;
}

export function localToUTC(localDate: string, localTime: string) {
  const timePart = localTime || '12:00';
  return `${localDate}T${timePart}:00`;
}

export function formatJsonString(obj: any): string {
    let jsonStr = JSON.stringify(obj, null, 2);
    
    // Format flat arrays (like splitAmong) to single line
    jsonStr = jsonStr.replace(/\[\n\s+([^\[\]]+?)\n\s+\]/g, (match, inner) => {
        if (!inner.includes('{')) {
            const singleLine = inner.replace(/\n\s+/g, " ");
            return `[${singleLine}]`;
        }
        return match;
    });

    // Format empty string arrays
    jsonStr = jsonStr.replace(/\[\n\s+\]/g, "[]");

    // Format Person objects in config to single line
    jsonStr = jsonStr.replace(/\{\n\s+"id":\s*"[^"]+",\n\s+"name":\s*"[^"]+",\n\s+"active":\s*(?:true|false)\n\s+\}/g, (match) => {
        return match.replace(/\n\s+/g, " ");
    });

    // Format BillType objects in config to single line
    jsonStr = jsonStr.replace(/\{\n\s+"id":\s*"[^"]+",\n\s+"name":\s*"[^"]+",\n\s+"icon":\s*"[^"]+"\n\s+\}/g, (match) => {
        return match.replace(/\n\s+/g, " ");
    });

    return jsonStr;
}
