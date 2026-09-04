import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, MapPin, Gamepad2, Layers, Compass, 
  Trash2, Plus, Info, ChevronRight, BookOpen 
} from 'lucide-react';
import { PokemonMini, Hunt } from '../types';
import { HUNTING_METHODS, GAMES_LIST } from '../lib/methods';
import PokemonSelector from './PokemonSelector';

const GAME_TO_VERSION_MAP: Record<string, string[]> = {
  'Scarlet & Violet': ['scarlet', 'violet'],
  'Legends: Arceus': ['legends-arceus'],
  'Brilliant Diamond & Shining Pearl': ['brilliant-diamond', 'shining-pearl'],
  'Sword & Shield': ['sword', 'shield'],
  'Let\'s Go Pikachu & Eevee': ['lets-go-pikachu', 'lets-go-eevee'],
  'Ultra Sun & Ultra Moon': ['ultra-sun', 'ultra-moon'],
  'Sun & Moon': ['sun', 'moon'],
  'Omega Ruby & Alpha Sapphire': ['omega-ruby', 'alpha-sapphire'],
  'X & Y': ['x', 'y'],
  'Black 2 & White 2': ['black-2', 'white-2'],
  'Black & White': ['black', 'white'],
  'HeartGold & SoulSilver': ['heartgold', 'soulsilver'],
  'Platinum': ['platinum'],
  'Diamond & Pearl': ['diamond', 'pearl'],
  'Emerald': ['emerald'],
  'FireRed & LeafGreen': ['firered', 'leafgreen'],
  'Ruby & Sapphire': ['ruby', 'sapphire'],
  'Gold & Silver & Crystal': ['gold', 'silver', 'crystal'],
  'Red & Blue & Yellow': ['red', 'blue', 'yellow']
};

