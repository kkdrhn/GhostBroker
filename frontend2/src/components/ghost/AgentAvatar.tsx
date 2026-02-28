import React from 'react';
import type { RiskDNA } from '@/types';

interface AgentAvatarProps {
  riskDNA: RiskDNA;
  size?: number;
  className?: string;
}

const AgentAvatar: React.FC<AgentAvatarProps> = ({ riskDNA, size = 48, className = '' }) => {
  const { riskAppetite, strategy } = riskDNA;

  // Deterministic colors based on risk DNA
  const hue = strategy === 'aggressive' ? 0 : strategy === 'balanced' ? 263 : 210;
  const saturation = 70 + riskAppetite * 0.2;
  const baseColor = `hsl(${hue}, ${saturation}%, 55%)`;
  const accentColor = `hsl(${(hue + 40) % 360}, ${saturation}%, 45%)`;
  const bgColor = `hsl(${hue}, ${saturation * 0.3}%, 12%)`;

  // Shape morphing based on risk appetite
  const sharpness = riskAppetite / 100;
  const r1 = size * 0.35 * (1 - sharpness * 0.3);
  const r2 = size * 0.2 * (1 + sharpness * 0.5);
  const points = strategy === 'aggressive' ? 6 : strategy === 'balanced' ? 8 : 12;

  const generateShape = () => {
    const cx = size / 2;
    const cy = size / 2;
    const path: string[] = [];

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? r1 : r2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      path.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }
    path.push('Z');
    return path.join(' ');
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
    >
      <defs>
        <radialGradient id={`grad-${riskAppetite}-${strategy}`} cx="30%" cy="30%">
          <stop offset="0%" stopColor={baseColor} stopOpacity="0.9" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0.6" />
        </radialGradient>
      </defs>
      <rect width={size} height={size} rx={size * 0.15} fill={bgColor} />
      <path
        d={generateShape()}
        fill={`url(#grad-${riskAppetite}-${strategy})`}
        stroke={baseColor}
        strokeWidth="1"
        opacity="0.9"
      />
      {/* Inner detail */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size * 0.08}
        fill={baseColor}
        opacity="0.8"
      />
    </svg>
  );
};

export default AgentAvatar;
