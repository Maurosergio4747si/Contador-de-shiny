/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Plus, Trophy, Clock, Trash2, LayoutGrid, 
  HelpCircle, Star, LogIn, Compass, Gamepad2, Layers, MapPin, AlertCircle, RefreshCw
} from 'lucide-react';
import { Hunt } from './types';
import NewHuntModal from './components/NewHuntModal';
import ActiveTracker from './components/ActiveTracker';
import StatsOverview from './components/StatsOverview';
import ConfirmModal from './components/ConfirmModal';

export default function App() {
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [activeHuntId, setActiveHuntId] = useState<string | null>(null);
  const [isCreatingHunt, setIsCreatingHunt] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Load hunts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('shiny_tracker_hunts_v1');
    if (saved) {
      try {
        setHunts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved hunts, using empty array', e);
      }
    } else {
      // Create beautifully illustrative demo hunts for first time experience
      const demoHunts: Hunt[] = [
        {
          id: 'demo-1',
          targetPokemon: {
            id: 4, // Charmander
            name: 'Charmander',
            spriteNormal: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
            spriteShiny: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/4.png',
            artworkNormal: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png',
            artworkShiny: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/4.png',
            types: ['fire']
          },
          route: 'Catering / Picnic',
          methodId: 'masuda_gen6',
          methodName: 'Método Masuda (Geração 6+)',
          game: 'Scarlet & Violet',
          baseOdds: 4096,
          customOdds: 512,
          routePokemons: [],
          startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          endDate: null,
          status: 'hunting',
          totalEncounters: 312,
          currentPhaseEncounters: 312,
          totalTimeSeconds: 14200, // ~3.9h
          currentPhaseTimeSeconds: 14200,
          phases: [],
          hasShinyCharm: true,
          notes: 'Demonstração de caça ativa por cruzamento com Pokémon estrangeiro.'
        },
        {
          id: 'demo-2',
          targetPokemon: {
            id: 150, // Mewtwo
            name: 'Mewtwo',
            spriteNormal: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png',
            spriteShiny: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/150.png',
            artworkNormal: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png',
            artworkShiny: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/150.png',
            types: ['psychic']
          },
          route: 'Cerulean Cave',
          methodId: 'full_odds_gen2_5',
          methodName: 'Full Odds (Geração 2-5)',
          game: 'HeartGold & SoulSilver',
          baseOdds: 8192,
          customOdds: 8192,
          routePokemons: [],
          startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
          endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          status: 'completed',
          totalEncounters: 2450,
          currentPhaseEncounters: 120, // found in last phase
          totalTimeSeconds: 98000, // ~27.2h
          currentPhaseTimeSeconds: 5000,
          phases: [
            {
              phaseNumber: 1,
              pokemon: {
                id: 41, // Zubat
                name: 'Zubat',
                spriteNormal: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/41.png',
                spriteShiny: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/41.png',
                artworkNormal: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/41.png',
                artworkShiny: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/41.png',
                types: ['poison', 'flying']
              },
              encounters: 2330,
              timeSeconds: 93000,
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          hasShinyCharm: false,
          notes: 'Mewtwo shiny dos sonhos encontrado no Reset de Encontros!'
        }
      ];
      setHunts(demoHunts);
      localStorage.setItem('shiny_tracker_hunts_v1', JSON.stringify(demoHunts));
    }
  }, []);

  // Save hunts on state change
  const saveHunts = (updated: Hunt[]) => {
    setHunts(updated);
    localStorage.setItem('shiny_tracker_hunts_v1', JSON.stringify(updated));
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Create a new hunt
  const handleCreateHunt = (newHunt: Hunt) => {
    const updated = [newHunt, ...hunts];
    saveHunts(updated);
    setIsCreatingHunt(false);
    setActiveHuntId(newHunt.id); // Open tracker instantly!
    showToast(`Caçada de ${newHunt.targetPokemon.name} iniciada!`);
  };

  // Update hunt details in progress
  const handleUpdateHunt = (updatedHunt: Hunt) => {
    const updated = hunts.map(h => h.id === updatedHunt.id ? updatedHunt : h);
    saveHunts(updated);
  };

  // Completed / Caught shiny
  const handleFinishHunt = (finishedHunt: Hunt) => {
    const updated = hunts.map(h => h.id === finishedHunt.id ? finishedHunt : h);
    saveHunts(updated);
    showToast(`Parabéns! ${finishedHunt.targetPokemon.name} Shiny capturado com sucesso! 🎉`);
  };

  // Delete a hunt
  const handleDeleteHunt = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening active tracker
    const name = hunts.find(h => h.id === id)?.targetPokemon.name || 'caçada';
    setConfirmModal({
      isOpen: true,
      title: 'Apagar Caçada',
      message: `Deseja realmente apagar a caçada de ${name}?\nTodos os encontros, tempo de caça e fases registradas serão perdidos para sempre.`,
      onConfirm: () => {
        const updated = hunts.filter(h => h.id !== id);
        saveHunts(updated);
        showToast(`Caçada de ${name} apagada.`);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (activeHuntId === id) {
          setActiveHuntId(null);
        }
      }
    });
  };

  // Import Backup Data
  const handleImportData = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        // Validate basic keys of objects
        const isValid = parsed.every(item => item && item.id && item.targetPokemon && item.route && item.status);
        if (isValid) {
          saveHunts(parsed);
          showToast('Backup restaurado com sucesso!');
        } else {
          showToast('Erro: Formato de caçadas inválido.');
        }
      } else {
        showToast('Erro: O arquivo deve conter uma lista.');
      }
    } catch (err) {
      showToast('Erro ao ler o arquivo JSON de backup.');
    }
  };

  // Reset entire dashboard
  const handleClearAllData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Zerar Banco de Dados',
      message: `AVISO CRÍTICO:\n\nTem certeza de que deseja apagar COMPLETAMENTE todo o seu progresso, caçadas e histórico de Shinies?\nEsta ação é irreversível e apagará todos os dados locais.`,
      onConfirm: () => {
        saveHunts([]);
        showToast('Todos os registros foram apagados.');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Active Hunt
  const activeHunt = hunts.find(h => h.id === activeHuntId);

  // Format Elapsed Time (Hours)
  const formatHours = (seconds: number) => {
    const hrs = seconds / 3600;
    return `${hrs.toFixed(1)}h`;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 antialiased py-8 px-4 sm:px-6 lg:px-8">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3.5 animate-in slide-in-from-bottom-4 duration-300">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Main Application Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5 font-sans select-none">
              <span className="p-1.5 bg-amber-500 rounded-lg text-white shadow-md shadow-amber-500/20">
                <Star className="w-5.5 h-5.5 fill-white stroke-[2.5]" />
              </span>
              Shiny Pokémon Tracker
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Controle profissional de caçadas, rotas, métodos e probabilidades com suporte a fases.
            </p>
          </div>

          {!activeHuntId && (
            <button
              onClick={() => setIsCreatingHunt(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/10 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold text-sm cursor-pointer self-start md:self-auto"
              id="new-hunt-trigger-button"
            >
              <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
              <span>Nova Caçada Shiny</span>
            </button>
          )}
        </header>

        {/* ACTIVE HUNTING SCREEN ROUTER */}
        {activeHuntId && activeHunt ? (
          <div className="space-y-4">
            <ActiveTracker 
              hunt={activeHunt}
              onUpdateHunt={handleUpdateHunt}
              onClose={() => setActiveHuntId(null)}
              onFinishHunt={handleFinishHunt}
            />
          </div>
        ) : (
          /* DASHBOARD VIEW */
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Global Stats Overview Card */}
            <StatsOverview 
              hunts={hunts}
              onImportData={handleImportData}
              onClearAllData={handleClearAllData}
            />

            {/* LISTS SECTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Active/Paused Hunts list */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-500" />
                    Caçadas em Andamento
                  </h3>
                  <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">
                    {hunts.filter(h => h.status === 'hunting').length} Ativas
                  </span>
                </div>

                {hunts.filter(h => h.status === 'hunting').length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {hunts.filter(h => h.status === 'hunting').map((hunt) => (
                      <div 
                        key={hunt.id}
                        onClick={() => setActiveHuntId(hunt.id)}
                        className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden shadow-2xs"
                      >
                        {/* Shimmer star background on hover */}
                        <div className="absolute top-2 right-2 flex gap-1 items-center z-10">
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                            #{String(hunt.targetPokemon.id).padStart(4, '0')}
                          </span>
                        </div>

                        <div className="space-y-4">
                          {/* Pokémon info layout */}
                          <div className="flex items-center gap-4">
                            <div className="relative bg-slate-50 p-1.5 rounded-lg border border-slate-150">
                              <img 
                                src={hunt.targetPokemon.spriteShiny} 
                                alt={hunt.targetPokemon.name}
                                className="w-12 h-12 object-contain group-hover:scale-110 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                              <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400 absolute -top-1 -right-1" />
                            </div>
                            <div className="truncate">
                              <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                {hunt.targetPokemon.name}
                              </h4>
                              <p className="text-xs text-slate-400 font-medium truncate flex items-center gap-1">
                                <Gamepad2 className="w-3.5 h-3.5" />
                                {hunt.game}
                              </p>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Encontros</span>
                              <strong className="text-sm font-extrabold text-slate-700 font-mono block">{hunt.currentPhaseEncounters}</strong>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Tempo</span>
                              <strong className="text-sm font-extrabold text-slate-700 font-mono block">{formatHours(hunt.totalTimeSeconds)}</strong>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Odds (1 em)</span>
                              <strong className="text-sm font-extrabold text-slate-700 font-mono block">{hunt.customOdds}</strong>
                            </div>
                          </div>
                          
                          {/* Location & Phase */}
                          <div className="text-xs font-semibold text-slate-500 space-y-1.5 font-sans">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{hunt.route}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Método:</span>
                              <span className="text-slate-700 font-semibold">{hunt.methodName}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Fase Atual:</span>
                              <span className="bg-amber-100/60 text-amber-700 px-1.5 py-0.5 rounded font-mono text-[10px]">
                                Fase {hunt.phases.length + 1}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-100">
                          <button
                            onClick={(e) => handleDeleteHunt(hunt.id, e)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Apagar Caçada"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          <span className="text-xs font-bold text-indigo-600 group-hover:text-indigo-500 flex items-center gap-0.5 transition-colors">
                            Continuar Caçada →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 px-6 border-2 border-dashed border-slate-200 bg-white rounded-2xl text-slate-500 space-y-3">
                    <Star className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
                    <p className="text-xs font-medium">Nenhuma caçada em andamento no momento.</p>
                    <button
                      onClick={() => setIsCreatingHunt(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Começar Primeira Caçada
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Hall of Fame / Completed list */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-indigo-500" />
                    Histórico de Concluídas
                  </h3>
                  <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">
                    {hunts.filter(h => h.status === 'completed').length} Concluídas
                  </span>
                </div>

                {hunts.filter(h => h.status === 'completed').length > 0 ? (
                  <div className="space-y-3">
                    {hunts.filter(h => h.status === 'completed').map((hunt) => (
                      <div 
                        key={hunt.id}
                        className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 hover:border-slate-300 transition-colors relative shadow-3xs"
                      >
                        <button
                          onClick={(e) => handleDeleteHunt(hunt.id, e)}
                          className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors p-1 rounded"
                          title="Apagar Registro Histórico"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center gap-3">
                          <img 
                            src={hunt.targetPokemon.spriteShiny} 
                            alt={hunt.targetPokemon.name}
                            className="w-10 h-10 object-contain drop-shadow-xs"
                            referrerPolicy="no-referrer"
                          />
                          <div className="truncate">
                            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              {hunt.targetPokemon.name}
                              <Trophy className="w-3 h-3 text-amber-500 fill-amber-300" />
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate font-medium">
                              {hunt.game} • {hunt.route}
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 grid grid-cols-2 gap-2 text-center text-xs font-mono">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-mono block">Encontros</span>
                            <strong className="text-slate-800 font-bold">{hunt.totalEncounters}</strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-mono block">Fases Realizadas</span>
                            <strong className="text-slate-800 font-bold">{hunt.phases.length}</strong>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono flex justify-between items-center pt-1 border-t border-slate-100">
                          <span>Início: {new Date(hunt.startDate).toLocaleDateString('pt-BR')}</span>
                          <span>Fim: {hunt.endDate ? new Date(hunt.endDate).toLocaleDateString('pt-BR') : 'N/A'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 px-6 border border-dashed border-slate-200 bg-white rounded-xl text-slate-400 text-xs">
                    Nenhum registro de caçada bem-sucedida arquivado ainda.
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* NEW HUNT CREATION SLIDE OVER */}
        {isCreatingHunt && (
          <NewHuntModal 
            onClose={() => setIsCreatingHunt(false)}
            onCreateHunt={handleCreateHunt}
          />
        )}

        {/* CUSTOM CONFIRMATION DIALOG */}
        <ConfirmModal 
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        />

      </div>
    </div>
  );
}

