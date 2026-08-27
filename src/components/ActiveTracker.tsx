import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Trophy, AlertTriangle, 
  Sparkles, Clock, Percent, Calendar, Layers, ChevronRight, 
  Plus, Minus, Music, Music2, Share2, HelpCircle, Save, CheckCircle
} from 'lucide-react';
import { PokemonMini, Hunt, Phase } from '../types';
import { getSerebiiShinyUrl, getSerebiiNormalUrl, padId } from '../lib/pokeapi';
import PokemonSelector from './PokemonSelector';

interface ActiveTrackerProps {
  hunt: Hunt;
  onUpdateHunt: (updated: Hunt) => void;
  onClose: () => void;
  onFinishHunt: (hunt: Hunt) => void;
}

// Web Audio API Retro Sound Effects Generator (no assets needed, 100% reliable!)
function playChimeSound(type: 'click' | 'sparkle' | 'phase') {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    if (type === 'click') {
      // Classic Game Boy click/beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'sparkle') {
      // Shimmering shiny sound!
      const notes = [1046.50, 1318.51, 1567.98, 2093.00]; // C6, E6, G6, C7 arpeggio
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.05);
        gain.gain.setValueAtTime(0.06, ctx.currentTime + index * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.05 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + index * 0.05);
        osc.stop(ctx.currentTime + index * 0.05 + 0.25);
      });
    } else if (type === 'phase') {
      // Surprising chime!
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      osc2.frequency.setValueAtTime(293.66, ctx.currentTime); // D4
      osc2.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15); // A4
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.3);
      osc2.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.warn('Web Audio Context not supported or blocked by browser policy.', e);
  }
}