const formatLocationName = (rawName: string) => {
  return rawName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface NewHuntModalProps {
  onClose: () => void;
  onCreateHunt: (hunt: Hunt) => void;
}

export default function NewHuntModal({ onClose, onCreateHunt }: NewHuntModalProps) {
  // Form fields
  const [targetPokemon, setTargetPokemon] = useState<PokemonMini | null>(null);
  const [game, setGame] = useState(GAMES_LIST[0]);
  const [route, setRoute] = useState('');
  const [saveName, setSaveName] = useState('');
  const [methodId, setMethodId] = useState(HUNTING_METHODS[0].id);
  const [hasShinyCharm, setHasShinyCharm] = useState(false);
  const [modifierValue, setModifierValue] = useState<number | undefined>(undefined);
  const [routePokemons, setRoutePokemons] = useState<PokemonMini[]>([]);
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // API states
  const [apiRoutes, setApiRoutes] = useState<{ name: string; url: string; rawName: string }[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [selectedApiRouteUrl, setSelectedApiRouteUrl] = useState('');
  const [loadingRoutePokemons, setLoadingRoutePokemons] = useState(false);

  // Selected method object
  const selectedMethod = HUNTING_METHODS.find(m => m.id === methodId) || HUNTING_METHODS[0];

  // Load routes on game or targetPokemon change
  useEffect(() => {
    if (!targetPokemon) {
      setApiRoutes([]);
      setSelectedApiRouteUrl('');
      return;
    }

    async function fetchRoutes() {
      setLoadingRoutes(true);
      setApiRoutes([]);
      setSelectedApiRouteUrl('');
      try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${targetPokemon.id}/encounters`);
        if (!response.ok) throw new Error('Falha ao buscar encontros');
        const data = await response.json();

        const targetVersions = GAME_TO_VERSION_MAP[game] || [];

        const filteredRoutes = data
          .filter((encounter: any) => 
            encounter.version_details.some((vDetail: any) => 
              targetVersions.includes(vDetail.version.name)
            )
          )
          .map((encounter: any) => ({
            rawName: encounter.location_area.name,
            name: formatLocationName(encounter.location_area.name),
            url: encounter.location_area.url
          }));

        setApiRoutes(filteredRoutes);
      } catch (err) {
        console.error('Erro ao buscar rotas', err);
      } finally {
        setLoadingRoutes(false);
      }
    }

    fetchRoutes();
  }, [targetPokemon, game]);

  const handleApiRouteSelect = async (url: string) => {
    setSelectedApiRouteUrl(url);
    if (!url) return;

    const matchedRoute = apiRoutes.find(r => r.url === url);
    if (matchedRoute) {
      setRoute(matchedRoute.name);
    }

    setLoadingRoutePokemons(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha ao buscar dados da área');
      const areaData = await response.json();

      const targetVersions = GAME_TO_VERSION_MAP[game] || [];
      const encounters: any[] = areaData.pokemon_encounters || [];

      const fetchedPokemons: PokemonMini[] = [];

      for (const enc of encounters) {
        // Check if this pokemon is encountered in our target version
        const matchingVersions = enc.version_details.filter((vd: any) => 
          targetVersions.includes(vd.version.name)
        );

        if (matchingVersions.length > 0) {
          // Calculate total chance of encounter across matching versions
          let totalChance = 0;
          for (const mv of matchingVersions) {
            const chanceSum = mv.encounter_details.reduce((sum: number, det: any) => sum + det.chance, 0);
            totalChance = Math.max(totalChance, chanceSum);
          }

          const pokemonName = enc.pokemon.name;
          const pokemonUrl = enc.pokemon.url;
          const pokemonId = parseInt(pokemonUrl.split('/').filter(Boolean).pop() || '0');

          const displayName = pokemonName.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

          const routePk: PokemonMini = {
            id: pokemonId,
            name: displayName,
            spriteNormal: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`,
            spriteShiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`,
            artworkNormal: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`,
            artworkShiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${pokemonId}.png`,
            types: ['Normal'],
            encounterChance: totalChance
          };

          fetchedPokemons.push(routePk);
        }
      }

      // Sort by chance descending
      fetchedPokemons.sort((a, b) => (b.encounterChance || 0) - (a.encounterChance || 0));

      setRoutePokemons(fetchedPokemons);
    } catch (err) {
      console.error('Erro ao buscar Pokémons da rota', err);
    } finally {
      setLoadingRoutePokemons(false);
    }
  };

  // Handler for adding a pokemon to the route list
  const handleAddRoutePokemon = (pokemon: PokemonMini) => {
    // Avoid duplicates
    if (routePokemons.some(p => p.id === pokemon.id)) return;
    setRoutePokemons([...routePokemons, pokemon]);
  };

  const handleRemoveRoutePokemon = (id: number) => {
    setRoutePokemons(routePokemons.filter(p => p.id !== id));
  };

  const handleMethodChange = (id: string) => {
    setMethodId(id);
    const method = HUNTING_METHODS.find(m => m.id === id);
    if (method && method.hasModifier) {
      setModifierValue(method.modifierDefault);
    } else {
      setModifierValue(undefined);
    }
  };

  // Submit and create hunt
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPokemon || !route.trim()) return;

    // Calculate initial odds
    const baseOdds = 4096; // base default
    const customOdds = selectedMethod.calculateOdds(baseOdds, hasShinyCharm, modifierValue);

    const newHunt: Hunt = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      targetPokemon,
      route: route.trim(),
      methodId,
      methodName: selectedMethod.name,
      game,
      baseOdds,
      customOdds,
      routePokemons,
      startDate: new Date(startDate + 'T12:00:00').toISOString(), // normalize time
      endDate: null,
      status: 'hunting',
      totalEncounters: 0,
      currentPhaseEncounters: 0,
      totalTimeSeconds: 0,
      currentPhaseTimeSeconds: 0,
      phases: [],
      hasShinyCharm,
      notes: notes.trim(),
      saveName: saveName.trim() || 'Principal',
      methodModifierValue: modifierValue
    };

    onCreateHunt(newHunt);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h3 className="text-base font-bold">Iniciar Nova Caçada Shiny</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* STEP 1: SELECT POKEMON TO HUNT */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <h4 className="text-sm font-bold text-slate-800">Qual Pokémon você vai caçar?</h4>
            </div>

            <PokemonSelector 
              onSelect={setTargetPokemon}
              label="Alvo Shiny"
              placeholder="Digite o nome do Pokémon (inglês), ex: Greninja, Charmander, Rayquaza..."
              id="target-pokemon-selector"
            />

            {targetPokemon && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-4 animate-in fade-in slide-in-from-top-1 duration-100">
                <div className="relative">
                  <img 
                    src={targetPokemon.artworkShiny} 
                    alt={targetPokemon.name}
                    className="w-16 h-16 object-contain drop-shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <Sparkles className="w-4.5 h-4.5 text-amber-400 fill-amber-400 absolute -top-1 -right-1" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    {targetPokemon.name}
                    <span className="font-mono text-xs text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded-sm">
                      #{String(targetPokemon.id).padStart(4, '0')}
                    </span>
                  </h5>
                  <p className="text-xs text-slate-400">
                    Tipo(s): {targetPokemon.types.join(' / ')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: GAME AND ROUTE */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <h4 className="text-sm font-bold text-slate-800">Localização e Jogo</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Gamepad2 className="w-3.5 h-3.5" /> Jogo Utilizado
                </label>
                <select
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {GAMES_LIST.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Nome do Save (Arquivo)
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Ex: Save 1, Principal..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Rota / Local
                </label>
                <input
                  type="text"
                  required
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  placeholder="Ex: Rota 101, Safari de Amizade, Caverna..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {targetPokemon && (
                <div className="space-y-1.5 col-span-1 md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1">📍 Rotas recomendadas de {targetPokemon.name} para o jogo ({game})</span>
                    {loadingRoutes && <span className="text-indigo-600 animate-pulse text-[10px]">Buscando rotas...</span>}
                  </label>
                  {apiRoutes.length > 0 ? (
                    <select
                      value={selectedApiRouteUrl}
                      onChange={(e) => handleApiRouteSelect(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-amber-300 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-slate-700"
                    >
                      <option value="">-- Selecione uma das rotas encontradas pela API (Auto-preenche a rota e os Pokémons) --</option>
                      {apiRoutes.map(r => (
                        <option key={r.url} value={r.url}>{r.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200/60 leading-normal">
                      {loadingRoutes ? 'Buscando localizações na PokéAPI...' : `Nenhuma rota nativa cadastrada na PokéAPI para ${targetPokemon.name} em ${game}. Não tem problema! Digite sua rota acima e adicione os outros Pokémon da rota manualmente se desejar.`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* STEP 3: HUNTING METHOD AND MODIFIERS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <h4 className="text-sm font-bold text-slate-800">Método de Caça e Itens</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5" /> Método Utilizado
                </label>
                <select
                  value={methodId}
                  onChange={(e) => handleMethodChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {HUNTING_METHODS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  {selectedMethod.description}
                </p>
              </div>

              {/* Has Shiny Charm Checkbox */}
              <div className="flex flex-col justify-center p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasShinyCharm}
                    onChange={(e) => setHasShinyCharm(e.target.checked)}
                    className="w-4 h-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Possui Shiny Charm (Amuleto Brilhante)</span>
                    <span className="text-[10px] text-slate-400">Aumenta a probabilidade adicionando mais rolagens extras.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Method specific modifiers (like chain length / sandwich lvl) */}
            {selectedMethod.hasModifier && modifierValue !== undefined && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 animate-in fade-in slide-in-from-top-1">
                <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                  <label htmlFor="method-modifier" className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-500" />
                    {selectedMethod.modifierLabel}
                  </label>
                  <span className="font-mono bg-white border border-slate-200 px-2 py-0.5 rounded-sm text-indigo-600">
                    {modifierValue}
                  </span>
                </div>
                <input
                  id="method-modifier"
                  type="range"
                  min={selectedMethod.modifierMin}
                  max={selectedMethod.modifierMax}
                  value={modifierValue}
                  onChange={(e) => setModifierValue(parseInt(e.target.value) || 0)}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            )}
          </div>

          {/* STEP 4: ROUTE ENCOUNTERS (FOR PHASING LOG) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <h4 className="text-sm font-bold text-slate-800">Outros Pokémons da Rota (Para controle de Fase)</h4>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Adicione outros Pokémons que também podem aparecer nesta Rota/Localização. Se você encontrar um deles shiny antes de seu alvo, você poderá marcar a Fase e reiniciar as contagens facilmente!
            </p>

            <PokemonSelector 
              onSelect={handleAddRoutePokemon}
              label="Adicionar Pokémon à Rota"
              placeholder="Pesquise e adicione outros Pokémons, ex: Zubat, Geodude..."
              excludeIds={[targetPokemon?.id || 0, ...routePokemons.map(p => p.id)]}
              id="route-pokemon-selector"
            />

            {loadingRoutePokemons && (
              <div className="flex items-center gap-2 text-xs text-indigo-600 font-bold bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 animate-pulse">
                <span>Carregando lista completa de Pokémon da Rota via PokéAPI...</span>
              </div>
            )}

            {routePokemons.length > 0 && !loadingRoutePokemons && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                {routePokemons.map((p) => (
                  <div key={p.id} className="p-2 border border-slate-200 bg-white rounded-lg flex items-center justify-between group shadow-3xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <img 
                        src={p.spriteNormal} 
                        alt={p.name}
                        className="w-8 h-8 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex flex-col truncate">
                        <span className="text-xs font-semibold text-slate-700 truncate">{p.name}</span>
                        {p.encounterChance !== undefined && (
                          <span className="text-[10px] text-amber-600 font-bold font-mono">Taxa: {p.encounterChance}%</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRoutePokemon(p.id)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STEP 5: NOTES & START DATE */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">5</span>
              <h4 className="text-sm font-bold text-slate-800">Anotações e Data de Início</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Data de Início da Caçada
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Notas / Observações (Opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Caçando com amigo no multiplayer, streamando, etc..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Final Validation Warning if target not selected */}
          {!targetPokemon && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-700 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              Por favor, selecione qual Pokémon você deseja caçar no Passo 1 para continuar.
            </div>
          )}

        </form>

        {/* Action buttons */}
        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-600 bg-white hover:bg-slate-50 font-bold text-xs rounded-lg transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!targetPokemon || !route.trim()}
            onClick={handleSubmit}
            className="flex items-center gap-1 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-xs rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            Começar Caçada Shiny!
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
