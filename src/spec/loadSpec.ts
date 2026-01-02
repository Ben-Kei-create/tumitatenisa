import gameSpec from '../../game_spec.json';

export interface BrotherSpec {
  size: number;
  color: string;
  score: number;
}

export interface GameSpec {
  screen: {
    width: number;
    height: number;
    bg: string;
  };
  physics: {
    gravityY: number;
    restitution: number;
    friction: number;
    allowRotation: boolean;
  };
  stage: {
    baseWidth: number;
    baseHeight: number;
    bottomMargin: number;
  };
  spawn: {
    y: number;
    xRange: number[];
    nextDelayMs: number;
  };
  input: {
    mode: string;
    clampPadding: number;
    showDropGuide: boolean;
  };
  gameOver: {
    lineY: number;
    lingerSec: number;
  };
  // 新しい構造
  brothersOrder: string[]; // 進化順序 ["A", "B", "C"...]
  brothers: Record<string, BrotherSpec>; // 各スペック
  merge: Record<string, string>; // Legacy support or empty
}

export function loadSpec(): GameSpec {
  return gameSpec as unknown as GameSpec;
}
