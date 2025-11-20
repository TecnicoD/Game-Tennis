import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  COURT_COLOR, 
  DIMENSIONS, 
  KEYS, 
  PLAYER_RADIUS, 
  BALL_RADIUS,
  BALL_COLOR,
  GRAVITY,
  NET_HEIGHT,
  NET_Y,
  SWING_DURATION,
  HIT_RANGE,
  HIT_HEIGHT_LIMIT,
  INITIAL_BALL_SPEED,
  BOUNCE_DAMPING,
  FRICTION
} from '../constants';
import { GameStatus, PlayerState, BallState, KeyState } from '../types';
import { updateScore } from '../utils/scoring';
import { ScoreBoard } from './ScoreBoard';
import { Menu } from './Menu';

// --- HELPERS ---

const isBallInBounds = (x: number, y: number) => {
  const margin = DIMENSIONS.courtMargin;
  const singlesMargin = 60;
  const minX = margin + singlesMargin;
  const maxX = CANVAS_WIDTH - margin - singlesMargin;
  const minY = margin;
  const maxY = CANVAS_HEIGHT - margin;
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
};

const drawCourt = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = COURT_COLOR;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 6;

  const margin = DIMENSIONS.courtMargin;
  const singlesMargin = 60;

  // Doubles Alleys
  ctx.strokeRect(margin, margin, CANVAS_WIDTH - margin * 2, CANVAS_HEIGHT - margin * 2);

  // Singles Lines
  ctx.beginPath();
  ctx.moveTo(margin + singlesMargin, margin);
  ctx.lineTo(margin + singlesMargin, CANVAS_HEIGHT - margin);
  ctx.moveTo(CANVAS_WIDTH - margin - singlesMargin, margin);
  ctx.lineTo(CANVAS_WIDTH - margin - singlesMargin, CANVAS_HEIGHT - margin);
  ctx.stroke();

  // Service Box
  const serviceLineOffset = CANVAS_HEIGHT / 4;
  ctx.beginPath();
  ctx.moveTo(margin + singlesMargin, margin + serviceLineOffset);
  ctx.lineTo(CANVAS_WIDTH - margin - singlesMargin, margin + serviceLineOffset);
  ctx.moveTo(margin + singlesMargin, CANVAS_HEIGHT - margin - serviceLineOffset);
  ctx.lineTo(CANVAS_WIDTH - margin - singlesMargin, CANVAS_HEIGHT - margin - serviceLineOffset);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH / 2, margin + serviceLineOffset);
  ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT - margin - serviceLineOffset);
  ctx.stroke();

  // Net Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(margin - 20, NET_Y - 5, CANVAS_WIDTH - (margin - 20) * 2, 10);
};

const drawNet = (ctx: CanvasRenderingContext2D) => {
  const margin = DIMENSIONS.courtMargin;
  ctx.fillStyle = '#333';
  ctx.fillRect(margin - 30, NET_Y - 10, 10, 20);
  ctx.fillRect(CANVAS_WIDTH - margin + 20, NET_Y - 10, 10, 20);

  ctx.beginPath();
  ctx.moveTo(margin - 20, NET_Y);
  ctx.lineTo(CANVAS_WIDTH - margin + 20, NET_Y);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 4;
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
};

