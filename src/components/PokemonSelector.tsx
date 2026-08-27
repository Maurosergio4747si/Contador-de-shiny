import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Sparkles, X } from 'lucide-react';
import { fetchPokemonList, fetchPokemonDetails, PokeApiListItem } from '../lib/pokeapi';
import { PokemonMini } from '../types';

interface PokemonSelectorProps {
  onSelect: (pokemon: PokemonMini) => void;
  label?: string;
  placeholder?: string;
  excludeIds?: number[];
  id?: string;
}

export default function PokemonSelector({
  onSelect,
  label = 'Selecionar Pokémon',
  placeholder = 'Ex: Pikachu, Charizard...',
  excludeIds = [],
  id = 'pokemon-selector'
}: PokemonSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [fullList, setFullList] = useState<PokeApiListItem[]>([]);
  const [suggestions, setSuggestions] = useState<PokeApiListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const excludeIdsString = (excludeIds || []).join(',');

  // Fetch the full list on mount
  useEffect(() => {
    async function loadList() {
      setLoadingList(true);
      try {
        const list = await fetchPokemonList();
        setFullList(list);
      } catch (err) {
        console.error('Failed to load Pokémon list', err);
      } finally {
        setLoadingList(false);
      }
    }
    loadList();
  }, []);

  // Filter list when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSuggestions(prev => prev.length > 0 ? [] : prev);
      return;
    }

    const term = searchTerm.toLowerCase();
    const parsedExcludeIds = excludeIdsString ? excludeIdsString.split(',').map(Number) : [];
    const filtered = fullList
      .filter(p => {
        const matchesName = p.name.toLowerCase().includes(term) || p.displayName.toLowerCase().includes(term);
        const matchesId = String(p.id) === term;
        const isExcluded = parsedExcludeIds.includes(p.id);
        return (matchesName || matchesId) && !isExcluded;
      })
      .slice(0, 8); // Limit suggestions to 8 items

    setSuggestions(filtered);
  }, [searchTerm, fullList, excludeIdsString]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (item: PokeApiListItem) => {
    setLoadingDetails(true);
    setIsOpen(false);
    setSearchTerm('');
    try {
      const details = await fetchPokemonDetails(item.id);
      onSelect(details);
    } catch (err) {
      console.error('Failed to load Pokémon details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef} id={id}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
        {label}
      </label>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loadingDetails ? (
            <Loader2 className="h-4.5 w-4.5 text-indigo-500 animate-spin" />
          ) : (
            <Search className="h-4.5 w-4.5 text-slate-400" />
          )}
        </div>
        
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={loadingList ? 'Carregando lista de Pokémon...' : placeholder}
          disabled={loadingList || loadingDetails}
          className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 transition-all"
        />

        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-lg shadow-xl max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-100">
          <ul className="py-1">
            {suggestions.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                      #{String(item.id).padStart(4, '0')}
                    </span>
                    <span className="font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {item.displayName}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Selecionar <Sparkles className="w-3 h-3 text-amber-500" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOpen && searchTerm && suggestions.length === 0 && !loadingList && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-lg shadow-xl p-4 text-center text-slate-500 text-sm">
          Nenhum Pokémon encontrado para "{searchTerm}"
        </div>
      )}
    </div>
  );
}
