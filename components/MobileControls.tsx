import React from 'react';
import { KEYS } from '../constants';

interface MobileControlsProps {
  onInput: (key: string, pressed: boolean) => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ onInput }) => {
  
  const handlePointerDown = (e: React.PointerEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    onInput(key, true);
  };

  const handlePointerUp = (e: React.PointerEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    onInput(key, false);
  };

  const Btn = ({ k, label, className }: { k: string, label: string | React.ReactNode, className: string }) => (
    <button
      className={`absolute flex items-center justify-center rounded-full backdrop-blur-sm select-none touch-none active:scale-95 transition-transform shadow-lg border border-white/20 outline-none ${className}`}
      onPointerDown={(e) => handlePointerDown(e, k)}
      onPointerUp={(e) => handlePointerUp(e, k)}
      onPointerLeave={(e) => handlePointerUp(e, k)}
      onContextMenu={(e) => e.preventDefault()}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {label}
    </button>
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-40 flex flex-col justify-end pb-8 px-4 select-none">
      <div className="flex justify-between items-end w-full max-w-4xl mx-auto pointer-events-auto">
        
        {/* D-PAD (Left) */}
        <div className="relative w-40 h-40 bg-gray-900/30 rounded-full border border-white/10 backdrop-blur-sm mb-2">
          <Btn k={KEYS.P1_UP} label="▲" className="top-2 left-1/2 -translate-x-1/2 w-12 h-12 bg-white/20 text-white" />
          <Btn k={KEYS.P1_DOWN} label="▼" className="bottom-2 left-1/2 -translate-x-1/2 w-12 h-12 bg-white/20 text-white" />
          <Btn k={KEYS.P1_LEFT} label="◀" className="left-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 text-white" />
          <Btn k={KEYS.P1_RIGHT} label="▶" className="right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 text-white" />
          
          {/* Center Helper (Visual only) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/10" />
        </div>

        {/* ACTIONS (Right) */}
        {/* mb lo subís o bajás*/}
        <div className="relative mb-24 mr-16">
           <Btn 
             k={KEYS.P1_SWING} 
             label={<span className="font-arcade tracking-widest">HIT</span>} 
             className="w-30 h-24 bg-blue-600/60 text-white font-bold text-xl border-blue-100 active:bg-blue-500 shadow-blue-900/50" 
           />
        </div>

      </div>
    </div>
  );
};
