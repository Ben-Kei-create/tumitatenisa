import { readFileSync } from 'fs';
import { join } from 'path';

interface GameSpec {
  title: string;
  brothers: string[];
  merge: Record<string, string>;
  canvas: {
    width: number;
    height: number;
  };
  physics: {
    gravity: number;
    groundY: number;
    wallLeft: number;
    wallRight: number;
  };
  spawn: {
    x: number;
    y: number;
    velocityY: number;
  };
  brother: {
    size: number;
    colors: Record<string, string>;
  };
  score: {
    mergeBase: number;
    heightPerSec: number;
    heightClamp: number;
  };
  gameOver: {
    lineY: number;
    lingerSec: number;
  };
  controls: {
    moveSpeed: number;
    dropKey: string;
  };
}

function validateSpec(): boolean {
  try {
    const specPath = join(process.cwd(), 'game_spec.json');
    const specContent = readFileSync(specPath, 'utf-8');
    const spec: GameSpec = JSON.parse(specContent);

    // 必須フィールドのチェック
    if (!spec.title || typeof spec.title !== 'string') {
      console.error('❌ spec.title is required and must be a string');
      return false;
    }

    if (!Array.isArray(spec.brothers) || spec.brothers.length === 0) {
      console.error('❌ spec.brothers is required and must be a non-empty array');
      return false;
    }

    if (!spec.merge || typeof spec.merge !== 'object') {
      console.error('❌ spec.merge is required and must be an object');
      return false;
    }

    // merge の整合性チェック
    for (const brother of spec.brothers) {
      if (!spec.merge[brother]) {
        console.error(`❌ spec.merge["${brother}"] is missing`);
        return false;
      }
      if (!spec.brothers.includes(spec.merge[brother])) {
        console.error(`❌ spec.merge["${brother}"] = "${spec.merge[brother]}" is not in spec.brothers`);
        return false;
      }
    }

    // canvas チェック
    if (!spec.canvas || typeof spec.canvas.width !== 'number' || typeof spec.canvas.height !== 'number') {
      console.error('❌ spec.canvas.width and spec.canvas.height are required and must be numbers');
      return false;
    }

    // physics チェック
    if (!spec.physics || typeof spec.physics.gravity !== 'number') {
      console.error('❌ spec.physics.gravity is required and must be a number');
      return false;
    }

    // brother チェック
    if (!spec.brother || typeof spec.brother.size !== 'number') {
      console.error('❌ spec.brother.size is required and must be a number');
      return false;
    }

    // colors チェック
    if (!spec.brother.colors || typeof spec.brother.colors !== 'object') {
      console.error('❌ spec.brother.colors is required and must be an object');
      return false;
    }

    for (const brother of spec.brothers) {
      if (!spec.brother.colors[brother]) {
        console.warn(`⚠️  spec.brother.colors["${brother}"] is missing (will use default color)`);
      }
    }

    console.log('✅ game_spec.json is valid');
    return true;
  } catch (error) {
    console.error('❌ Failed to validate spec:', error);
    return false;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(validateSpec() ? 0 : 1);
}

export { validateSpec };

