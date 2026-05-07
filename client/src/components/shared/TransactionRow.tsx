import React from 'react';
import { motion } from 'framer-motion';

interface TransactionRowProps {
  children: React.ReactNode;
  isShaking: boolean;
  className?: string;
}

export function TransactionRow({ children, isShaking, className = '' }: TransactionRowProps) {
  return (
    <motion.tr
      className={className}
      animate={isShaking ? {
        x: [0, -6, 6, -6, 6, -3, 3, 0],
        backgroundColor: [
          'rgba(255, 255, 255, 0.05)',
          'rgba(34, 197, 94, 0.3)',
          'rgba(255, 255, 255, 0.05)',
          'rgba(34, 197, 94, 0.3)',
          'rgba(255, 255, 255, 0.05)',
          'rgba(34, 197, 94, 0.2)',
          'rgba(255, 255, 255, 0.05)',
          'rgba(255, 255, 255, 0.05)'
        ],
        boxShadow: [
          'none',
          '0 0 20px rgba(34, 197, 94, 0.3)',
          'none',
          '0 0 20px rgba(34, 197, 94, 0.3)',
          'none',
          '0 0 15px rgba(34, 197, 94, 0.2)',
          'none',
          'none'
        ],
        transition: {
          duration: 0.3,
          ease: "easeInOut"
        }
      } : {}}
    >
      {children}
    </motion.tr>
  );
}
