export type Point = {
  x: number;
  y: number;
};

export type Vector = {
  x: number;
  y: number;
};

export type GameMode = 'PVP' | 'CPU';

export enum GameStatus {
  MENU = 'MENU',
  SERVING = 'SERVING', // New state for serving
  PLAYING = 'PLAYING',
  POINT_ENDED = 'POINT_ENDED',
  GAME_OVER = 'GAME_OVER',
}

export type TennisScore = '0' | '15' | '30' | '40' | 'AD';

export interface PlayerState {
  pos: Point;
  velocity: Vector;
  score: TennisScore;
  sets: number;
  id: 1 | 2;
  name: string;
  isSwinging: boolean;
  swingProgress: number; // 0 to 1
}

export interface BallState {
  pos: Point; // Ground position (x, y)
  z: number;  // Height off ground
  velocity: Vector; // Ground velocity
  vz: number; // Vertical velocity
  speed: number; // Base speed magnitude
  lastHitter: 1 | 2 | null;
  bounceCount: number; // Number of bounces since last hit
}

export interface GameDimensions {
  width: number;
  height: number;
  courtMargin: number;
}

export type KeyState = {
  [key: string]: boolean;
};