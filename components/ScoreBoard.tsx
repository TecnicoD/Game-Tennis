import React from 'react';
import { PlayerState } from '../types';

interface ScoreBoardProps {
  player1: PlayerState;
  player2: PlayerState;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ player1, player2 }) => {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900/90 border-2 border-white text-white p-4 rounded-lg shadow-xl z-10 flex items-center gap-8 min-w-[300px] justify-center">
      
      {/* Player 1 */}
      <div className="flex flex-col items-center">
        <span className="text-blue-400 font-bold text-sm tracking-widest">PLAYER 1</span>
        <div className="flex items-end gap-2 mt-1">
          <span className="font-arcade text-3xl text-yellow-400">{player1.score}</span>
          <span className="text-xs text-gray-400 mb-1">GAMES: {player1.sets}</span>
        </div>
      </div>

      <div className="h-10 w-px bg-gray-600"></div>

      {/* Player 2 */}
      <div className="flex flex-col items-center">
        <span className="text-red-400 font-bold text-sm tracking-widest">PLAYER 2</span>
        <div className="flex items-end gap-2 mt-1">
          <span className="font-arcade text-3xl text-yellow-400">{player2.score}</span>
          <span className="text-xs text-gray-400 mb-1">GAMES: {player2.sets}</span>
        </div>
      </div>

    </div>
  );
};