export default function ActiveTracker({
  hunt,
  onUpdateHunt,
  onClose,
  onFinishHunt
}: ActiveTrackerProps) {
  // Timer States
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(hunt.totalTimeSeconds);
  const [phaseSeconds, setPhaseSeconds] = useState(hunt.currentPhaseTimeSeconds);
  
  // Custom Controls
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [spacebarEnabled, setSpacebarEnabled] = useState(true);
  const [imageSource, setImageSource] = useState<'pokeapi' | 'serebii'>('pokeapi');
  const [showNormal, setShowNormal] = useState(false);
  
  // Phase logging modal state
  const [isPhasing, setIsPhasing] = useState(false);
  const [phasedPokemon, setPhasedPokemon] = useState<PokemonMini | null>(null);
  
  // Ref for timer interval
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const counterBtnRef = useRef<HTMLButtonElement>(null);

  // Ref to store current values of totalSeconds and phaseSeconds to avoid stale closures
  const totalSecondsRef = useRef(totalSeconds);
  const phaseSecondsRef = useRef(phaseSeconds);
  const huntRef = useRef(hunt);

  useEffect(() => {
    totalSecondsRef.current = totalSeconds;
  }, [totalSeconds]);

  useEffect(() => {
    phaseSecondsRef.current = phaseSeconds;
  }, [phaseSeconds]);

  useEffect(() => {
    huntRef.current = hunt;
  }, [hunt]);

  // Synchronize internal timers with props when hunt changes
  useEffect(() => {
    setTotalSeconds(hunt.totalTimeSeconds);
    setPhaseSeconds(hunt.currentPhaseTimeSeconds);
  }, [hunt.id]);

  // Stopwatch/Timer Effect
  useEffect(() => {
    if (isTimerRunning) {
      let ticks = 0;
      const interval = setInterval(() => {
        setTotalSeconds(prev => {
          const next = prev + 1;
          ticks++;
          // Periodically save elapsed time to localStorage via parent update (every 10s to avoid performance hit)
          if (ticks % 10 === 0) {
            onUpdateHunt({
              ...huntRef.current,
              totalTimeSeconds: next,
              currentPhaseTimeSeconds: phaseSecondsRef.current + 1
            });
          }
          return next;
        });
        setPhaseSeconds(prev => prev + 1);
      }, 1000);

      return () => {
        clearInterval(interval);
        // Save exact values when pausing, stopping or unmounting
        onUpdateHunt({
          ...huntRef.current,
          totalTimeSeconds: totalSecondsRef.current,
          currentPhaseTimeSeconds: phaseSecondsRef.current
        });
      };
    }
  }, [isTimerRunning, hunt.id]);

  // Keyboard Event Listener (Spacebar)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!spacebarEnabled) return;
      
      // Do not trigger if user is typing in input or select elements
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' || 
        target.isContentEditable
      ) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault(); // Stop page scrolling
        // Flash button effect
        if (counterBtnRef.current) {
          counterBtnRef.current.classList.add('scale-[0.98]', 'ring-4', 'ring-amber-500/30');
          setTimeout(() => {
            counterBtnRef.current?.classList.remove('scale-[0.98]', 'ring-4', 'ring-amber-500/30');
          }, 80);
        }
        handleIncrement(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spacebarEnabled, hunt.currentPhaseEncounters, hunt.totalEncounters, isTimerRunning]);

  // Helper to trigger save state to the parent component
  const updateHuntState = (fields: Partial<Hunt>) => {
    onUpdateHunt({
      ...hunt,
      ...fields
    });
  };

  const handleIncrement = (amount: number) => {
    // Automatically start timer on first increment if not already running
    if (!isTimerRunning && amount > 0) {
      setIsTimerRunning(true);
    }

    if (soundEnabled) {
      playChimeSound('click');
    }

    const newPhaseEncounters = Math.max(0, hunt.currentPhaseEncounters + amount);
    const newTotalEncounters = Math.max(0, hunt.totalEncounters + amount);

    updateHuntState({
      currentPhaseEncounters: newPhaseEncounters,
      totalEncounters: newTotalEncounters,
      totalTimeSeconds: totalSeconds,
      currentPhaseTimeSeconds: phaseSeconds
    });
  };

  const handleManualCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    const diff = value - hunt.currentPhaseEncounters;
    
    updateHuntState({
      currentPhaseEncounters: value,
      totalEncounters: Math.max(0, hunt.totalEncounters + diff)
    });
  };

  // Phase Handling (Logging Shiny target failure)
  const handleLogPhase = () => {
    setIsTimerRunning(false);
    setIsPhasing(true);
    if (soundEnabled) {
      playChimeSound('phase');
    }
  };

  const handleConfirmPhase = () => {
    if (!phasedPokemon) return;

    const newPhaseNumber = hunt.phases.length + 1;
    const newPhase: Phase = {
      phaseNumber: newPhaseNumber,
      pokemon: phasedPokemon,
      encounters: hunt.currentPhaseEncounters,
      timeSeconds: phaseSeconds,
      date: new Date().toISOString()
    };

    const updatedPhases = [...hunt.phases, newPhase];
    
    // Save phase, reset current phase counters, but KEEP total counters!
    onUpdateHunt({
      ...hunt,
      phases: updatedPhases,
      currentPhaseEncounters: 0,
      currentPhaseTimeSeconds: 0,
      totalTimeSeconds: totalSeconds,
      // Status is still hunting
    });

    // Reset local phase timer
    setPhaseSeconds(0);
    setIsPhasing(false);
    setPhasedPokemon(null);
    setIsTimerRunning(true); // resume search
  };

  // Complete Hunt (Success! Caught target shiny)
  const handleCaptureSuccess = () => {
    setIsTimerRunning(false);
    if (soundEnabled) {
      playChimeSound('sparkle');
    }

    const finishedHunt: Hunt = {
      ...hunt,
      status: 'completed',
      endDate: new Date().toISOString(),
      totalTimeSeconds: totalSeconds,
      currentPhaseTimeSeconds: phaseSeconds
    };

    onFinishHunt(finishedHunt);
  };

  // Math: Cumulative probability P = 1 - (1 - p)^n
  const p = 1 / hunt.customOdds;
  const n = hunt.currentPhaseEncounters;
  const cumulativeProbability = 1 - Math.pow(1 - p, n);
  const cumulativeProbabilityPercent = (cumulativeProbability * 100).toFixed(2);

  // Math: Formatting Time (H:M:S)
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Mean time per encounter (current phase)
  const getAverageTimePerEncounter = () => {
    if (n === 0) return 'N/A';
    const avg = phaseSeconds / n;
    return `${avg.toFixed(1)}s`;
  };

  // Serebii images fallbacks
  const getTargetImage = () => {
    if (imageSource === 'serebii') {
      return showNormal 
        ? getSerebiiNormalUrl(hunt.targetPokemon.id) 
        : getSerebiiShinyUrl(hunt.targetPokemon.id);
    }
    return showNormal 
      ? hunt.targetPokemon.artworkNormal 
      : hunt.targetPokemon.artworkShiny;
  };

  return (
    <div className="w-full bg-slate-50 rounded-2xl border border-slate-200 shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200" id="active-tracker-dashboard">
      
      {/* Tracker Top Header Bar */}
      <div className="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={hunt.targetPokemon.spriteShiny} 
              alt={hunt.targetPokemon.name}
              className="w-10 h-10 object-contain drop-shadow-md animate-pulse"
              referrerPolicy="no-referrer"
            />
            <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400 absolute -top-1 -right-1 animate-ping" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-1.5 font-sans">
              Caçando: <span className="text-amber-400">{hunt.targetPokemon.name}</span>
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>{hunt.game}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              <span>{hunt.route}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Sound Controls */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={soundEnabled ? 'Silenciar Efeitos Sonoros' : 'Ativar Efeitos Sonoros'}
          >
            {soundEnabled ? <Music className="w-4.5 h-4.5" /> : <Music2 className="w-4.5 h-4.5 opacity-60" />}
          </button>

          {/* Spacebar Toggle Control */}
          <button
            onClick={() => setSpacebarEnabled(!spacebarEnabled)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              spacebarEnabled 
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20' 
                : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
            title="Ativar/Desativar espaço para contar"
          >
            Tecla [Espaço]: {spacebarEnabled ? 'Ativa' : 'Inativa'}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all cursor-pointer"
          >
            Voltar ao Menu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        
        {/* Left Column: Visuals & Settings */}
        <div className="lg:col-span-3 p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase font-mono">Visualização</span>
            
            {/* Pokemon Art Canvas */}
            <div className="aspect-square w-full bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center p-4 relative overflow-hidden group shadow-2xs">
              <div className="absolute top-2 right-2 flex gap-1 z-10">
                <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-sm">
                  #{padId(hunt.targetPokemon.id)}
                </span>
              </div>

              {/* Glowing background star effect if shiny */}
              {!showNormal && (
                <div className="absolute inset-0 bg-radial-gradient from-amber-50/60 to-transparent opacity-80 pointer-events-none scale-125 animate-pulse" />
              )}
              
              <img
                src={getTargetImage()}
                alt={hunt.targetPokemon.name}
                className="w-44 h-44 object-contain drop-shadow-xl relative z-10 transition-transform duration-300 hover:scale-110"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback if serebii/external link blocks access
                  if (imageSource === 'serebii') {
                    setImageSource('pokeapi');
                  }
                }}
              />

              {/* Types badge */}
              <div className="flex gap-1.5 mt-2 relative z-10">
                {hunt.targetPokemon.types.map((t) => (
                  <span 
                    key={t}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase text-white shadow-xs"
                    style={{
                      backgroundColor: 
                        t === 'fire' ? '#EF4444' :
                        t === 'water' ? '#3B82F6' :
                        t === 'grass' ? '#10B981' :
                        t === 'electric' ? '#F59E0B' :
                        t === 'ice' ? '#06B6D4' :
                        t === 'fighting' ? '#B91C1C' :
                        t === 'poison' ? '#8B5CF6' :
                        t === 'ground' ? '#D97706' :
                        t === 'flying' ? '#818CF8' :
                        t === 'psychic' ? '#EC4899' :
                        t === 'bug' ? '#84CC16' :
                        t === 'rock' ? '#78350F' :
                        t === 'ghost' ? '#6D28D9' :
                        t === 'dragon' ? '#4F46E5' :
                        t === 'dark' ? '#374151' :
                        t === 'steel' ? '#6B7280' :
                        t === 'fairy' ? '#F472B6' : '#9CA3AF'
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Visual Switches */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-3 shadow-2xs">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Versão:</span>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button 
                    onClick={() => setShowNormal(false)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${!showNormal ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Shiny ✨
                  </button>
                  <button 
                    onClick={() => setShowNormal(true)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${showNormal ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Normal
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Servidor Foto:</span>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button 
                    onClick={() => setImageSource('pokeapi')}
                    className={`px-2 py-1 rounded-md font-medium transition-colors ${imageSource === 'pokeapi' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    title="PokéAPI oficial (Super estável)"
                  >
                    PokéAPI
                  </button>
                  <button 
                    onClick={() => setImageSource('serebii')}
                    className={`px-2 py-1 rounded-md font-medium transition-colors ${imageSource === 'serebii' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    title="Serebii Sprite oficial"
                  >
                    Serebii
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Details Checklist */}
          <div className="space-y-3 text-xs bg-slate-100/50 p-4 rounded-xl border border-slate-200/60">
            <span className="font-bold text-slate-500 block font-mono uppercase tracking-wider text-[10px]">Dados da Caçada</span>
            <div className="space-y-2 font-medium text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-400">Método</span>
                <span className="text-slate-900 font-semibold">{hunt.methodName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-400">Rota / Lugar</span>
                <span className="text-slate-900 font-semibold">{hunt.route}</span>
              </div>
              {hunt.methodModifierValue !== undefined && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Bônus do Método</span>
                  <span className="text-slate-900 font-semibold">{hunt.methodModifierValue}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-400">Shiny Charm</span>
                <span className={`font-semibold ${hunt.hasShinyCharm ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {hunt.hasShinyCharm ? 'Sim ✓' : 'Não ✗'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Iniciado em</span>
                <span className="text-slate-900 font-mono text-[11px]">{new Date(hunt.startDate).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Big Counter & Timer Controls */}
        <div className="lg:col-span-5 p-6 flex flex-col justify-between items-center text-center space-y-6 bg-white">
          <div className="space-y-1 w-full">
            <span className="text-xs font-semibold text-indigo-500 tracking-wider uppercase font-mono">Fase {hunt.phases.length + 1} da Caçada</span>
            <h1 className="text-sm font-medium text-slate-500 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Tempo nesta Fase: <span className="font-mono font-bold text-slate-800">{formatTime(phaseSeconds)}</span>
            </h1>
          </div>

          {/* Interactive Counter Board */}
          <div className="w-full py-4 px-2 space-y-6 flex flex-col items-center">
            {/* Enormous numbers panel */}
            <div className="space-y-1.5 select-none">
              <span className="text-xs font-bold text-slate-400 font-mono tracking-wider block">CONTAGEM ATUAL</span>
              <div className="flex items-center justify-center gap-4">
                <input
                  type="number"
                  value={hunt.currentPhaseEncounters}
                  onChange={handleManualCountChange}
                  className="w-48 text-center text-7xl font-extrabold font-mono text-slate-900 bg-transparent focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 rounded-xl"
                  title="Clique para editar contagem manualmente"
                  min="0"
                />
              </div>
              {hunt.phases.length > 0 && (
                <span className="text-xs font-semibold text-slate-400 font-mono block">
                  Total Geral: <strong className="text-slate-700 font-bold">{hunt.totalEncounters}</strong> encontros
                </span>
              )}
            </div>

            {/* Huge +1 Button */}
            <button
              ref={counterBtnRef}
              onClick={() => handleIncrement(1)}
              className="w-full max-w-sm py-8 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold text-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer relative overflow-hidden group select-none"
              id="active-tracker-increment-button"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-2">
                <Plus className="w-6 h-6 stroke-[3]" />
                <span>1 ENCONTRO</span>
              </div>
              <span className="text-[10px] text-indigo-200 font-mono font-medium block">
                {spacebarEnabled ? 'Ou pressione ESPAÇO no teclado' : ''}
              </span>
            </button>

            {/* Tiny adjust button panel */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleIncrement(-1)}
                className="p-2.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                title="Subtrair 1"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleIncrement(5)}
                className="px-3.5 py-2.5 rounded-lg border border-slate-200 font-mono text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                title="Somar 5"
              >
                +5
              </button>
              <button 
                onClick={() => handleIncrement(10)}
                className="px-3.5 py-2.5 rounded-lg border border-slate-200 font-mono text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                title="Somar 10"
              >
                +10
              </button>
              <button 
                onClick={() => handleIncrement(100)}
                className="px-3.5 py-2.5 rounded-lg border border-slate-200 font-mono text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                title="Somar 100"
              >
                +100
              </button>
            </div>
          </div>

          {/* Session controls: Timer play/pause & finish */}
          <div className="w-full max-w-md pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Play/Pause Timer */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border shadow-xs transition-all cursor-pointer ${
                  isTimerRunning 
                    ? 'bg-amber-500 border-amber-600 text-white hover:bg-amber-600' 
                    : 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-500'
                }`}
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-white" />
                    <span>Pausar Cronômetro</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Iniciar Cronômetro</span>
                  </>
                )}
              </button>
            </div>

            {/* Captured Target Button */}
            <button
              onClick={handleCaptureSuccess}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all font-bold text-sm cursor-pointer"
              title="Marcar caçada como concluída e registrar data de término!"
            >
              <Trophy className="w-4.5 h-4.5 fill-amber-300 stroke-emerald-800" />
              <span>CAPTURADO! 🌟</span>
            </button>
          </div>
        </div>

        {/* Right Column: Probabilities, Phasing & Previous Phases Log */}
        <div className="lg:col-span-4 p-6 flex flex-col justify-between space-y-6 bg-slate-50">
          
          {/* Probability & Probability Stats Panel */}
          <div className="space-y-4">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-amber-500" /> Probabilidades & Tempo
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center">
                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Sua Chance</span>
                <span className="text-xl font-extrabold text-slate-800 font-mono block">1 / {hunt.customOdds}</span>
                <span className="text-[9px] text-slate-400 block font-mono">Odds Modificadas</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center">
                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Encontro Médio</span>
                <span className="text-xl font-extrabold text-slate-800 font-mono block">{getAverageTimePerEncounter()}</span>
                <span className="text-[9px] text-slate-400 block font-mono">Tempo por Pokémon</span>
              </div>
            </div>

            {/* Cumulative Probability Slider/Progress */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex justify-between items-end text-xs">
                <span className="font-semibold text-slate-500">Sorte Acumulada:</span>
                <span className="font-mono font-bold text-indigo-600 text-sm">{cumulativeProbabilityPercent}%</span>
              </div>
              
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    cumulativeProbability >= 0.95 ? 'bg-indigo-600' :
                    cumulativeProbability >= 0.632 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, cumulativeProbability * 100)}%` }}
                />
              </div>
              
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Probabilidade binomial de ter encontrado o shiny após {n} tentativas. No ponto de odds ({hunt.customOdds} encontros), a chance teórica é de ~63.2%.
              </p>
            </div>
          </div>

          {/* Phasing Controls Panel */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Fases da Caça</span>
              <span className="text-[11px] font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
                {hunt.phases.length} Fase(s) anterior(es)
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Se você encontrar outro Pokémon shiny nesta rota que <strong>não seja o {hunt.targetPokemon.name}</strong>, registre uma "fase"! A contagem desta fase será salva e o contador reiniciará para a Fase {hunt.phases.length + 2}.
            </p>

            <button
              onClick={handleLogPhase}
              disabled={n === 0}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-4 border border-dashed border-amber-500 hover:border-amber-600 text-amber-600 hover:text-amber-700 bg-amber-500/5 hover:bg-amber-500/10 disabled:opacity-50 disabled:pointer-events-none rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Registrar Shiny Não-Alvo (Mudar de Fase)</span>
            </button>
          </div>

          {/* Phase History Log */}
          {hunt.phases.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">Histórico de Fases</span>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {hunt.phases.map((p) => (
                  <div key={p.phaseNumber} className="bg-white px-3 py-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs shadow-3xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold bg-slate-100 text-slate-500 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                        F{p.phaseNumber}
                      </span>
                      <img 
                        src={p.pokemon.spriteShiny} 
                        alt={p.pokemon.name}
                        className="w-8 h-8 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span className="font-bold text-slate-800">{p.pokemon.name}</span>
                        <span className="text-[9px] text-slate-400 block font-mono">
                          {new Date(p.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px]">
                      <span className="font-bold text-slate-800">{p.encounters}</span> <span className="text-slate-400">encs</span>
                      <span className="text-[9px] text-slate-400 block">{formatTime(p.timeSeconds)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over/Dialog for Phasing Log */}
      {isPhasing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between flex-shrink-0">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-5 h-5 text-amber-500" />
                  Registrar Fase {hunt.phases.length + 1}
                </h3>
                <p className="text-xs text-slate-500">
                  Qual Pokémon shiny apareceu no encontro {hunt.currentPhaseEncounters}?
                </p>
              </div>
              <button 
                onClick={() => setIsPhasing(false)} 
                className="text-slate-400 hover:text-slate-600 font-semibold text-xs cursor-pointer"
              >
                Cancelar
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 pt-4 space-y-5 overflow-y-auto flex-1 min-h-0">
              {/* Quick selectors from Route Pokemons */}
              {hunt.routePokemons.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Pokémons Possíveis da Rota</span>
                  <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 border border-slate-100 p-2 rounded-lg bg-slate-50/50">
                    {hunt.routePokemons.map((pokemon) => (
                      <button
                        key={pokemon.id}
                        type="button"
                        onClick={() => setPhasedPokemon(pokemon)}
                        className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          phasedPokemon?.id === pokemon.id 
                            ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500' 
                            : 'border-slate-200 hover:border-slate-300 hover:bg-white bg-white'
                        }`}
                      >
                        <img 
                          src={pokemon.spriteNormal} 
                          alt={pokemon.name}
                          className="w-7 h-7 object-contain flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex flex-col truncate">
                          <span className="text-xs font-bold text-slate-700 truncate">{pokemon.name}</span>
                          {pokemon.encounterChance !== undefined && (
                            <span className="text-[10px] text-amber-600 font-bold font-mono">Aparição: {pokemon.encounterChance}%</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallback search selector if the pokemon is not on the default route list */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Outro Pokémon (Pesquisar)</span>
                <PokemonSelector 
                  onSelect={(pokemon) => setPhasedPokemon(pokemon)}
                  label="Pesquisar Pokémon que apareceu"
                  placeholder="Ex: Zubat, Geodude..."
                  id="phased-pokemon-search"
                />
              </div>

              {/* Selected confirmation panel */}
              {phasedPokemon && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={phasedPokemon.spriteShiny} 
                      alt={phasedPokemon.name}
                      className="w-12 h-12 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-400 block font-mono">SHINY ENCONTRADO</span>
                      <strong className="text-sm font-bold text-slate-800">{phasedPokemon.name}</strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 block font-mono">CONTAGEM DA FASE</span>
                    <strong className="text-sm font-extrabold text-slate-800 font-mono">{hunt.currentPhaseEncounters}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="p-6 pt-3 border-t border-slate-100 flex-shrink-0 bg-slate-50/50">
              <button
                onClick={handleConfirmPhase}
                disabled={!phasedPokemon}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl shadow-xs font-bold text-sm transition-all cursor-pointer text-center"
              >
                Registrar Fase e Continuar Caçada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
