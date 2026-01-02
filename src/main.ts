import { loadSpec } from './spec/loadSpec';
import { createGame } from './game/createGame';

const spec = loadSpec();
createGame(spec);

