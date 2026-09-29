import { TIME_LIMIT_S } from './puzzle';

export type ModalId = 'bag' | 'wall' | 'safe' | 'hint' | 'reset' | 'help' | null;

export interface GameState {
  phase: 'intro' | 'play' | 'ended';
  foundClue: boolean;
  sawRoute: boolean;
  unlocked: boolean;
  modal: ModalId;
  hintUsed: boolean;
  hintText: string | null;
  attempts: number;
  startedAt: number | null;
  finishedAt: number | null;
  marks: number[];
  showEnding: boolean;
  /** Dialog to return to after reading the hint. */
  hintReturn: ModalId;
}

export const initialState: GameState = {
  phase: 'intro',
  foundClue: false,
  sawRoute: false,
  unlocked: false,
  modal: null,
  hintUsed: false,
  hintText: null,
  attempts: 0,
  startedAt: null,
  finishedAt: null,
  marks: [],
  showEnding: false,
  hintReturn: null,
};

export type Action =
  | { type: 'start'; now: number }
  | { type: 'open'; modal: ModalId }
  | { type: 'close' }
  | { type: 'foundClue' }
  | { type: 'sawRoute' }
  | { type: 'toggleMark'; index: number }
  | { type: 'clearMarks' }
  | { type: 'useHint' }
  | { type: 'wrong' }
  | { type: 'unlock'; now: number }
  | { type: 'showEnding'; show: boolean }
  | { type: 'reset' };

export function hintFor(s: Pick<GameState, 'foundClue' | 'sawRoute'>): string {
  if (!s.foundClue) {
    return 'Empieza por la bolsa de magnesio, a la izquierda de la mesa. Ábrela y mete la mano: hay algo metálico adentro.';
  }
  if (!s.sawRoute) {
    return 'La ficha habla del muro de escalada del fondo: tiene nieve arriba y una laguna abajo. Tócalo para verlo de cerca.';
  }
  return 'El color del agua es el azul: en cada tramo de la línea de magnesio cuenta solo las presas azules que llevan hasta su bandera (las grises de la línea no se pisan). Después lee los tres números empezando por la bandera de la nieve, arriba, y terminando en la más cercana a la laguna.';
}

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'start':
      return { ...s, phase: 'play', startedAt: s.startedAt ?? a.now, modal: null };
    case 'open':
      return { ...s, modal: a.modal };
    case 'close':
      return s.modal === 'hint' ? { ...s, modal: s.hintReturn, hintReturn: null } : { ...s, modal: null };
    case 'foundClue':
      return { ...s, foundClue: true };
    case 'sawRoute':
      return s.foundClue ? { ...s, sawRoute: true } : s;
    case 'toggleMark':
      return {
        ...s,
        marks: s.marks.includes(a.index) ? s.marks.filter((m) => m !== a.index) : [...s.marks, a.index],
      };
    case 'clearMarks':
      return { ...s, marks: [] };
    case 'useHint':
      if (s.hintUsed) return { ...s, modal: 'hint', hintReturn: s.modal };
      return { ...s, hintUsed: true, hintText: hintFor(s), modal: 'hint', hintReturn: s.modal };
    case 'wrong':
      return { ...s, attempts: s.attempts + 1 };
    case 'unlock':
      return { ...s, unlocked: true, sawRoute: true, foundClue: true, finishedAt: a.now, attempts: s.attempts + 1 };
    case 'showEnding':
      return { ...s, showEnding: a.show, phase: a.show ? 'ended' : 'play', modal: null };
    case 'reset':
      return { ...initialState, phase: 'play', startedAt: Date.now() };
  }
}

export function remainingSeconds(s: GameState, now: number): number {
  if (s.startedAt === null) return TIME_LIMIT_S;
  const end = s.finishedAt ?? now;
  return TIME_LIMIT_S - (end - s.startedAt) / 1000;
}

export type Step = { key: string; label: string; done: boolean };

export function steps(s: GameState): Step[] {
  return [
    { key: 'bag', label: 'Magnesio', done: s.foundClue },
    { key: 'wall', label: 'Ruta', done: s.sawRoute },
    { key: 'safe', label: 'Caja', done: s.unlocked },
  ];
}

export function objective(s: GameState): string {
  if (s.unlocked) return 'La caja está abierta. Hay un sobre adentro.';
  if (!s.foundClue) return 'Algo suena dentro de la bolsa de magnesio.';
  if (!s.sawRoute) return 'La ficha habla de nieve y de una laguna. Búscalas en el muro del fondo.';
  return 'Descifra la ruta del muro y sigue la cuerda hasta la caja: tres números, en el orden correcto.';
}
