import React from 'react';
import type { LifecycleEvent } from '@/types';
import { cn } from '@/lib/utils';

interface LifecycleTimelineProps {
  events: LifecycleEvent[];
  className?: string;
}

const eventConfig: Record<string, { icon: string; color: string }> = {
  CREATED: { icon: '🔮', color: 'bg-primary' },
  ELITE_PROMOTION: { icon: '👑', color: 'bg-ghost-gold' },
  BANKRUPTCY: { icon: '💀', color: 'bg-ghost-red' },
  REVIVAL: { icon: '⚡', color: 'bg-ghost-cyan' },
  PARTNERSHIP: { icon: '🔗', color: 'bg-primary' },
};

const LifecycleTimeline: React.FC<LifecycleTimelineProps> = ({ events, className }) => {
  return (
    <div className={cn('relative', className)}>
      <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-4">
        Lifecycle Events
      </div>
      <div className="relative">
        {/* Line */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
        {events.map((event, i) => {
          const config = eventConfig[event.type] || eventConfig.CREATED;
          return (
            <div key={i} className="relative flex items-start gap-4 pb-6 last:pb-0">
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs z-10 shrink-0', config.color)}>
                {config.icon}
              </div>
              <div className="flex-1 pt-0.5">
                <div className="text-sm font-bold text-foreground">{event.type.replace('_', ' ')}</div>
                <div className="text-xs text-muted-foreground">{event.details}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Block #{event.block} • {new Date(event.timestamp).toLocaleDateString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LifecycleTimeline;
