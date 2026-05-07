// Declarações globais para TypeScript

declare global {
  interface Window {
    removeCriticalLoading?: () => void;
  }
}

export {};