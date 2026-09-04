import React, { useState, useEffect } from 'react';
import { 
  Search, Sparkles, Lock, Trophy, Eye, EyeOff, LayoutGrid,
  X, MapPin, Gamepad2, Calendar, BookOpen, Compass, Layers,
  ArrowRight, Loader2, Info
} from 'lucide-react';
import { fetchPokemonList, fetchPokemonEvolutions, PokeApiListItem, EvolutionOption } from '../lib/pokeapi';
import { Hunt } from '../types';

interface ShinyPokedexProps {
  hunts: Hunt[];
  onUpdateHunts: (updated: Hunt[]) => void;
}

interface Generation {
  name: string;
  startId: number;
  endId: number;
}

const GENERATIONS: Generation[] = [
  { name: 'Geração 1 (Kanto)', startId: 1, endId: 151 },
  { name: 'Geração 2 (Johto)', startId: 152, endId: 251 },
  { name: 'Geração 3 (Hoenn)', startId: 252, endId: 386 },
  { name: 'Geração 4 (Sinnoh)', startId: 387, endId: 493 },
  { name: 'Geração 5 (Unova)', startId: 494, endId: 649 },
  { name: 'Geração 6 (Kalos)', startId: 650, endId: 721 },
  { name: 'Geração 7 (Alola)', startId: 722, endId: 809 },
  { name: 'Geração 8 (Galar)', startId: 810, endId: 898 },
  { name: 'Geração 9 (Paldea)', startId: 899, endId: 1025 },
];

