import { HuntingMethod } from '../types';

export const HUNTING_METHODS: HuntingMethod[] = [
  {
    id: 'full_odds_gen6',
    name: 'Full Odds (Geração 6+)',
    description: 'Encontros selvagens padrão em jogos da Geração 6 em diante (X/Y, OR/AS, S/M, US/UM, Sw/Sh, BD/SP, S/V).',
    calculateOdds: (baseOdds, hasShinyCharm) => {
      // Base: 1/4096
      // Charm adds 2 rolls (total 3 rolls)
      const rolls = hasShinyCharm ? 3 : 1;
      return Math.round(4096 / rolls);
    }
  },
  {
    id: 'full_odds_gen2_5',
    name: 'Full Odds (Geração 2-5)',
    description: 'Encontros selvagens padrão em jogos clássicos (Gold/Silver até Black 2/White 2).',
    calculateOdds: (baseOdds, hasShinyCharm) => {
      // Base: 1/8192
      // Charm adds 2 rolls (total 3 rolls) in Black 2/White 2
      const rolls = hasShinyCharm ? 3 : 1;
      return Math.round(8192 / rolls);
    }
  },
  {
    id: 'masuda_gen6',
    name: 'Método Masuda (Geração 6+)',
    description: 'Cruzamento de Pokémon de nacionalidades diferentes no Day Care / Nursery (X/Y, OR/AS, S/M, US/UM, Sw/Sh, S/V).',
    calculateOdds: (baseOdds, hasShinyCharm) => {
      // Masuda adds 5 rolls. Charm adds 2 rolls.
      // Base: 1/4096
      // Masuda only: 1 + 5 = 6 rolls (1/683)
      // Masuda + Charm: 1 + 5 + 2 = 8 rolls (1/512)
      const rolls = 1 + 5 + (hasShinyCharm ? 2 : 0);
      return Math.round(4096 / rolls);
    }
  },
  {
    id: 'masuda_gen4_5',
    name: 'Método Masuda (Geração 4-5)',
    description: 'Cruzamento de Pokémon de nacionalidades diferentes no Day Care (Diamond/Pearl, HG/SS, Black/White).',
    calculateOdds: (baseOdds, hasShinyCharm) => {
      // Gen 4: 5 rolls total (1/1638). Gen 5: 6 rolls total (1/1365). + Charm in Gen 5 adds 2 (total 8: 1/1024)
      const isGen5 = hasShinyCharm; // Charm only existed in Gen 5
      const baseRolls = isGen5 ? 6 : 5;
      const rolls = baseRolls + (hasShinyCharm ? 2 : 0);
      return Math.round(8192 / rolls);
    }
  },
  {
    id: 'poke_radar',
    name: 'Poké Radar (Chain)',
    description: 'Chaining usando o Poké Radar em Diamond/Pearl/Platinum, X/Y ou BD/SP. Modifique de acordo com a Chain atual.',
    hasModifier: true,
    modifierLabel: 'Tamanho da Chain (0 - 40)',
    modifierMin: 0,
    modifierMax: 40,
    modifierDefault: 40,
    calculateOdds: (baseOdds, hasShinyCharm, chain = 40) => {
      const safeChain = Math.max(0, Math.min(40, chain));
      if (safeChain === 0) return baseOdds;
      // Classic Gen 4 formula: 65536 / (8200 - 200 * chain)
      const divisor = Math.floor(65536 / (8200 - 200 * safeChain));
      return divisor > 0 ? divisor : baseOdds;
    }
  },
  {
    id: 'chain_fishing',
    name: 'Chain Fishing (Pesca em Cadeia)',
    description: 'Pesca consecutiva sem se mover ou falhar na fisgada em X/Y ou OR/AS.',
    hasModifier: true,
    modifierLabel: 'Tamanho da Chain (0 - 20)',
    modifierMin: 0,
    modifierMax: 20,
    modifierDefault: 20,
    calculateOdds: (baseOdds, hasShinyCharm, chain = 20) => {
      const safeChain = Math.max(0, Math.min(20, chain));
      // Each chain link adds 2 rolls, up to max +40 rolls at chain 20.
      // Charm adds 2 rolls.
      const rolls = 1 + (safeChain * 2) + (hasShinyCharm ? 2 : 0);
      return Math.round(4096 / rolls);
    }
  },
  {
    id: 'friend_safari',
    name: 'Friend Safari (X/Y)',
    description: 'Friend Safari em Pokémon X & Y possui uma probabilidade fixa de shiny alta.',
    calculateOdds: () => {
      // Fixed 1/512 (ignores Shiny Charm)
      return 512;
    }
  },
  {
    id: 'dexnav',
    name: 'DexNav (OR/AS)',
    description: 'Busca repetida de Pokémon usando o DexNav em Omega Ruby & Alpha Sapphire.',
    hasModifier: true,
    modifierLabel: 'Search Level (0 - 999)',
    modifierMin: 0,
    modifierMax: 999,
    modifierDefault: 100,
    calculateOdds: (baseOdds, hasShinyCharm, searchLevel = 100) => {
      // DexNav uses a complex formula with chain bonuses and search level points.
      // Typically, with a high search level (e.g. 999), odds reach approx 1/173 (with charm) or 1/200 (without).
      // We can approximate the curve:
      const charmBonus = hasShinyCharm ? 2 : 0;
      const baseRolls = 1 + charmBonus;
      
      // DexNav has a search level bonus addition:
      // Probabilities increase slowly with search level. At search level 100, we get ~1/1000. At 999, ~1/200.
      let searchBonusRolls = 0;
      if (searchLevel >= 900) searchBonusRolls = 18;
      else if (searchLevel >= 500) searchBonusRolls = 12;
      else if (searchLevel >= 300) searchBonusRolls = 8;
      else if (searchLevel >= 100) searchBonusRolls = 4;
      else if (searchLevel >= 50) searchBonusRolls = 2;
      else if (searchLevel >= 20) searchBonusRolls = 1;

      const totalRolls = baseRolls + searchBonusRolls;
      return Math.round(4096 / totalRolls);
    }
  },
  {
    id: 'sos_battles',
    name: 'SOS Battles (Geração 7)',
    description: 'Pokémon chamando ajuda consecutiva em Sun, Moon, Ultra Sun ou Ultra Moon.',
    hasModifier: true,
    modifierLabel: 'Tamanho da Chain (0 - 255)',
    modifierMin: 0,
    modifierMax: 255,
    modifierDefault: 31,
    calculateOdds: (baseOdds, hasShinyCharm, chain = 31) => {
      const safeChain = Math.max(0, Math.min(255, chain));
      let bonusRolls = 0;
      if (safeChain >= 31) bonusRolls = 12;
      else if (safeChain >= 21) bonusRolls = 8;
      else if (safeChain >= 11) bonusRolls = 4;

      const rolls = 1 + bonusRolls + (hasShinyCharm ? 2 : 0);
      return Math.round(4096 / rolls);
    }
  },
  {
    id: 'dynamax_adventures',
    name: 'Aventuras Dynamax (Sw/Sh DLC)',
    description: 'Crown Tundra Dynamax Adventures possuem probabilidades de Shiny extremamente altas.',
    calculateOdds: (baseOdds, hasShinyCharm) => {
      // Fixed 1/300 without charm, 1/100 with charm
      return hasShinyCharm ? 100 : 300;
    }
  },
  {
    id: 'mass_outbreaks_sv',
    name: 'Surto em Massa (Scarlet/Violet)',
    description: 'Surtos em Massa em Paldea/Kitakami/Indico. Bônus por derrotar mais de 60 Pokémon e uso de Sanduíches de Brilho.',
    hasModifier: true,
    modifierLabel: 'Nível do Sanduíche de Brilho (0 - 3)',
    modifierMin: 0,
    modifierMax: 3,
    modifierDefault: 3,
    calculateOdds: (baseOdds, hasShinyCharm, sandwichLevel = 3) => {
      // SV Outbreak 60+ defeats adds +2 rolls.
      // Sandwich Level (0 to 3) adds that many rolls (Level 3 adds +3 rolls).
      // Shiny Charm adds +2 rolls.
      // Max rolls = 1 (base) + 2 (60+ defeats) + sandwichLevel + (hasShinyCharm ? 2 : 0)
      const outbreakBonus = 2; // assume they do 60+ defeats for outbreaks
      const sandwichBonus = Math.max(0, Math.min(3, sandwichLevel));
      const charmBonus = hasShinyCharm ? 2 : 0;
      const rolls = 1 + outbreakBonus + sandwichBonus + charmBonus;
      return Math.round(4096 / rolls);
    }
  },
  {
    id: 'legends_outbreaks',
    name: 'Surto em Massa (Legends Arceus)',
    description: 'Surtos em Massa em Pokémon Legends: Arceus (bônus massivo fixo de +25 rolls).',
    calculateOdds: (baseOdds, hasShinyCharm) => {
      // Base: 1/4096
      // Outbreak: +25 rolls.
      // Charm: +3 rolls in PLA.
      // Max: 1 + 25 + 3 = 29 rolls (~1/141)
      const rolls = 1 + 25 + (hasShinyCharm ? 3 : 0);
      return Math.round(4096 / rolls);
    }
  }
];

export const GAMES_LIST = [
  'Scarlet & Violet',
  'Legends: Arceus',
  'Brilliant Diamond & Shining Pearl',
  'Sword & Shield',
  'Let\'s Go Pikachu & Eevee',
  'Ultra Sun & Ultra Moon',
  'Sun & Moon',
  'Omega Ruby & Alpha Sapphire',
  'X & Y',
  'Black 2 & White 2',
  'Black & White',
  'HeartGold & SoulSilver',
  'Platinum',
  'Diamond & Pearl',
  'Emerald',
  'FireRed & LeafGreen',
  'Ruby & Sapphire',
  'Gold & Silver & Crystal',
  'Red & Blue & Yellow'
];
