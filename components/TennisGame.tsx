
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
import { GameStatus, PlayerState, BallState, KeyState, GameMode } from '../types';
import { updateScore } from '../utils/scoring';
import { ScoreBoard } from './ScoreBoard';
import { Menu } from './Menu';
import { MobileControls } from './MobileControls';

/**
 * --- UTILS & HELPERS ---
 */

// Determines if a coordinate is inside the singles lines
const isBallInBounds = (x: number, y: number) => {
  const margin = DIMENSIONS.courtMargin;
  const singlesMargin = 60; // Standard Singles width
  const minX = margin + singlesMargin;
  const maxX = CANVAS_WIDTH - margin - singlesMargin;
  const minY = margin;
  const maxY = CANVAS_HEIGHT - margin;
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
};

// Drawing the Tennis Court (Static elements)
const drawCourt = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = COURT_COLOR;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 6;

  const margin = DIMENSIONS.courtMargin;
  const singlesMargin = 60;

  // Doubles Alleys (Outer Box)
  ctx.strokeRect(margin, margin, CANVAS_WIDTH - margin * 2, CANVAS_HEIGHT - margin * 2);

  // Singles Side Lines
  ctx.beginPath();
  ctx.moveTo(margin + singlesMargin, margin);
  ctx.lineTo(margin + singlesMargin, CANVAS_HEIGHT - margin);
  ctx.moveTo(CANVAS_WIDTH - margin - singlesMargin, margin);
  ctx.lineTo(CANVAS_WIDTH - margin - singlesMargin, CANVAS_HEIGHT - margin);
  ctx.stroke();

  // Service Box Lines
  const serviceLineOffset = CANVAS_HEIGHT / 4;
  ctx.beginPath();
  // Top Service Line
  ctx.moveTo(margin + singlesMargin, margin + serviceLineOffset);
  ctx.lineTo(CANVAS_WIDTH - margin - singlesMargin, margin + serviceLineOffset);
  // Bottom Service Line
  ctx.moveTo(margin + singlesMargin, CANVAS_HEIGHT - margin - serviceLineOffset);
  ctx.lineTo(CANVAS_WIDTH - margin - singlesMargin, CANVAS_HEIGHT - margin - serviceLineOffset);
  ctx.stroke();

  // Center Service Line
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH / 2, margin + serviceLineOffset);
  ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT - margin - serviceLineOffset);
  ctx.stroke();

  // Net Shadow (for depth perception)
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(margin - 20, NET_Y - 5, CANVAS_WIDTH - (margin - 20) * 2, 10);
};

// Drawing the Net (Dynamic height visualization)
const drawNet = (ctx: CanvasRenderingContext2D) => {
  const margin = DIMENSIONS.courtMargin;
  // Net Posts
  ctx.fillStyle = '#333';
  ctx.fillRect(margin - 30, NET_Y - 10, 10, 20);
  ctx.fillRect(CANVAS_WIDTH - margin + 20, NET_Y - 10, 10, 20);

  // Net Mesh
  ctx.beginPath();
  ctx.moveTo(margin - 20, NET_Y);
  ctx.lineTo(CANVAS_WIDTH - margin + 20, NET_Y);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 4;
  ctx.setLineDash([5, 5]); // Dashed line effect
  ctx.stroke();
  ctx.setLineDash([]);
};

/**
 * --- MAIN COMPONENT ---
 */
