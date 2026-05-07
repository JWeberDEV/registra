import React from 'react';
import { motion } from 'framer-motion';

interface ShakeWrapperProps {
  children: React.ReactNode;
  isShaking: boolean;
  className?: string;
}

export function ShakeWrapper({ children, isShaking, className = '' }: ShakeWrapperProps) {
  return (
    <motion.div
      className={className}
      animate={isShaking ? {
        x: [0, -10, 10, -10, 10, -5, 5, 0],
        transition: {
          duration: 0.4,
          ease: "easeInOut"
        }
      } : {}}
    >
      {children}
    </motion.div>
  );
}
