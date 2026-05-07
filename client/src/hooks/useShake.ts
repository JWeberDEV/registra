import { useState, useCallback } from 'react';

interface UseShakeReturn {
  isShaking: boolean;
  triggerShake: () => void;
}

export function useShake(duration: number = 400): UseShakeReturn {
  const [isShaking, setIsShaking] = useState(false);

  const triggerShake = useCallback(() => {
    if (isShaking) return; // Evitar múltiplos shakes simultâneos
    
    setIsShaking(true);
    
    setTimeout(() => {
      setIsShaking(false);
    }, duration);
  }, [isShaking, duration]);

  return {
    isShaking,
    triggerShake
  };
}
