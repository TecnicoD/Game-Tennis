import React from 'react';

interface MenuProps {
  onStart: () => void;
}

export const Menu: React.FC<MenuProps> = ({ onStart }) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white">
      <div className="bg-gray-800 p-8 rounded-2xl border-4 border-blue-500 shadow-2xl max-w-md w-full text-center">
        <h1 className="font-arcade text-4xl mb-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
          TENNIS PRO
        </h1>
        <p className="text-gray-400 text-sm mb-8 tracking-wider">REAL PHYSICS TENNIS</p>

        <div className="grid grid-cols-2 gap-6 mb-8 text-left">
          <div className="bg-gray-900 p-4 rounded border border-gray-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1 bg-blue-600 text-xs font-bold">P1</div>
            <h3 className="text-blue-400 font-bold mb-2 border-b border-gray-700 pb-1">CONTROLS</h3>
            <div className="text-sm space-y-2 text-gray-300">
              <p><span className="inline-block w-6 font-bold text-white bg-gray-700 text-center rounded">W</span> <span className="inline-block w-6 font-bold text-white bg-gray-700 text-center rounded">A</span> <span className="inline-block w-6 font-bold text-white bg-gray-700 text-center rounded">S</span> <span className="inline-block w-6 font-bold text-white bg-gray-700 text-center rounded">D</span></p>
              <p className="text-xs text-gray-500">MOVE</p>
              <p><span className="px-2 py-1 font-bold text-white bg-blue-600 rounded text-xs">SPACE</span></p>
              <p className="text-xs text-gray-500">SWING / SERVE</p>
            </div>
          </div>

          <div className="bg-gray-900 p-4 rounded border border-gray-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1 bg-red-600 text-xs font-bold">P2</div>
            <h3 className="text-red-400 font-bold mb-2 border-b border-gray-700 pb-1">CONTROLS</h3>
            <div className="text-sm space-y-2 text-gray-300">
              <p><span className="inline-block w-6 font-bold text-white bg-gray-700 text-center rounded">↑</span> <span className="inline-block w-6 font-bold text-white bg-gray-700 text-center rounded">←</span> <span className="inline-block w-6 font-bold text-white bg-gray-700 text-center rounded">↓</span> <span className="inline-block w-6 font-bold text-white bg-gray-700 text-center rounded">→</span></p>
              <p className="text-xs text-gray-500">MOVE</p>
              <p><span className="px-2 py-1 font-bold text-white bg-red-600 rounded text-xs">ENTER</span></p>
              <p className="text-xs text-gray-500">SWING / SERVE</p>
            </div>
          </div>
        </div>

        <div className="mb-6 text-sm text-gray-300 bg-gray-700/50 p-3 rounded">
           <p className="mb-1">⚡ <strong>HOW TO PLAY</strong> ⚡</p>
           <ul className="list-disc list-inside text-xs text-left pl-4 space-y-1">
             <li>Press <span className="text-yellow-400">SWING</span> to Serve.</li>
             <li>Move to the ball and press <span className="text-yellow-400">SWING</span> to hit.</li>
             <li>Aim with movement keys while hitting.</li>
             <li>Don't let it bounce twice!</li>
           </ul>
        </div>

        <button
          onClick={onStart}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded font-bold text-xl hover:scale-105 transition-transform shadow-lg hover:shadow-blue-500/50"
        >
          ENTER COURT
        </button>
      </div>
    </div>
  );
};