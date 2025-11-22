import { GameDimensions } from "./types";

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 1200;

export const DIMENSIONS: GameDimensions = {
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  courtMargin: 50,
};

export const COURT_COLOR = '#3b82f6';
export const COURT_BORDER_COLOR = '#ffffff';
export const BALL_COLOR = '#bef264';
export const BALL_RADIUS = 12; // Slightly larger visibility
export const PLAYER_RADIUS = 25;

// Physics Constants
export const GRAVITY = 0.314; // Reduced from 0.5 for floatier ball
export const NET_HEIGHT = 30; 
export const NET_Y = CANVAS_HEIGHT / 2;
export const INITIAL_BALL_SPEED = 14;
export const MAX_BALL_SPEED = 28;
export const FRICTION = 0.99; // Less friction in air
export const BOUNCE_DAMPING = 0.75;

// Swing Constants
export const SWING_DURATION = 24; // Slower swing (more frames) = easier timing
export const HIT_RANGE = 100; // Larger hit radius
export const HIT_HEIGHT_LIMIT = 160; // Can hit higher balls

// Keys
export const KEYS = {
  P1_UP: 'w',
  P1_DOWN: 's',
  P1_LEFT: 'a',
  P1_RIGHT: 'd',
  P1_SWING: ' ', // Space
  
  P2_UP: 'ArrowUp',
  P2_DOWN: 'ArrowDown',
  P2_LEFT: 'ArrowLeft',
  P2_RIGHT: 'ArrowRight',
  P2_SWING: 'Enter', // Enter
};