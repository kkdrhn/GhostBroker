import React from 'react';
import { useGhostStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';

const BlockCounter: React.FC = () => {
  const { blockNumber, tps } = useGhostStore();

  return (
    <div className="flex items-center gap-4 text-xs font-mono">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-ghost-green pulse-green" />
        <span className="text-muted-foreground">BLK</span>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={blockNumber}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-foreground font-bold tabular-nums"
          >
            {blockNumber > 0 ? blockNumber.toLocaleString() : '—'}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">TPS</span>
        <span className="text-ghost-cyan font-bold tabular-nums">
          {tps > 0 ? tps : '—'}
        </span>
      </div>
    </div>
  );
};

export default BlockCounter;
