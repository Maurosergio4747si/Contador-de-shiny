export interface PokemonMini {
  id: number;
  name: string;
  spriteNormal: string;
  spriteShiny: string;
  artworkNormal: string;
  artworkShiny: string;
  types: string[];
  encounterChance?: number;
}

export interface Phase {
  phaseNumber: number;
  pokemon: PokemonMini;
  encounters: number;
  timeSeconds: number;
  date: string; // ISO string
  evolvedTo?: PokemonMini;
  notes?: string;
}

export interface Hunt {
  id: string;
  targetPokemon: PokemonMini;
  route: string;
  methodId: string;
  methodName: string;
  game: string;
  baseOdds: number; // e.g. 4096 or 8192
  customOdds: number; // calculated odds based on charm and method
  routePokemons: PokemonMini[];
  startDate: string; // ISO string
  endDate: string | null; // ISO string when finished
  status: 'hunting' | 'completed' | 'paused';
  totalEncounters: number; // Sum of all phases + current phase
  currentPhaseEncounters: number; // Encounters in the active phase
  totalTimeSeconds: number; // Sum of all phases + current phase
  currentPhaseTimeSeconds: number; // Time in the active phase
  phases: Phase[];
  hasShinyCharm: boolean;
  notes?: string;
  saveName?: string;
  methodModifierValue?: number; // e.g. DexNav level, chain count, sandwich level
  evolvedTo?: PokemonMini;
}

export interface HuntingMethod {
  id: string;
  name: string;
  calculateOdds: (baseOdds: number, hasShinyCharm: boolean, modifierValue?: number) => number;
  hasModifier?: boolean;
  modifierLabel?: string;
  modifierMin?: number;
  modifierMax?: number;
  modifierDefault?: number;
  description: string;
}
