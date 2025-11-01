
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selected: Set<string>;
  onChange: (newSelection: Set<string>) => void;
  icon?: React.ReactNode;
}

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({ label, options, selected, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      onChange(new Set(['All', ...options]));
    } else {
      onChange(new Set());
    }
  };

  const handleSelectOption = (option: string) => {
    const newSelection = new Set(selected);
    if (newSelection.has(option)) {
      newSelection.delete(option);
      newSelection.delete('All');
    } else {
      newSelection.add(option);
      if (options.every(opt => newSelection.has(opt))) {
        newSelection.add('All');
      }
    }
    onChange(newSelection);
  };
  
  const isAllSelected = selected.has('All');

  const selectionText = useMemo(() => {
    if (isAllSelected || selected.size === 0) return `All ${label}`;
    if (selected.size === 1) return Array.from(selected)[0];
    return `${selected.size} ${label} selected`;
  }, [selected, isAllSelected, label]);

  return (
    <div ref={wrapperRef} className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-1.5 border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50 min-w-[180px] justify-between">
        {icon}
        <span className="flex-1 text-left">{selectionText}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 z-30 mt-1 w-64 bg-white border border-brand-gray-300 rounded-md shadow-lg">
          <div className="p-2 border-b">
            <label className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-brand-gray-100 rounded">
              <input type="checkbox" checked={isAllSelected} onChange={e => handleSelectAll(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"/>
              <span className="font-semibold">All {label}</span>
            </label>
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {options.map(option => (
              <label key={option} className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-brand-gray-100 rounded">
                <input type="checkbox" checked={selected.has(option)} onChange={() => handleSelectOption(option)} className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"/>
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
