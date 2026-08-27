import React from 'react';
import { 
  Trophy, Flame, Clock, Sparkles, Star, Download, Upload, 
  HelpCircle, Trash2, ShieldAlert, Award, Hash, Zap
} from 'lucide-react';
import { Hunt } from '../types';

interface StatsOverviewProps {
  hunts: Hunt[];
  onImportData: (data: string) => void;
  onClearAllData: () => void;
}

export default function StatsOverview({
  hunts,
  onImportData,
  onClearAllData
}: StatsOverviewProps) {
  
  // Calculate stats
  const totalHunts = hunts.length;
  const completedHunts = hunts.filter(h => h.status === 'completed');
  const activeHunts = hunts.filter(h => h.status === 'hunting');
  
  const totalEncounters = hunts.reduce((acc, curr) => acc + curr.totalEncounters, 0);
  const totalSeconds = hunts.reduce((acc, curr) => acc + curr.totalTimeSeconds, 0);
  
  // Total phases found across all hunts
  const totalPhases = hunts.reduce((acc, curr) => acc + curr.phases.length, 0);
  const totalShiniesFound = completedHunts.length + totalPhases;

  // Format total seconds into hours, minutes
  const formatTotalTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  };

  // Average encounters to find a shiny target (only calculated over completed hunts)
  const averageEncountersCompleted = completedHunts.length > 0 
    ? Math.round(completedHunts.reduce((acc, curr) => acc + curr.totalEncounters, 0) / completedHunts.length)
    : 0;

  // Export Data to JSON
  const handleExportData = () => {
    const dataStr = JSON.stringify(hunts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shiny-hunter-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import JSON trigger
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        onImportData(content);
      }
    };
    reader.readAsText(file);
  };

  // Clear all data with double warning
  const handleResetClick = () => {
    onClearAllData();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6" id="stats-overview-panel">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-500" />
            Estatísticas Globais de Caça
          </h3>
          <p className="text-xs text-slate-400">Resumo acumulado de todas as suas aventuras e conquistas.</p>
        </div>
        
        {/* Backup / Restore Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-semibold shadow-3xs transition-all cursor-pointer"
            title="Salvar cópia de segurança em arquivo JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Backup</span>
          </button>
          
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-semibold shadow-3xs transition-all cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Importar Backup</span>
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportFileChange}
              className="hidden" 
            />
          </label>
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
            <Star className="w-6 h-6 fill-amber-500" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shinies Obtidos</span>
            <strong className="text-2xl font-extrabold text-slate-800 font-mono block">{totalShiniesFound}</strong>
            <span className="text-[9px] text-slate-500 font-mono">{completedHunts.length} alvos / {totalPhases} fases</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
            <Hash className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Encontros</span>
            <strong className="text-2xl font-extrabold text-slate-800 font-mono block">{totalEncounters}</strong>
            <span className="text-[9px] text-slate-500">Média de {totalHunts > 0 ? Math.round(totalEncounters / totalHunts) : 0} por hunt</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tempo de Caça</span>
            <strong className="text-2xl font-extrabold text-slate-800 font-mono block">{formatTotalTime(totalSeconds)}</strong>
            <span className="text-[9px] text-slate-500">Horas e minutos dedicados</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg">
            <Zap className="w-6 h-6 fill-rose-500" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Média p/ Alvo</span>
            <strong className="text-2xl font-extrabold text-slate-800 font-mono block">
              {averageEncountersCompleted > 0 ? averageEncountersCompleted : 'N/A'}
            </strong>
            <span className="text-[9px] text-slate-500">Encontros nas bem-sucedidas</span>
          </div>
        </div>

      </div>

      {/* Hall of Fame / Completed Hunts Showcase */}
      {completedHunts.length > 0 ? (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500 fill-amber-300" />
            Galeria de Sucessos (Hall of Fame)
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {completedHunts.map((hunt) => (
              <div 
                key={hunt.id} 
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3.5 hover:shadow-xs hover:border-slate-300 transition-all group relative overflow-hidden"
              >
                {/* Decorative background star */}
                <Star className="w-16 h-16 text-amber-500/5 absolute -right-3 -bottom-3 rotate-12 transition-transform group-hover:scale-125" />
                
                <img 
                  src={hunt.targetPokemon.spriteShiny} 
                  alt={hunt.targetPokemon.name}
                  className="w-12 h-12 object-contain filter drop-shadow-sm group-hover:scale-110 transition-transform"
                  referrerPolicy="no-referrer"
                />

                <div className="truncate space-y-0.5">
                  <h5 className="text-xs font-bold text-slate-800 group-hover:text-amber-600 transition-colors truncate">
                    {hunt.targetPokemon.name}
                  </h5>
                  <div className="text-[10px] font-mono font-medium text-slate-500 flex flex-col">
                    <span className="text-slate-800">
                      Encontros: <strong className="font-extrabold">{hunt.totalEncounters}</strong>
                    </span>
                    <span>{hunt.game}</span>
                    <span className="text-slate-400 text-[9px]">
                      Concluído: {hunt.endDate ? new Date(hunt.endDate).toLocaleDateString('pt-BR') : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center p-6 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl text-slate-500 text-xs">
          Ainda não há caçadas concluídas. Capture o seu primeiro shiny alvo para inaugurar a sua Galeria de Sucessos!
        </div>
      )}

      {/* Dangerous Danger Zone */}
      <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
        <span className="text-slate-400 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-slate-300" />
          Dica: Use backups regulares para evitar perder seus registros.
        </span>
        
        <button
          onClick={handleResetClick}
          className="flex items-center gap-1 px-3 py-1.5 border border-red-200 hover:border-red-300 bg-red-50 text-red-600 hover:text-red-700 font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Apagar Todos os Dados</span>
        </button>
      </div>
    </div>
  );
}
