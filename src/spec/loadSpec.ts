import gameSpec from '../../game_spec.json';

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
    baseY: number;
  };
  brother: {
    size: number;
    fontSize: string;
  };
  brothers: string[];
  merge: Record<string, string>;
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
  score: {
    mergeBase: number;
    typeMultiplier: Record<string, number>;
    heightMode: string;
    heightPerSec: number;
    heightClampY: number;
  };
  gameOver: {
    lineY: number;
    lingerSec: number;
  };
}

export function loadSpec(): GameSpec {
  return gameSpec as unknown as GameSpec;
}

