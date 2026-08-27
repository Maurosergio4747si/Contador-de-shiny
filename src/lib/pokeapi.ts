import { PokemonMini } from '../types';

export interface PokeApiListItem {
  id: number;
  name: string;
  displayName: string;
}

// Capitalizes the first letter of each word
export function capitalize(str: string): string {
  if (!str) return '';
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Convert ID to a 3-digit string (e.g., 25 -> "025")
export function padId(id: number): string {
  return String(id).padStart(3, '0');
}

// Generates Serebii shiny image URLs
// Note: Serebii has hotlink protections in some contexts, so PokeAPI official artworks
// are used as the primary robust images, but Serebii options are also offered!
export function getSerebiiShinyUrl(id: number): string {
  const padded = padId(id);
  // Serebii's modern shiny asset layout
  return `https://www.serebii.net/Shiny/SV/new/${padded}.png`;
}

export function getSerebiiNormalUrl(id: number): string {
  const padded = padId(id);
  return `https://www.serebii.net/pokemon/art/${padded}.png`;
}

/**
 * Fetches the base list of all 1025 Pokemon for autocomplete
 */
export async function fetchPokemonList(): Promise<PokeApiListItem[]> {
  const cacheKey = 'shiny_tracker_pokemon_list';
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error('Failed to parse cached Pokémon list, refetching...', e);
    }
  }

  try {
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
    if (!response.ok) throw new Error('Failed to fetch pokemon list');
    const data = await response.json();
    
    const list: PokeApiListItem[] = data.results.map((item: any, index: number) => {
      const id = index + 1; // PokéAPI standard order up to 1025 matches index + 1
      const rawName = item.name;
      
      // Clean up names for displays (e.g. nidoran-m -> Nidoran ♂)
      let displayName = capitalize(rawName);
      if (rawName === 'nidoran-m') displayName = 'Nidoran ♂';
      else if (rawName === 'nidoran-f') displayName = 'Nidoran ♀';
      else if (rawName === 'mr-mime') displayName = 'Mr. Mime';
      else if (rawName === 'mime-jr') displayName = 'Mime Jr.';
      else if (rawName === 'farfetchd') displayName = "Farfetch'd";
      else if (rawName === 'sirfetchd') displayName = "Sirfetch'd";
      else if (rawName.endsWith('-alola')) displayName = `${capitalize(rawName.replace('-alola', ''))} (Alola)`;
      else if (rawName.endsWith('-galar')) displayName = `${capitalize(rawName.replace('-galar', ''))} (Galar)`;
      else if (rawName.endsWith('-hisui')) displayName = `${capitalize(rawName.replace('-hisui', ''))} (Hisui)`;
      else if (rawName.endsWith('-paldea')) displayName = `${capitalize(rawName.replace('-paldea', ''))} (Paldea)`;
      
      return {
        id,
        name: rawName,
        displayName
      };
    });
    
    localStorage.setItem(cacheKey, JSON.stringify(list));
    return list;
  } catch (error) {
    console.error('Error fetching Pokemon list from PokeAPI:', error);
    // Fallback static list of iconic Pokemon in case of offline/network failure
    const fallback: PokeApiListItem[] = [
      { id: 1, name: 'bulbasaur', displayName: 'Bulbasaur' },
      { id: 4, name: 'charmander', displayName: 'Charmander' },
      { id: 7, name: 'squirtle', displayName: 'Squirtle' },
      { id: 25, name: 'pikachu', displayName: 'Pikachu' },
      { id: 133, name: 'eevee', displayName: 'Eevee' },
      { id: 150, name: 'mewtwo', displayName: 'Mewtwo' },
      { id: 252, name: 'treecko', displayName: 'Treecko' },
      { id: 255, name: 'torchic', displayName: 'Torchic' },
      { id: 258, name: 'mudkip', displayName: 'Mudkip' },
      { id: 384, name: 'rayquaza', displayName: 'Rayquaza' },
      { id: 443, name: 'gible', displayName: 'Gible' },
      { id: 445, name: 'garchomp', displayName: 'Garchomp' },
      { id: 448, name: 'lucario', displayName: 'Lucario' },
      { id: 722, name: 'rowlet', displayName: 'Rowlet' },
      { id: 906, name: 'sprigatito', displayName: 'Sprigatito' },
      { id: 909, name: 'fuecoco', displayName: 'Fuecoco' },
      { id: 912, name: 'quaxly', displayName: 'Quaxly' },
    ];
    return fallback;
  }
}

/**
 * Fetches full details for a single Pokemon
 */
export async function fetchPokemonDetails(idOrName: number | string): Promise<PokemonMini> {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${idOrName}`);
  if (!response.ok) throw new Error(`Failed to fetch details for Pokemon: ${idOrName}`);
  const data = await response.json();
  
  const id = data.id;
  const rawName = data.name;
  let displayName = capitalize(rawName);
  
  // Custom replacements
  if (rawName === 'nidoran-m') displayName = 'Nidoran ♂';
  else if (rawName === 'nidoran-f') displayName = 'Nidoran ♀';
  else if (rawName === 'mr-mime') displayName = 'Mr. Mime';
  else if (rawName === 'farfetchd') displayName = "Farfetch'd";
  
  const spriteNormal = data.sprites.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  const spriteShiny = data.sprites.front_shiny || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`;
  
  const artworkNormal = data.sprites.other?.['official-artwork']?.front_default || spriteNormal;
  const artworkShiny = data.sprites.other?.['official-artwork']?.front_shiny || spriteShiny;
  
  const types = data.types.map((t: any) => t.type.name);
  
  return {
    id,
    name: displayName,
    spriteNormal,
    spriteShiny,
    artworkNormal,
    artworkShiny,
    types
  };
}
