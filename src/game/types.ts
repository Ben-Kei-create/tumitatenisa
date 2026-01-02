import { GameSpec } from '../spec/loadSpec';

export interface BrotherData {
  id: string;
  type: string;
  merged: boolean;
}

import { Brother } from './objects/Brother';

export interface GameState {
  spec: GameSpec;
  score: number;
  gameOver: boolean;
  currentBrother: Brother | null;
  highestY: number;
  gameOverTimer: number;
  heightScoreTimer: number;
}

