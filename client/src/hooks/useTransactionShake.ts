import { useState, useCallback } from 'react';

interface UseTransactionShakeReturn {
  shakingTransactions: Set<number>;
  triggerTransactionShake: (transactionId: number) => void;
  clearTransactionShake: (transactionId: number) => void;
}

export function useTransactionShake(duration: number = 300): UseTransactionShakeReturn {
  const [shakingTransactions, setShakingTransactions] = useState<Set<number>>(new Set());

  const triggerTransactionShake = useCallback((transactionId: number) => {
    setShakingTransactions(prev => new Set(prev).add(transactionId));
    
    setTimeout(() => {
      setShakingTransactions(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }, duration);
  }, [duration]);

  const clearTransactionShake = useCallback((transactionId: number) => {
    setShakingTransactions(prev => {
      const newSet = new Set(prev);
      newSet.delete(transactionId);
      return newSet;
    });
  }, []);

  return {
    shakingTransactions,
    triggerTransactionShake,
    clearTransactionShake
  };
}
