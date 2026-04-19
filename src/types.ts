export interface Point {
  x: number;
  y: number;
}

export interface Velocity {
  dx: number;
  dy: number;
}

export interface Ball extends Point, Velocity {
  radius: number;
}

export interface Paddle extends Point {
  width: number;
  height: number;
}

export interface Block extends Point {
  width: number;
  height: number;
  color: string;
  points: number;
  destroyed: boolean;
  type: 'standard' | 'powerup' | 'unbreakable';
}

export interface GameState {
  score: number;
  highScore: number;
  lives: number;
  level: number;
  status: 'menu' | 'playing' | 'paused' | 'gameover' | 'victory';
}

export interface Particle extends Point, Velocity {
  size: number;
  color: string;
  life: number; // 0 to 1
  decay: number;
}