export const TennisGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // --- REACT STATE (For UI Only) ---
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");
  const [gameMode, setGameMode] = useState<GameMode>('PVP');

  // --- REF STATE (For High-Speed Game Loop) ---
  // We use refs instead of state for physics to avoid React re-render cycles 
  // slowing down the 60FPS loop.
  const keys = useRef<KeyState>({});
  const servingPlayer = useRef<1 | 2>(1);
  
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
    bounceCount: 0,
    hasCrossedNet: false,
    lastBounceSide: null
  };

  const p1Ref = useRef<PlayerState>({ ...initP1 });
  const p2Ref = useRef<PlayerState>({ ...initP2 });
  const ballRef = useRef<BallState>({ ...initBall });

  // Syncing Score for UI
  const [p1ScoreState, setP1ScoreState] = useState(initP1);
  const [p2ScoreState, setP2ScoreState] = useState(initP2);

  // --- INPUT HANDLERS ---
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

  const handleManualInput = useCallback((key: string, pressed: boolean) => {
    keys.current[key] = pressed;
  }, []);

  // --- GAME LOGIC FUNCTIONS ---

  // 1. Reset Ball to Server's Hand
  const resetBallToServe = useCallback((server: 1 | 2) => {
    const serverObj = server === 1 ? p1Ref.current : p2Ref.current;
    ballRef.current.speed = 0;
    ballRef.current.velocity = { x: 0, y: 0 };
    ballRef.current.vz = 0;
    ballRef.current.z = 20; // Holding height
    ballRef.current.bounceCount = 0;
    ballRef.current.lastHitter = null;
    ballRef.current.hasCrossedNet = false;
    ballRef.current.lastBounceSide = null;
    
    // Position slightly to the side of player
    ballRef.current.pos.x = serverObj.pos.x + 20;
    ballRef.current.pos.y = serverObj.pos.y + (server === 1 ? 20 : -20);
  }, []);

  // 2. Start a New Point
  const startPoint = useCallback((server: 1 | 2) => {
    servingPlayer.current = server;
    
    // Reset Positions
    p1Ref.current.pos = { x: CANVAS_WIDTH / 2, y: 80 };
    p2Ref.current.pos = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 80 };
    p1Ref.current.isSwinging = false;
    p2Ref.current.isSwinging = false;
    
    resetBallToServe(server);

    setGameStatus(GameStatus.SERVING);
    const p1Name = "PLAYER 1";
    const p2Name = p2Ref.current.name === "CPU" ? "CPU" : "PLAYER 2";
    setMessage(`${server === 1 ? p1Name : p2Name} SERVE`);
  }, [resetBallToServe]);

  // 3. Handle Point End
  const handlePointEnd = useCallback((winnerId: 1 | 2, reason: string) => {
    setGameStatus(GameStatus.POINT_ENDED);
    
    const winnerName = winnerId === 1 ? "P1" : (p2Ref.current.name === "CPU" ? "CPU" : "P2");
    setMessage(`${reason}`);

    // Calculate Score
    const winner = winnerId === 1 ? p1Ref.current : p2Ref.current;
    const loser = winnerId === 1 ? p2Ref.current : p1Ref.current;
    const result = updateScore(winner, loser);
    
    // Update Refs
    p1Ref.current.score = result.p1Score;
    p2Ref.current.score = result.p2Score;
    p1Ref.current.sets = result.p1Games;
    p2Ref.current.sets = result.p2Games;

    // Update UI State
    setP1ScoreState({ ...p1Ref.current });
    setP2ScoreState({ ...p2Ref.current });

    if (result.winnerId) {
      setWinnerId(result.winnerId);
      setGameStatus(GameStatus.GAME_OVER);
    } else {
      // Delay before next serve
      setTimeout(() => {
        startPoint(winnerId);
      }, 2000);
    }
  }, [startPoint]);

  // 4. AI Logic (CPU)
  const runAI = useCallback(() => {
    // Reset Inputs
    keys.current[KEYS.P2_UP] = false;
    keys.current[KEYS.P2_DOWN] = false;
    keys.current[KEYS.P2_LEFT] = false;
    keys.current[KEYS.P2_RIGHT] = false;
    keys.current[KEYS.P2_SWING] = false;

    const p2 = p2Ref.current;
    const ball = ballRef.current;
    const p1 = p1Ref.current;

    // SERVING STATE
    if (gameStatus === GameStatus.SERVING && servingPlayer.current === 2) {
       if (ball.speed === 0 && !p2.isSwinging) {
         // Delay serve slightly randomly
         if (Math.random() < 0.02) keys.current[KEYS.P2_SWING] = true;
       } else if (ball.z > 30 && ball.vz < 0 && !p2.isSwinging) {
         // Hit toss on the way down
         keys.current[KEYS.P2_SWING] = true;
         // Random aim
         keys.current[Math.random() > 0.5 ? KEYS.P2_LEFT : KEYS.P2_RIGHT] = true;
       }
       return;
    }

    if (gameStatus !== GameStatus.PLAYING) return;

    // PLAYING STATE - MOVEMENT
    let targetX = CANVAS_WIDTH / 2;
    let targetY = CANVAS_HEIGHT - 100; // Base Position

    // If ball is coming towards CPU (crossed net or is about to)
    if (ball.velocity.y > 0 || ball.pos.y > NET_Y) {
       targetX = ball.pos.x;
       
       // Move closer if ball is short
       if (ball.pos.y > NET_Y && ball.speed < 10) {
          targetY = ball.pos.y + 40;
       }
    } 
    // If ball is on opponent side, return to center
    else {
       targetX = CANVAS_WIDTH / 2;
       targetY = CANVAS_HEIGHT - 100;
    }

    // Reaction threshold (don't jitter)
    const diffX = targetX - p2.pos.x;
    const diffY = targetY - p2.pos.y;

    if (Math.abs(diffX) > 10) {
      if (diffX > 0) keys.current[KEYS.P2_RIGHT] = true;
      else keys.current[KEYS.P2_LEFT] = true;
    }

    if (Math.abs(diffY) > 10) {
      if (diffY > 0) keys.current[KEYS.P2_DOWN] = true;
      else keys.current[KEYS.P2_UP] = true;
    }

    // HIT LOGIC
    const dist = Math.sqrt(Math.pow(ball.pos.x - p2.pos.x, 2) + Math.pow(ball.pos.y - p2.pos.y, 2));
    
    // Swing if close, ball low enough, and ball is in our court (or close to net)
    if (dist < HIT_RANGE - 10 && ball.z < HIT_HEIGHT_LIMIT && ball.pos.y > NET_Y - 50) {
       if (ball.lastHitter !== 2) {
         keys.current[KEYS.P2_SWING] = true;

         // Strategic Aiming
         // If P1 is on left, hit right.
         if (p1.pos.x < CANVAS_WIDTH / 2) keys.current[KEYS.P2_RIGHT] = true;
         else keys.current[KEYS.P2_LEFT] = true;
       }
    }
  }, [gameStatus]);

  /**
   * --- PHYSICS ENGINE (The Core) ---
   * Runs every frame. Handles movement, collisions, and rules.
   */
  const updatePhysics = useCallback(() => {
    const ball = ballRef.current;

    // A. CPU INPUT
    if (gameMode === 'CPU') runAI();

    // B. PLAYER MOVEMENT
    [p1Ref.current, p2Ref.current].forEach(p => {
      const isP1 = p.id === 1;
      // Map generic controls to specific player
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

      // Normalize diagonal movement
      if (dx !== 0 && dy !== 0) {
        dx *= 0.707; dy *= 0.707;
      }

      // Apply Movement
      p.pos.x += dx;
      p.pos.y += dy;

      // Boundaries
      p.pos.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, p.pos.x));
      if (isP1) {
         p.pos.y = Math.max(PLAYER_RADIUS, Math.min(NET_Y - 50, p.pos.y)); // P1 Top Half
      } else {
         p.pos.y = Math.max(NET_Y + 50, Math.min(CANVAS_HEIGHT - PLAYER_RADIUS, p.pos.y)); // P2 Bottom Half
      }

      // C. SWING MECHANIC
      if (keys.current[swingKey] && !p.isSwinging) {
        p.isSwinging = true;
        p.swingProgress = 0;
        
        // Special Case: SERVE TOSS
        // If server presses swing while holding ball (speed 0), they toss it up.
        if (gameStatus === GameStatus.SERVING && servingPlayer.current === p.id && ball.speed === 0) {
           setGameStatus(GameStatus.PLAYING);
           ball.vz = 13; // Toss Height
           ball.z = 40;
           ball.velocity.x = 0; 
           ball.velocity.y = 0;
           ball.lastHitter = p.id; // Technically holding it counts as last touch
           setMessage(""); // Clear "Serve" message
        }
      }

      // Animation Progress
      if (p.isSwinging) {
        p.swingProgress += 1 / SWING_DURATION;
        if (p.swingProgress >= 1) {
          p.isSwinging = false;
          p.swingProgress = 0;
        }
      }
    });

    // Stick ball to server hand if waiting for toss
    if (gameStatus === GameStatus.SERVING) {
      const server = servingPlayer.current === 1 ? p1Ref.current : p2Ref.current;
      ball.pos.x = server.pos.x + 20;
      ball.pos.y = server.pos.y + (server.id === 1 ? 20 : -20);
      return; // Skip physics
    }

    if (gameStatus !== GameStatus.PLAYING) return;

    // D. BALL PHYSICS
    
    // 1. Gravity & Velocity
    ball.vz -= GRAVITY;
    ball.z += ball.vz;
    ball.pos.x += ball.velocity.x;
    ball.pos.y += ball.velocity.y;
    
    // Air Drag
    ball.velocity.x *= FRICTION;
    ball.velocity.y *= FRICTION;

    // 2. Net Collision Logic
    // Check if ball is crossing the net line (Y axis)
    const crossedNetLine = (ball.velocity.y > 0 && ball.pos.y >= NET_Y && ball.pos.y - ball.velocity.y < NET_Y) ||
                           (ball.velocity.y < 0 && ball.pos.y <= NET_Y && ball.pos.y - ball.velocity.y > NET_Y);

    if (crossedNetLine) {
      // If ball is too low, it hits the net
      if (ball.z < NET_HEIGHT) {
        // Hit Net: Dampen drastically and reflect slightly
        ball.velocity.y *= -0.2; 
        ball.velocity.x *= 0.2;
        // Ensure it stays on the side it came from for a frame
        ball.pos.y = ball.velocity.y > 0 ? NET_Y - 5 : NET_Y + 5; 
      } else {
        // Cleared Net
        ball.hasCrossedNet = true;
      }
    }

    // 3. Ground Bounce Logic
    if (ball.z <= 0) {
      ball.z = 0;
      ball.vz = -ball.vz * BOUNCE_DAMPING;
      
      // Dead Ball (rolling) check
      if (ball.vz < 2) ball.vz = 0;
      
      // Increment bounce
      ball.bounceCount++;

      // Special Case: Failed Serve Toss (Lands without hit)
      if (ball.speed === 0 && ball.bounceCount === 1 && ball.lastHitter === servingPlayer.current) {
          setGameStatus(GameStatus.SERVING);
          setMessage("BAD TOSS");
          resetBallToServe(servingPlayer.current);
          return;
      }

      // Determine where it bounced
      const bounceY = ball.pos.y;
      const bounceSide = bounceY < NET_Y ? 'p1' : 'p2';
      ball.lastBounceSide = bounceSide;

      const inBounds = isBallInBounds(ball.pos.x, ball.pos.y);

      // --- SCORING RULES ON BOUNCE ---

      // Rule 1: Out of Bounds
      if (ball.bounceCount === 1 && !inBounds) {
         const winner = ball.lastHitter === 1 ? 2 : 1; // Last person to touch it hit it out
         handlePointEnd(winner, "OUT");
         return;
      }

      // Rule 2: Didn't cross net (Bounced on hitter's side)
      // If P1 hit it, and it bounces on P1 side -> Point P2
      if (ball.bounceCount === 1) {
         if (ball.lastHitter === 1 && bounceSide === 'p1') {
             handlePointEnd(2, "NET FAIL");
             return;
         }
         if (ball.lastHitter === 2 && bounceSide === 'p2') {
             handlePointEnd(1, "NET FAIL");
             return;
         }
      }

      // Rule 3: Double Bounce
      if (ball.bounceCount >= 2) {
         // If it bounced twice, the person who hit it last wins the point
         // (because the opponent failed to return it)
         if (ball.lastHitter) {
           handlePointEnd(ball.lastHitter, "DOUBLE BOUNCE");
         }
         return;
      }
    }

    // E. HIT DETECTION
    [p1Ref.current, p2Ref.current].forEach(p => {
      // Detection Window within swing animation
      if (p.isSwinging && p.swingProgress > 0.1 && p.swingProgress < 0.7) { 
        const dx = ball.pos.x - p.pos.x;
        const dy = ball.pos.y - p.pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // Check Hit Range & Height
        if (dist < HIT_RANGE && ball.z < HIT_HEIGHT_LIMIT) {
          // Debounce: Don't hit if we just hit it (unless it bounced)
          if (ball.lastHitter === p.id && ball.bounceCount === 0 && ball.speed > 0) return;

          // If ball is on wrong side of net compared to player, ignore (cant reach over net)
          if ((p.id === 1 && ball.pos.y > NET_Y + 20) || (p.id === 2 && ball.pos.y < NET_Y - 20)) return;

          // --- EXECUTE HIT ---
          const isP1 = p.id === 1;
          
          // Determine Aim Target
          let targetX = CANVAS_WIDTH / 2;
          let targetY = isP1 ? CANVAS_HEIGHT - 80 : 80; // Default deep center

          // Directional Input Modification
          const up = isP1 ? keys.current[KEYS.P1_UP] : keys.current[KEYS.P2_UP];
          const down = isP1 ? keys.current[KEYS.P1_DOWN] : keys.current[KEYS.P2_DOWN];
          const left = isP1 ? keys.current[KEYS.P1_LEFT] : keys.current[KEYS.P2_LEFT];
          const right = isP1 ? keys.current[KEYS.P1_RIGHT] : keys.current[KEYS.P2_RIGHT];

          // X Aiming (Corners)
          if (left) targetX -= 280;
          if (right) targetX += 280;

          // Y Aiming (Short vs Deep) & Shot Type
          let shotSpeed = INITIAL_BALL_SPEED;
          let shotArc = 8; // Vertical pop

          if (up) {
            // SMASH / FLAT: Faster, lower arc, deeper aim
            shotSpeed *= 1.3;
            shotArc = 5; 
            targetY = isP1 ? CANVAS_HEIGHT - 20 : 20; 
          } else if (down) {
            // DROP SHOT / LOB: Slower, higher arc, shorter aim
            shotSpeed *= 0.7;
            shotArc = 15; 
            targetY = isP1 ? NET_Y + 150 : NET_Y - 150;
          }

          // Calculate Velocity Vector
          const angle = Math.atan2(targetY - ball.pos.y, targetX - ball.pos.x);
          
          ball.velocity.x = Math.cos(angle) * shotSpeed;
          ball.velocity.y = Math.sin(angle) * shotSpeed;
          ball.vz = shotArc;
          ball.speed = shotSpeed;

          // Update Ball State for Rules
          ball.lastHitter = p.id;
          ball.bounceCount = 0;
          ball.hasCrossedNet = false; // Reset crossing flag
        }
      }
    });

  }, [gameStatus, handlePointEnd, resetBallToServe, gameMode, runAI]);

  // --- RENDER LOOP ---
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawCourt(ctx);

    // Draw Players
    [p1Ref.current, p2Ref.current].forEach(p => {
      // 1. Shadow
      ctx.beginPath();
      ctx.ellipse(p.pos.x, p.pos.y, PLAYER_RADIUS, PLAYER_RADIUS * 0.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();

      // 2. Player Circle
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y - 10, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = p.id === 1 ? '#3b82f6' : '#ef4444'; // Blue vs Red
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // CPU Label
      if (p.id === 2 && gameMode === 'CPU') {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("CPU", p.pos.x, p.pos.y - 35);
      }

      // 3. Racket Animation
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y - 15);
      
      let rotation = 0;
      // Idle Rotation
      const idleAngle = p.id === 1 ? Math.PI / 4 : -Math.PI / 4 * 3;
      
      if (p.isSwinging) {
         const swingArc = Math.PI * 1.5;
         const startAngle = p.id === 1 ? -Math.PI/2 : Math.PI/2;
         const dir = p.id === 1 ? 1 : -1;
         // Lerp rotation based on progress
         rotation = startAngle + (Math.sin(p.swingProgress * Math.PI) * swingArc * dir);
      } else {
         rotation = idleAngle;
      }
      
      ctx.rotate(rotation);
      
      // Draw Racket Handle
      ctx.fillStyle = '#a16207';
      ctx.fillRect(-2, 0, 4, 30);
      
      // Draw Racket Head
      ctx.beginPath();
      ctx.ellipse(0, 45, 20, 25, 0, 0, Math.PI*2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fbbf24';
      ctx.stroke();
      
      // Racket Strings (Visual feedback for swing sweet spot)
      if (p.isSwinging && p.swingProgress > 0.1 && p.swingProgress < 0.7) {
         ctx.fillStyle = 'rgba(255, 255, 0, 0.4)'; // Glow
      } else {
         ctx.fillStyle = 'rgba(0,0,0,0.1)';
      }
      ctx.fill();
      ctx.restore();
    });

    drawNet(ctx);

    // Draw Ball
    const b = ballRef.current;
    
    // Ball Shadow (Shrinks as ball goes higher)
    const shadowScale = Math.max(0, 1 - b.z / 200);
    ctx.beginPath();
    ctx.ellipse(b.pos.x, b.pos.y, BALL_RADIUS * shadowScale * 1.2, BALL_RADIUS * shadowScale * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();

    // Ball Body (Moves on Y axis based on Z height for pseudo-3D)
    const scale = 1 + (b.z / 500); // Grows slightly when high (closer to camera)
    const drawY = b.pos.y - b.z;
    
    ctx.beginPath();
    ctx.arc(b.pos.x, drawY, BALL_RADIUS * scale, 0, Math.PI * 2);
    ctx.fillStyle = BALL_COLOR;
    ctx.fill();
    ctx.strokeStyle = '#365314'; // Dark Green Outline
    ctx.lineWidth = 1;
    ctx.stroke();

    // Ball Highlight (Shine)
    ctx.beginPath();
    ctx.arc(b.pos.x - 3*scale, drawY - 3*scale, BALL_RADIUS/3 * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
    
    // Overlay Message
    if (message) {
       ctx.fillStyle = 'rgba(0,0,0,0.6)';
       ctx.fillRect(0, CANVAS_HEIGHT/2 - 60, CANVAS_WIDTH, 120);
       ctx.fillStyle = '#fbbf24';
       ctx.font = 'bold 50px "Press Start 2P"';
       ctx.textAlign = 'center';
       ctx.textBaseline = 'middle';
       ctx.fillText(message, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
    }

  }, [message, gameMode]);

  // --- MAIN LOOP SETUP ---
  useEffect(() => {
    let animationFrameId: number;

    const loop = () => {
      updatePhysics();
      render();
      animationFrameId = requestAnimationFrame(loop);
    };
    
    // Start Loop
    animationFrameId = requestAnimationFrame(loop);

    // Cleanup to prevent double-loops in StrictMode
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [updatePhysics, render]);

  // --- MENU HANDLER ---
  const startGame = (mode: GameMode) => {
    setGameMode(mode);
    
    const p2Name = mode === 'CPU' ? 'CPU' : 'Player 2';
    const p2Initial = { ...initP2, name: p2Name };

    setP1ScoreState({ ...initP1 });
    setP2ScoreState({ ...p2Initial });
    p1Ref.current = { ...initP1 };
    p2Ref.current = { ...p2Initial };
    
    setWinnerId(null);
    setGameStatus(GameStatus.SERVING);
    startPoint(1); // P1 always serves first in this arcade version
  };

  return (
    <div className="relative w-full h-screen bg-neutral-900 flex justify-center items-center overflow-hidden">
      {gameStatus === GameStatus.MENU && <Menu onStart={startGame} />}
      
      {gameStatus !== GameStatus.MENU && (
        <MobileControls onInput={handleManualInput} />
      )}

      {gameStatus === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white">
          <h1 className="font-arcade text-6xl text-yellow-400 mb-4">MATCH OVER</h1>
          <p className="text-3xl mb-10 text-blue-200 font-bold">
            {winnerId === 1 ? 'PLAYER 1' : (gameMode === 'CPU' ? 'CPU' : 'PLAYER 2')} WINS!
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