export const TennisGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // UI State
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");

  // Logic Refs
  const keys = useRef<KeyState>({});
  const servingPlayer = useRef<1 | 2>(1);
  
  // Initial positions
  const initP1: PlayerState = {
    pos: { x: CANVAS_WIDTH / 2, y: 100 },
    velocity: { x: 0, y: 0 },
    score: '0',
    sets: 0,
    id: 1,
    name: 'Player 1',
    isSwinging: false,
    swingProgress: 0
  };

  const initP2: PlayerState = {
    pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 100 },
    velocity: { x: 0, y: 0 },
    score: '0',
    sets: 0,
    id: 2,
    name: 'Player 2',
    isSwinging: false,
    swingProgress: 0
  };

  const initBall: BallState = {
    pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    z: 0,
    velocity: { x: 0, y: 0 },
    vz: 0,
    speed: 0,
    lastHitter: null,
    bounceCount: 0
  };

  const p1Ref = useRef<PlayerState>({ ...initP1 });
  const p2Ref = useRef<PlayerState>({ ...initP2 });
  const ballRef = useRef<BallState>({ ...initBall });

  // React State for UI
  const [p1ScoreState, setP1ScoreState] = useState(initP1);
  const [p2ScoreState, setP2ScoreState] = useState(initP2);

  // --- INPUT ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- GAMEPLAY ---

  const resetBallToServe = useCallback((server: 1 | 2) => {
    const serverObj = server === 1 ? p1Ref.current : p2Ref.current;
    ballRef.current.speed = 0;
    ballRef.current.velocity = { x: 0, y: 0 };
    ballRef.current.vz = 0;
    ballRef.current.z = 20;
    ballRef.current.bounceCount = 0;
    ballRef.current.lastHitter = null;
    ballRef.current.pos.x = serverObj.pos.x + 20;
    ballRef.current.pos.y = serverObj.pos.y + (server === 1 ? 20 : -20);
  }, []);

  const startPoint = useCallback((server: 1 | 2) => {
    servingPlayer.current = server;
    
    p1Ref.current.pos = { x: CANVAS_WIDTH / 2, y: 80 };
    p2Ref.current.pos = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 80 };
    p1Ref.current.isSwinging = false;
    p2Ref.current.isSwinging = false;
    
    resetBallToServe(server);

    setGameStatus(GameStatus.SERVING);
    setMessage(`${server === 1 ? "PLAYER 1" : "PLAYER 2"} SERVE`);
  }, [resetBallToServe]);

  const handlePointEnd = useCallback((winnerId: 1 | 2, reason: string) => {
    setGameStatus(GameStatus.POINT_ENDED);
    setMessage(`${reason} - ${winnerId === 1 ? 'P1' : 'P2'} WINS POINT`);

    const winner = winnerId === 1 ? p1Ref.current : p2Ref.current;
    const loser = winnerId === 1 ? p2Ref.current : p1Ref.current;
    
    const result = updateScore(winner, loser);
    
    p1Ref.current.score = result.p1Score;
    p2Ref.current.score = result.p2Score;
    p1Ref.current.sets = result.p1Games;
    p2Ref.current.sets = result.p2Games;

    setP1ScoreState({ ...p1Ref.current });
    setP2ScoreState({ ...p2Ref.current });

    if (result.winnerId) {
      setWinnerId(result.winnerId);
      setGameStatus(GameStatus.GAME_OVER);
    } else {
      setTimeout(() => {
        startPoint(winnerId);
      }, 2000);
    }
  }, [startPoint]);

  const updatePhysics = useCallback(() => {
    const ball = ballRef.current;

    // 1. Player Movement & Swing
    [p1Ref.current, p2Ref.current].forEach(p => {
      const isP1 = p.id === 1;
      const up = isP1 ? KEYS.P1_UP : KEYS.P2_UP;
      const down = isP1 ? KEYS.P1_DOWN : KEYS.P2_DOWN;
      const left = isP1 ? KEYS.P1_LEFT : KEYS.P2_LEFT;
      const right = isP1 ? KEYS.P1_RIGHT : KEYS.P2_RIGHT;
      const swingKey = isP1 ? KEYS.P1_SWING : KEYS.P2_SWING;

      let dx = 0; let dy = 0;
      const moveSpeed = 6;

      if (keys.current[up]) dy -= moveSpeed;
      if (keys.current[down]) dy += moveSpeed;
      if (keys.current[left]) dx -= moveSpeed;
      if (keys.current[right]) dx += moveSpeed;

      if (dx !== 0 && dy !== 0) {
        dx *= 0.707; dy *= 0.707;
      }

      p.pos.x += dx;
      p.pos.y += dy;

      p.pos.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, p.pos.x));
      if (isP1) {
         p.pos.y = Math.max(PLAYER_RADIUS, Math.min(NET_Y - 50, p.pos.y));
      } else {
         p.pos.y = Math.max(NET_Y + 50, Math.min(CANVAS_HEIGHT - PLAYER_RADIUS, p.pos.y));
      }

      // Swing Start
      if (keys.current[swingKey] && !p.isSwinging) {
        p.isSwinging = true;
        p.swingProgress = 0;
        
        // Serve TOSS
        if (gameStatus === GameStatus.SERVING && servingPlayer.current === p.id && ball.speed === 0) {
           // Only toss if holding ball (speed 0)
           setGameStatus(GameStatus.PLAYING);
           ball.vz = 13; // High Toss
           ball.z = 40;
           ball.velocity.x = 0; // Toss straight up
           ball.velocity.y = 0;
           ball.lastHitter = p.id; 
           setMessage("");
        }
      }

      if (p.isSwinging) {
        p.swingProgress += 1 / SWING_DURATION;
        if (p.swingProgress >= 1) {
          p.isSwinging = false;
          p.swingProgress = 0;
        }
      }
    });

    // Stick ball to server if not tossed yet
    if (gameStatus === GameStatus.SERVING) {
      const server = servingPlayer.current === 1 ? p1Ref.current : p2Ref.current;
      ball.pos.x = server.pos.x + 20;
      ball.pos.y = server.pos.y + (server.id === 1 ? 20 : -20);
      return;
    }

    if (gameStatus !== GameStatus.PLAYING) return;

    // 2. Ball Physics
    ball.vz -= GRAVITY;
    ball.z += ball.vz;
    ball.pos.x += ball.velocity.x;
    ball.pos.y += ball.velocity.y;
    ball.velocity.x *= FRICTION;
    ball.velocity.y *= FRICTION;

    // Net Collision
    const prevY = ball.pos.y - ball.velocity.y;
    if ((prevY < NET_Y && ball.pos.y >= NET_Y) || (prevY > NET_Y && ball.pos.y <= NET_Y)) {
       if (ball.z < NET_HEIGHT) {
          ball.velocity.y *= -0.3;
          ball.velocity.x *= 0.3;
          ball.pos.y = prevY; 
       }
    }

    // Ground Bounce
    if (ball.z <= 0) {
      ball.z = 0;
      ball.vz = -ball.vz * BOUNCE_DAMPING;
      
      // Special Case: Missed Serve Toss
      if (ball.speed === 0 && ball.velocity.x === 0 && ball.velocity.y === 0 && ball.bounceCount === 0) {
          // If it fell straight down (Toss) and wasn't hit
          // We reset it to hand for ease of use
          setGameStatus(GameStatus.SERVING);
          setMessage("TRY AGAIN");
          resetBallToServe(servingPlayer.current);
          return;
      }

      if (ball.vz < 2) ball.vz = 0;
      ball.bounceCount++;

      const inBounds = isBallInBounds(ball.pos.x, ball.pos.y);

      if (ball.bounceCount === 1 && !inBounds) {
          // If serving, maybe allow a second serve? For arcade, just point to opponent.
          const winner = ball.lastHitter === 1 ? 2 : 1;
          handlePointEnd(winner, "OUT");
          return;
      } else if (ball.bounceCount >= 2) {
         if (ball.lastHitter) {
           handlePointEnd(ball.lastHitter, "DOUBLE BOUNCE");
         }
         return;
      }
    }

    // 3. Hit Detection
    [p1Ref.current, p2Ref.current].forEach(p => {
      // Generous swing window: from 10% to 70% of animation
      if (p.isSwinging && p.swingProgress > 0.1 && p.swingProgress < 0.7) { 
        const dx = ball.pos.x - p.pos.x;
        const dy = ball.pos.y - p.pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // Check distance and height
        if (dist < HIT_RANGE && ball.z < HIT_HEIGHT_LIMIT) {
          // Don't hit if already hit this swing
          if (ball.lastHitter === p.id && ball.bounceCount === 0 && ball.speed > 0) return;

          // --- AIMING LOGIC ---
          const isP1 = p.id === 1;
          
          // Default Target: Deep center of opponent court
          let targetX = CANVAS_WIDTH / 2;
          let targetY = isP1 ? CANVAS_HEIGHT - 100 : 100;
          
          // Input Mods
          const up = isP1 ? keys.current[KEYS.P1_UP] : keys.current[KEYS.P2_UP];
          const down = isP1 ? keys.current[KEYS.P1_DOWN] : keys.current[KEYS.P2_DOWN];
          const left = isP1 ? keys.current[KEYS.P1_LEFT] : keys.current[KEYS.P2_LEFT];
          const right = isP1 ? keys.current[KEYS.P1_RIGHT] : keys.current[KEYS.P2_RIGHT];

          // Left/Right aims to corners
          if (left) targetX -= 250;
          if (right) targetX += 250;

          // Up hits deeper/flatter, Down hits shorter/lob
          let shotSpeed = INITIAL_BALL_SPEED;
          let shotArc = 8; // Base upward velocity

          if (up) {
            // Smash / Drive
            shotSpeed += 4;
            shotArc = 5; 
            // Aim deeper/limit net clips
            targetY = isP1 ? CANVAS_HEIGHT - 50 : 50;
          } else if (down) {
            // Lob / Drop
            shotSpeed -= 3;
            shotArc = 14; // High arc
            // Aim shorter
            targetY = isP1 ? NET_Y + 200 : NET_Y - 200;
          }

          // Calculate Vector
          const angle = Math.atan2(targetY - ball.pos.y, targetX - ball.pos.x);
          
          ball.velocity.x = Math.cos(angle) * shotSpeed;
          ball.velocity.y = Math.sin(angle) * shotSpeed;
          ball.vz = shotArc;
          ball.speed = shotSpeed;

          ball.lastHitter = p.id;
          ball.bounceCount = 0;
        }
      }
    });

  }, [gameStatus, handlePointEnd, resetBallToServe]);

  // --- RENDER ---
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawCourt(ctx);

    // Players
    [p1Ref.current, p2Ref.current].forEach(p => {
      // Shadow
      ctx.beginPath();
      ctx.ellipse(p.pos.x, p.pos.y, PLAYER_RADIUS, PLAYER_RADIUS * 0.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();

      // Body
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y - 10, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = p.id === 1 ? '#3b82f6' : '#ef4444';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Racket
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y - 15);
      
      let rotation = 0;
      if (p.isSwinging) {
         // Visual swing
         const swingArc = Math.PI * 1.5;
         const startAngle = p.id === 1 ? -Math.PI/2 : Math.PI/2;
         const dir = p.id === 1 ? 1 : -1;
         rotation = startAngle + (Math.sin(p.swingProgress * Math.PI) * swingArc * dir);
      } else {
         rotation = p.id === 1 ? Math.PI / 4 : -Math.PI / 4 * 3;
      }
      ctx.rotate(rotation);
      
      // Handle
      ctx.fillStyle = '#a16207';
      ctx.fillRect(-2, 0, 4, 30);
      // Head
      ctx.beginPath();
      ctx.ellipse(0, 45, 20, 25, 0, 0, Math.PI*2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fbbf24';
      ctx.stroke();
      // Visual cue for "Swing Active"
      if (p.isSwinging && p.swingProgress > 0.1 && p.swingProgress < 0.7) {
         ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
      } else {
         ctx.fillStyle = 'rgba(0,0,0,0.1)';
      }
      ctx.fill();
      ctx.restore();
    });

    drawNet(ctx);

    // Ball
    const b = ballRef.current;
    
    // Ball Shadow
    const shadowScale = Math.max(0, 1 - b.z / 200);
    ctx.beginPath();
    ctx.ellipse(b.pos.x, b.pos.y, BALL_RADIUS * shadowScale * 1.2, BALL_RADIUS * shadowScale * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();

    // Ball
    const scale = 1 + (b.z / 500);
    const drawY = b.pos.y - b.z;
    
    ctx.beginPath();
    ctx.arc(b.pos.x, drawY, BALL_RADIUS * scale, 0, Math.PI * 2);
    ctx.fillStyle = BALL_COLOR;
    ctx.fill();
    ctx.strokeStyle = '#365314';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(b.pos.x - 3*scale, drawY - 3*scale, BALL_RADIUS/3 * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
    
    if (message) {
       ctx.fillStyle = 'rgba(0,0,0,0.5)';
       ctx.fillRect(0, CANVAS_HEIGHT/2 - 60, CANVAS_WIDTH, 120);
       ctx.fillStyle = '#fbbf24';
       ctx.font = 'bold 50px "Press Start 2P"';
       ctx.textAlign = 'center';
       ctx.textBaseline = 'middle';
       ctx.fillText(message, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
    }

  }, [message]);

  // Loop
  useEffect(() => {
    const loop = () => {
      updatePhysics();
      render();
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [updatePhysics, render]);

  const startGame = () => {
    setP1ScoreState({ ...initP1 });
    setP2ScoreState({ ...initP2 });
    p1Ref.current = { ...initP1 };
    p2Ref.current = { ...initP2 };
    setWinnerId(null);
    setGameStatus(GameStatus.SERVING);
    startPoint(1);
  };

  return (
    <div className="relative w-full h-screen bg-neutral-900 flex justify-center items-center overflow-hidden">
      {gameStatus === GameStatus.MENU && <Menu onStart={startGame} />}
      
      {gameStatus === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white">
          <h1 className="font-arcade text-6xl text-yellow-400 mb-4">MATCH OVER</h1>
          <p className="text-3xl mb-10 text-blue-200 font-bold">
            {winnerId === 1 ? 'PLAYER 1' : 'PLAYER 2'} WINS!
          </p>
          <button 
            onClick={() => setGameStatus(GameStatus.MENU)}
            className="px-8 py-4 bg-white text-black font-bold rounded hover:bg-gray-200 text-xl"
          >
            MAIN MENU
          </button>
        </div>
      )}

      <ScoreBoard player1={p1ScoreState} player2={p2ScoreState} />
      
      <div className="relative shadow-2xl rounded-lg overflow-hidden border-8 border-gray-800" style={{ height: '90vh', aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain bg-[#3b82f6]"
        />
      </div>
    </div>
  );
};