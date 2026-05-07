import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Combines class values using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as currency (BRL)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formats a date using date-fns
 */
export function formatDate(date: Date | string, formatStr: string = "dd MMM, yyyy"): string {
  // If it's a string, parse it as ISO and treat as UTC
  if (typeof date === "string") {
    // Remove timezone information and treat as local date
    const dateOnly = date.split('T')[0];
    const [year, month, day] = dateOnly.split('-');
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return format(localDate, formatStr, { locale: ptBR });
  }
  
  // If it's already a Date object
  return format(date, formatStr, { locale: ptBR });
}

/**
 * Formats a date for display in a relative format (today, yesterday, etc.)
 */
export function formatRelativeDate(date: Date | string): string {
  let parsedDate: Date;
  
  // If it's a string, parse it as ISO and treat as UTC
  if (typeof date === "string") {
    // Remove timezone information and treat as local date
    const dateOnly = date.split('T')[0];
    const [year, month, day] = dateOnly.split('-');
    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  } else {
    parsedDate = date;
  }
  
  const now = new Date();
  
  // Same day
  if (
    parsedDate.getDate() === now.getDate() &&
    parsedDate.getMonth() === now.getMonth() &&
    parsedDate.getFullYear() === now.getFullYear()
  ) {
    return "Hoje";
  }
  
  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    parsedDate.getDate() === yesterday.getDate() &&
    parsedDate.getMonth() === yesterday.getMonth() &&
    parsedDate.getFullYear() === yesterday.getFullYear()
  ) {
    return "Ontem";
  }
  
  // This week
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  if (parsedDate >= startOfWeek) {
    return format(parsedDate, "EEEE", { locale: ptBR });
  }
  
  // Default format
  return format(parsedDate, "dd MMM, yyyy", { locale: ptBR });
}

/**
 * Truncates text and adds ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Generates a random hex color
 */
export function getRandomColor(): string {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

/**
 * Calculates percentage change between two numbers
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/**
 * Sums an array of numbers
 */
export function sumArray(arr: number[]): number {
  return arr.reduce((acc, val) => acc + val, 0);
}

/**
 * Extracts initials from a name
 */
export function getInitials(name: string): string {
  if (!name) return "";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Debounce function to limit how often a function can be called
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function (...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Creates a random ID
 */
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