export default function ShinyPokedex({ hunts, onUpdateHunts }: ShinyPokedexProps) {
  const [fullList, setFullList] = useState<PokeApiListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGen, setSelectedGen] = useState<string>('all'); // 'all' or startId
  const [filterType, setFilterType] = useState<'all' | 'caught' | 'missing'>('all');
  const [showSilhouettes, setShowSilhouettes] = useState(true);
  const [selectedPokemonForModal, setSelectedPokemonForModal] = useState<PokeApiListItem | null>(null);
  const [evolvingCatchId, setEvolvingCatchId] = useState<string | null>(null);
  const [evolutionOptions, setEvolutionOptions] = useState<EvolutionOption[]>([]);
  const [loadingEvolutions, setLoadingEvolutions] = useState(false);

  // Load legitimate evolutions whenever a Pokemon modal is opened
  useEffect(() => {
    if (!selectedPokemonForModal) {
      setEvolutionOptions([]);
      setEvolvingCatchId(null);
      return;
    }

    let isMounted = true;
    setLoadingEvolutions(true);

    fetchPokemonEvolutions(selectedPokemonForModal.id)
      .then((evos) => {
        if (isMounted) {
          setEvolutionOptions(evos);
          setLoadingEvolutions(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching evolutions:', err);
        if (isMounted) {
          setEvolutionOptions([]);
          setLoadingEvolutions(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedPokemonForModal?.id]);

  // Evolution handler
  const handleEvolve = (huntId: string, phaseNumber: number | undefined, targetItem: EvolutionOption | PokeApiListItem) => {
    const updatedHunts = hunts.map(hunt => {
      if (hunt.id === huntId) {
        const evolvedMini = {
          id: targetItem.id,
          name: targetItem.displayName,
          spriteNormal: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${targetItem.id}.png`,
          spriteShiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${targetItem.id}.png`,
          artworkNormal: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${targetItem.id}.png`,
          artworkShiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${targetItem.id}.png`,
          types: []
        };

        if (phaseNumber === undefined) {
          return {
            ...hunt,
            evolvedTo: evolvedMini
          };
        } else {
          return {
            ...hunt,
            phases: hunt.phases.map(phase => {
              if (phase.phaseNumber === phaseNumber) {
                return {
                  ...phase,
                  evolvedTo: evolvedMini
                };
              }
              return phase;
            })
          };
        }
      }
      return hunt;
    });

    onUpdateHunts(updatedHunts);
    setEvolvingCatchId(null);
    setSelectedPokemonForModal(null); // Close the modal to show the updated pokedex view immediately
  };

  // Parse all caught pokemon from active and completed hunts + phases
  const caughtPokemonMap = React.useMemo(() => {
    const map = new Map<number, { count: number; games: Set<string>; methods: Set<string> }>();
    
    hunts.forEach(hunt => {
      // 1. If completed, target is caught (either evolved or original)
      if (hunt.status === 'completed') {
        const actualPoke = hunt.evolvedTo || hunt.targetPokemon;
        const id = actualPoke.id;
        const record = map.get(id) || { count: 0, games: new Set<string>(), methods: new Set<string>() };
        record.count += 1;
        if (hunt.game) record.games.add(hunt.game);
        if (hunt.methodName) record.methods.add(hunt.methodName);
        map.set(id, record);
      }
      
      // 2. All phased shinies are also caught shinies (either evolved or original)
      hunt.phases.forEach(phase => {
        const actualPoke = phase.evolvedTo || phase.pokemon;
        const id = actualPoke.id;
        const record = map.get(id) || { count: 0, games: new Set<string>(), methods: new Set<string>() };
        record.count += 1;
        if (hunt.game) record.games.add(hunt.game);
        if (hunt.methodName) record.methods.add(hunt.methodName);
        map.set(id, record);
      });
    });

    return map;
  }, [hunts]);

  // Find all individual catches for the selected Pokemon (either original or evolved to this pId)
  const pokemonCatches = React.useMemo(() => {
    if (!selectedPokemonForModal) return [];
    const pId = selectedPokemonForModal.id;
    const catchesList: {
      id: string;
      date: string;
      encounters: number;
      game: string;
      route: string;
      methodName: string;
      saveName: string;
      notes?: string;
      type: string;
      isEvolved: boolean;
      originalPokemon: { name: string; id: number };
      huntId: string;
      phaseNumber?: number;
    }[] = [];

    hunts.forEach(hunt => {
      // 1. Target completed
      const currentPoke = hunt.evolvedTo || hunt.targetPokemon;
      if (hunt.status === 'completed' && currentPoke.id === pId) {
        catchesList.push({
          id: hunt.id,
          date: hunt.endDate || hunt.startDate,
          encounters: hunt.totalEncounters,
          game: hunt.game,
          route: hunt.route,
          methodName: hunt.methodName,
          saveName: hunt.saveName || 'Principal',
          notes: hunt.notes,
          type: 'Alvo Principal',
          isEvolved: !!hunt.evolvedTo,
          originalPokemon: hunt.targetPokemon,
          huntId: hunt.id,
          phaseNumber: undefined
        });
      }

      // 2. Phases
      hunt.phases.forEach(phase => {
        const currentPhasePoke = phase.evolvedTo || phase.pokemon;
        if (currentPhasePoke.id === pId) {
          catchesList.push({
            id: `${hunt.id}-phase-${phase.phaseNumber}`,
            date: phase.date,
            encounters: phase.encounters,
            game: hunt.game,
            route: hunt.route,
            methodName: hunt.methodName,
            saveName: hunt.saveName || 'Principal',
            notes: phase.notes || `Capturado inesperadamente na Fase ${phase.phaseNumber} da caçada.`,
            type: `Fase ${phase.phaseNumber}`,
            isEvolved: !!phase.evolvedTo,
            originalPokemon: phase.pokemon,
            huntId: hunt.id,
            phaseNumber: phase.phaseNumber
          });
        }
      });
    });

    // Sort by date descending (most recent first)
    return catchesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedPokemonForModal, hunts]);

  // Load the cached or fetched Pokémon list from PokéAPI
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const list = await fetchPokemonList();
        setFullList(list);
      } catch (err) {
        console.error('Error loading Pokédex list:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter Pokemon based on search, generation, and capture status
  const filteredPokemon = React.useMemo(() => {
    let result = fullList;

    // Search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.displayName.toLowerCase().includes(term) || 
        String(p.id) === term
      );
    }

    // Generation filter
    if (selectedGen !== 'all') {
      const start = parseInt(selectedGen);
      const genObj = GENERATIONS.find(g => g.startId === start);
      if (genObj) {
        result = result.filter(p => p.id >= genObj.startId && p.id <= genObj.endId);
      }
    }

    // Capture filter
    if (filterType === 'caught') {
      result = result.filter(p => caughtPokemonMap.has(p.id));
    } else if (filterType === 'missing') {
      result = result.filter(p => !caughtPokemonMap.has(p.id));
    }

    return result;
  }, [fullList, searchTerm, selectedGen, filterType, caughtPokemonMap]);

  // Stats
  const totalPokeCount = 1025;
  const uniqueCaughtCount = caughtPokemonMap.size;
  const completionPercent = ((uniqueCaughtCount / totalPokeCount) * 100).toFixed(1);

  return (
    <div className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs animate-in fade-in duration-200">
      
      {/* Header and Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Trophy className="w-5.5 h-5.5 text-amber-500" />
            Pokédex Shiny Nacional
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Seu progresso de caçador de shinies sincronizado de forma automática.
          </p>
        </div>

        {/* Pokédex Progress Bar */}
        <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center gap-4 min-w-[240px]">
          <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center bg-amber-500/10 rounded-full">
            <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold font-mono">
              <span className="text-slate-600">{uniqueCaughtCount} / {totalPokeCount}</span>
              <span className="text-amber-600">{completionPercent}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Number(completionPercent))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Search */}
        <div className="md:col-span-4 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou Nº..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Generation Dropdown */}
        <div className="md:col-span-3">
          <select
            value={selectedGen}
            onChange={(e) => setSelectedGen(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-medium"
          >
            <option value="all">Todas as Gerações (1 a 9)</option>
            {GENERATIONS.map(g => (
              <option key={g.startId} value={g.startId}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* Quick Type Filter Buttons */}
        <div className="md:col-span-3 flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterType === 'all' 
                ? 'bg-white text-slate-800 shadow-3xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType('caught')}
            className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterType === 'caught' 
                ? 'bg-amber-500 text-white shadow-3xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Obtidos
          </button>
          <button
            onClick={() => setFilterType('missing')}
            className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterType === 'missing' 
                ? 'bg-white text-slate-800 shadow-3xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Faltando
          </button>
        </div>

        {/* Silhouette Toggle */}
        <div className="md:col-span-2 flex items-center justify-end">
          <button
            onClick={() => setShowSilhouettes(!showSilhouettes)}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all w-full md:w-auto justify-center"
            title={showSilhouettes ? "Ocultar silhuetas e mostrar nomes" : "Mostrar silhuetas de segredo"}
          >
            {showSilhouettes ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Modo Silhueta</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Mostrar Nomes</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-bold font-mono">Indexando Pokédex Shiny Nacional...</span>
        </div>
      ) : filteredPokemon.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3.5 max-h-[560px] overflow-y-auto pr-2">
          {filteredPokemon.map((p) => {
            const info = caughtPokemonMap.get(p.id);
            const isCaught = !!info;
            
            // Build direct artwork image
            const artworkUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${p.id}.png`;
            const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${p.id}.png`;

            return (
              <div
                key={p.id}
                onClick={() => isCaught && setSelectedPokemonForModal(p)}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all duration-150 relative group ${
                  isCaught
                    ? 'border-amber-300 bg-amber-50/20 shadow-3xs hover:shadow-xs hover:border-amber-400 ring-1 ring-amber-200/50 cursor-pointer hover:scale-[1.03]'
                    : 'border-slate-100 bg-slate-50/50 hover:bg-slate-150/40'
                }`}
              >
                {/* ID Tag */}
                <span className="text-[9px] font-mono font-bold text-slate-400 self-start">
                  #{String(p.id).padStart(4, '0')}
                </span>

                {/* Sparkling Icon for caught ones */}
                {isCaught && (
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-300 absolute top-2.5 right-2.5 animate-pulse" />
                )}

                {/* Image / Silhouette */}
                <div className="w-16 h-16 my-1.5 flex items-center justify-center relative">
                  {isCaught ? (
                    <img
                      src={artworkUrl}
                      alt={p.displayName}
                      onError={(e) => {
                        // fallback to standard mini sprite
                        (e.target as HTMLImageElement).src = spriteUrl;
                      }}
                      className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="relative">
                      <img
                        src={artworkUrl}
                        alt="Silhouette"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = spriteUrl;
                        }}
                        className={`max-w-full max-h-full object-contain select-none pointer-events-none transition-all ${
                          showSilhouettes 
                            ? 'brightness-0 opacity-15' 
                            : 'opacity-40 grayscale'
                        }`}
                        referrerPolicy="no-referrer"
                      />
                      {showSilhouettes && (
                        <Lock className="w-3.5 h-3.5 text-slate-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </div>
                  )}
                </div>

                {/* Name / Info */}
                <div className="w-full truncate">
                  <span className={`text-[11px] font-bold block truncate leading-tight ${
                    isCaught 
                      ? 'text-slate-800' 
                      : showSilhouettes 
                        ? 'text-slate-400/80 font-mono italic' 
                        : 'text-slate-500'
                  }`}>
                    {isCaught ? p.displayName : showSilhouettes ? '???' : p.displayName}
                  </span>
                  
                  {isCaught && info && (
                    <span className="text-[9px] font-mono font-extrabold text-amber-600 block mt-0.5">
                      Obtido ({info.count}x)
                    </span>
                  )}
                </div>

                {/* Hover Details Overlay for caught ones */}
                {isCaught && info && (
                  <div className="absolute inset-0 bg-slate-900/95 rounded-xl p-2.5 flex flex-col justify-center text-left opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10">
                    <span className="text-[10px] font-bold text-amber-400 font-mono border-b border-slate-800 pb-1 mb-1 block">
                      #{String(p.id).padStart(4, '0')} DETALHES
                    </span>
                    <p className="text-[10px] text-white font-medium truncate">
                      <strong>Jogo:</strong> {Array.from(info.games).join(', ') || 'N/A'}
                    </p>
                    <p className="text-[10px] text-white font-medium truncate mt-0.5">
                      <strong>Método:</strong> {Array.from(info.methods).join(', ') || 'N/A'}
                    </p>
                    <p className="text-[10px] text-amber-300 font-bold font-mono mt-1 text-right">
                      Capturas: {info.count}x
                    </p>
                    <span className="text-[9px] font-bold text-indigo-400 font-sans block mt-1 animate-pulse text-center">
                      Clique para histórico →
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-slate-500 space-y-2">
          <EyeOff className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-semibold">Nenhum Pokémon corresponde aos filtros aplicados.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedGen('all');
              setFilterType('all');
            }}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-500"
          >
            Limpar Filtros
          </button>
        </div>
      )}

      {/* DETAILS MODAL */}
      {selectedPokemonForModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200/80 mx-auto relative overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Background design accents */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
            
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="relative bg-amber-500/10 p-2 rounded-2xl border border-amber-200/50 flex-shrink-0">
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${selectedPokemonForModal.id}.png`}
                    alt={selectedPokemonForModal.displayName}
                    className="w-16 h-16 object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${selectedPokemonForModal.id}.png`;
                    }}
                  />
                  <Sparkles className="w-4.5 h-4.5 text-amber-500 fill-amber-300 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold text-slate-800 leading-tight">
                      {selectedPokemonForModal.displayName}
                    </h4>
                    <span className="text-xs font-bold font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/40">
                      #{String(selectedPokemonForModal.id).padStart(4, '0')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Histórico de capturas registradas na Pokédex Shiny
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPokemonForModal(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Catches Timeline/List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[250px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">
                  Registros Encontrados ({pokemonCatches.length})
                </span>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-mono">
                  Total Shiny: {pokemonCatches.length}x
                </span>
              </div>

              {pokemonCatches.length > 0 ? (
                <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {pokemonCatches.map((c, idx) => (
                    <div key={c.id} className="relative pl-9 animate-in slide-in-from-bottom-2 duration-150" style={{ animationDelay: `${idx * 40}ms` }}>
                      {/* Timeline Dot */}
                      <span className="absolute left-2.5 top-2.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white ring-2 ring-amber-100 flex items-center justify-center shadow-3xs" />

                      <div className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl p-4 space-y-3 transition-colors">
                        
                        {/* Header badge with type and date */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                            {c.type}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono font-medium flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(c.date).toLocaleDateString('pt-BR')} às {new Date(c.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Capture Specs */}
                        <div className="grid grid-cols-2 gap-3 text-xs font-medium">
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 uppercase font-mono block">Jogo Utilizado</span>
                            <div className="flex items-center gap-1 text-slate-700">
                              <Gamepad2 className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{c.game}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 uppercase font-mono block">Nome do Save</span>
                            <div className="flex items-center gap-1 text-indigo-700 font-bold font-mono">
                              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{c.saveName}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 uppercase font-mono block">Local de Captura</span>
                            <div className="flex items-center gap-1 text-slate-700">
                              <MapPin className="w-3.5 h-3.5 text-red-500" />
                              <span className="truncate">{c.route}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 uppercase font-mono block">Encontros Atá a Captura</span>
                            <div className="flex items-center gap-1 text-slate-700 font-mono">
                              <Layers className="w-3.5 h-3.5 text-amber-500" />
                              <span className="font-bold text-slate-800">{c.encounters}</span>
                            </div>
                          </div>
                        </div>

                        {/* Method specifications */}
                        <div className="bg-white/80 border border-slate-200/50 p-2.5 rounded-lg text-xs leading-normal flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 uppercase font-mono">Método Utilizado:</span>
                          <span className="text-slate-700 font-bold flex items-center gap-1 font-mono text-[11px]">
                            <Compass className="w-3.5 h-3.5 text-slate-400" />
                            {c.methodName}
                          </span>
                        </div>

                        {/* Custom Notes */}
                        {c.notes && (
                          <div className="bg-amber-50/40 border border-amber-200/30 p-3 rounded-lg text-xs italic text-slate-600 leading-relaxed">
                            <strong>Notas do Caçador:</strong> "{c.notes}"
                          </div>
                        )}

                        {/* Evolution Info & Interactive Panel */}
                        {c.isEvolved && (
                          <div className="bg-emerald-50/60 border border-emerald-200 p-2.5 rounded-lg text-xs flex items-center gap-2 text-emerald-800 font-medium">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                            <span>
                              Este espécime evoluiu de <strong>{c.originalPokemon.name}</strong> para o seu estado atual!
                            </span>
                          </div>
                        )}

                        {evolvingCatchId === c.id ? (
                          <div className="bg-indigo-50/50 border border-indigo-200/90 p-4 rounded-xl space-y-3.5 shadow-3xs animate-in fade-in duration-150">
                            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                              <span className="text-xs font-bold text-indigo-800 flex items-center gap-1.5 font-mono">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-300" />
                                Linha Evolutiva Oficial
                              </span>
                              <button
                                onClick={() => setEvolvingCatchId(null)}
                                className="text-[11px] text-slate-400 hover:text-slate-700 font-bold font-sans cursor-pointer transition-colors"
                              >
                                Fechar
                              </button>
                            </div>

                            {loadingEvolutions ? (
                              <div className="py-6 flex flex-col items-center justify-center gap-2 text-indigo-600">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-xs font-medium text-slate-500">Consultando linha evolutiva...</span>
                              </div>
                            ) : evolutionOptions.length === 0 ? (
                              <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3.5 text-center space-y-1">
                                <p className="text-xs font-bold text-slate-700">Forma Final Atingida</p>
                                <p className="text-[11px] text-slate-500">
                                  {selectedPokemonForModal.displayName} já está em seu estágio evolutivo máximo e não possui evoluções adicionais.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                <p className="text-[11px] text-slate-600 leading-normal">
                                  Escolha a evolução legítima abaixo. O <strong>{selectedPokemonForModal.displayName}</strong> dará lugar à sua forma evoluída na Pokédex Shiny, preservando todo o histórico de caçada e encontros:
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {evolutionOptions.map((evo) => (
                                    <div
                                      key={evo.id}
                                      className="bg-white border border-indigo-100 hover:border-indigo-300 hover:shadow-xs p-3 rounded-xl flex items-center justify-between gap-2.5 transition-all group"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-10 h-10 bg-amber-50/80 border border-amber-200/60 rounded-lg flex items-center justify-center shrink-0">
                                          <img
                                            src={evo.spriteShiny}
                                            alt={evo.displayName}
                                            className="w-9 h-9 object-contain"
                                            referrerPolicy="no-referrer"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evo.id}.png`;
                                            }}
                                          />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <h5 className="text-xs font-bold text-slate-800 truncate">
                                              {evo.displayName}
                                            </h5>
                                            <span className="text-[9px] font-mono text-slate-400">
                                              #{String(evo.id).padStart(4, '0')}
                                            </span>
                                          </div>
                                          {evo.triggerDescription && (
                                            <span className="inline-block text-[9px] font-semibold text-indigo-600 bg-indigo-50/90 px-1.5 py-0.2 rounded mt-0.5 truncate max-w-full">
                                              {evo.triggerDescription}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <button
                                        onClick={() => handleEvolve(c.huntId, c.phaseNumber, evo)}
                                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-3xs transition-all cursor-pointer hover:scale-[1.02]"
                                        title={`Evoluir para ${evo.displayName}`}
                                      >
                                        <span>Evoluir</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-1">
                            {!loadingEvolutions && evolutionOptions.length === 0 ? (
                              <span className="text-[10px] font-bold text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                                Forma Final
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {loadingEvolutions ? 'Verificando evolução...' : `${evolutionOptions.length} evolução(ões) disponível(is)`}
                              </span>
                            )}

                            {!loadingEvolutions && evolutionOptions.length === 0 ? (
                              <button
                                disabled
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-lg cursor-not-allowed opacity-75"
                              >
                                <span>Sem Evoluções</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setEvolvingCatchId(c.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-3xs hover:shadow-2xs"
                              >
                                <span>Evoluir este Shiny</span>
                                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-300" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Nenhum registro individual de captura pôde ser mapeado no histórico.
                </div>
              )}
            </div>

            {/* Close footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPokemonForModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer"
              >
                Voltar à Pokédex
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
