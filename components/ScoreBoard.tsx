
import React from 'react';
import { PlayerState } from '../types';

interface ScoreBoardProps {
  player1: PlayerState;
  player2: PlayerState;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ player1, player2 }) => {
  return (
    // Changed positioning to "top-2" and added a wider, lower profile container
    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-[95%] max-w-2xl flex justify-between items-center bg-black/60 backdrop-blur-sm border border-white/20 rounded-full px-8 py-2 shadow-lg z-20 pointer-events-none select-none">
      
      {/* Player 1 (Blue) */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-blue-400 font-bold text-xs tracking-widest">PLAYER 1</div>
          <div className="text-gray-400 text-[10px]">GAMES: {player1.sets}</div>
        </div>
        <div className="font-arcade text-3xl text-yellow-400 w-12 text-center">
          {player1.score}
        </div>
      </div>

      {/* Divider / Net Icon */}
      <div className="h-8 w-px bg-white/30"></div>

      {/* Player 2 (Red) */}
      <div className="flex items-center gap-4 flex-row-reverse">
        <div className="text-left">
          <div className="text-red-400 font-bold text-xs tracking-widest">{player2.name.toUpperCase()}</div>
          <div className="text-gray-400 text-[10px]">GAMES: {player2.sets}</div>
        </div>
        <div className="font-arcade text-3xl text-yellow-400 w-12 text-center">
          {player2.score}
        </div>
      </div>

    </div>
  );
};
