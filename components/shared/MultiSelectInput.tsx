import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { XIcon } from '../icons/XIcon';
import { CheckIcon } from '../icons/CheckIcon';

interface MultiSelectInputProps {
  label: string;
  placeholder: string;
  data: string[];
  items: string[];
  onItemsChange: (items: string[]) => void;
  aiItems?: Set<string>;
  chipColorClass?: string;
  onAiSuggest?: () => void;
  isAiLoading?: boolean;
  singleSelect?: boolean;
  tooltip?: string;
  error?: boolean;
}

export const MultiSelectInput: React.FC<MultiSelectInputProps> = ({
  label,
  placeholder,
  data,
  items,
  onItemsChange,
  aiItems = new Set(),
  chipColorClass = 'bg-gray-100 text-gray-800',
  onAiSuggest,
  isAiLoading,
  singleSelect = false,
  tooltip,
  error = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [debouncedInputValue, setDebouncedInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedInputValue(inputValue);
    }, 250);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]);

  const filteredData = useMemo(() => data.filter(
    (item) => item.toLowerCase().includes(debouncedInputValue.toLowerCase())
  ), [data, debouncedInputValue]);

  const isCreatable = useMemo(() => 
    inputValue.trim() !== '' && 
    !data.some(d => d.toLowerCase() === inputValue.trim().toLowerCase()) && 
    !items.some(i => i.toLowerCase() === inputValue.trim().toLowerCase()),
  [inputValue, data, items]);

  const handleToggleItem = (item: string) => {
    if (singleSelect) {
      const newItems = items.includes(item) ? [] : [item];
      onItemsChange(newItems);
    } else {
      const newItems = items.includes(item)
        ? items.filter((i) => i !== item)
        : [...items, item];
      onItemsChange(newItems);
    }
  };
  
  const handleCreateItem = (item: string) => {
    const trimmedItem = item.trim();
    if (trimmedItem) {
      if (singleSelect) {
        onItemsChange([trimmedItem]);
      } else if (!items.includes(trimmedItem)) {
        onItemsChange([...items, trimmedItem]);
      }
    }
    setInputValue('');
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0) {
           if (isCreatable && activeIndex === filteredData.length) {
                handleCreateItem(inputValue);
            } else if (filteredData[activeIndex]) {
                handleToggleItem(filteredData[activeIndex]);
            }
        } else if (isCreatable) {
            handleCreateItem(inputValue);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, filteredData.length + (isCreatable ? 0 : -1)));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Backspace':
        if (inputValue === '' && items.length > 0) {
          onItemsChange(items.slice(0, -1));
        }
        break;
    }
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  useEffect(() => {
      setActiveIndex(-1);
  }, [debouncedInputValue]);


  return (
    <div ref={wrapperRef} title={tooltip}>
      <label className="block text-sm font-medium text-brand-gray-700">{label}</label>
      <div className="relative mt-1">
        <div 
            className={`flex flex-wrap gap-2 p-2 pr-8 border rounded-md min-h-[40px] items-center bg-white focus-within:ring-1 focus-within:ring-brand-blue focus-within:border-brand-blue ${error ? 'border-red-500' : 'border-brand-gray-300'}`} 
            onClick={() => { setIsOpen(true); inputRef.current?.focus(); }}
        >
          {items.map((item) => (
            <span
              key={item}
              className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${chipColorClass}`}
            >
              {aiItems.has(item) && <AiSparkleIcon className="w-3 h-3 text-brand-blue" />}
              {item}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleToggleItem(item); }}
                className="text-gray-500 hover:text-gray-700"
                aria-label={`Remove ${item}`}
              >
                <XIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input 
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className="flex-grow bg-transparent focus:outline-none text-sm"
            placeholder={items.length === 0 ? placeholder : ''}
            onFocus={() => setIsOpen(true)}
          />
        </div>
        {isOpen && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-brand-gray-300 rounded-md shadow-lg">
            {onAiSuggest && (
                 <button onClick={onAiSuggest} disabled={isAiLoading} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-brand-blue hover:bg-blue-50 border-b disabled:opacity-50">
                    <AiSparkleIcon className={`w-4 h-4 ${isAiLoading ? 'animate-aiPulse' : ''}`} />
                    {isAiLoading ? 'Suggesting...' : 'Suggest with AI'}
                </button>
            )}
            <div className="max-h-56 overflow-auto">
                {filteredData.map((item, index) => (
                  <div
                    key={item}
                    onClick={() => handleToggleItem(item)}
                    className={`px-4 py-2 text-sm text-brand-gray-800 cursor-pointer flex items-center gap-3 ${activeIndex === index ? 'bg-brand-gray-100' : 'hover:bg-brand-gray-100'}`}
                  >
                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${items.includes(item) ? 'bg-brand-blue border-brand-blue' : 'bg-white border-brand-gray-400'}`}>
                        {items.includes(item) && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
                {isCreatable && (
                  <div
                    onClick={() => handleCreateItem(inputValue)}
                    className={`px-4 py-2 text-sm text-brand-gray-800 cursor-pointer hover:bg-brand-gray-100 ${activeIndex === filteredData.length ? 'bg-brand-gray-100' : ''}`}
                  >
                    + Add "{inputValue}"
                  </div>
                )}
                {filteredData.length === 0 && !isCreatable && (
                  <div className="px-4 py-2 text-sm text-brand-gray-500">
                    No results found
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};