import type { PowerupType, LeaderboardEntry } from '../../types/index.js';

interface PowerupBarProps {
  powerups: Record<PowerupType, number>;
  players: LeaderboardEntry[];
  currentPlayerId: string;
  swapModeActive: boolean;
  onUse: (powerup: PowerupType) => void;
}

interface PowerupConfig {
  type: PowerupType;
  label: string;
  icon: string;
  description: string;
}

const POWERUPS: PowerupConfig[] = [
  { type: 'peek',      label: 'Peek',      icon: '👁',  description: 'Fade tiles transparent 2.5s — full-size image shows through' },
  { type: 'swap',      label: 'Swap',      icon: '🔄',  description: 'Click any two tiles to swap them — no adjacency required'   },
  { type: 'freeze',    label: 'Freeze',    icon: '🧊',  description: 'Pause your scoring timer for 5s'                            },
  { type: 'reshuffle', label: 'Reshuffle', icon: '🔀',  description: 'Reshuffle your board for an easier layout'                  },
  { type: 'scramble',  label: 'Scramble',  icon: '🌀',  description: 'Scramble an opponent\'s board (+5 move penalty)'            },
];

export function PowerupBar({ powerups, swapModeActive, onUse }: PowerupBarProps) {
  return (
    <div className="flex gap-2 justify-center flex-wrap">
      {POWERUPS.map((pu) => {
        const count = powerups[pu.type] ?? 0;
        const disabled = count <= 0;
        const isActive = pu.type === 'swap' && swapModeActive;

        return (
          <button
            key={pu.type}
            onClick={() => { if (!disabled) onUse(pu.type); }}
            disabled={disabled}
            title={pu.description}
            className={[
              'flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all select-none',
              isActive
                ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300 scale-105'
                : disabled
                ? 'border-gray-700 bg-gray-800/50 text-gray-600 cursor-not-allowed'
                : 'border-indigo-400/50 bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-200 cursor-pointer active:scale-95',
            ].join(' ')}
          >
            <span className="text-xl leading-none">{pu.icon}</span>
            <span className="text-xs font-semibold">{pu.label}</span>
            <span className={[
              'text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center',
              isActive ? 'bg-yellow-400 text-gray-900' : disabled ? 'bg-gray-700 text-gray-500' : 'bg-indigo-500 text-white',
            ].join(' ')}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
