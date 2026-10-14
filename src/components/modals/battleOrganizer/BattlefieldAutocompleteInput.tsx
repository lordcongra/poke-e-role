import React, { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';

export interface AutocompleteSuggestion {
    name: string;
    rounds?: number;
    supported?: boolean;
    category?: string;
}

export interface BattlefieldAutocompleteInputProps {
    value: string;
    onChange: (text: string) => void;
    onSelect: (item: AutocompleteSuggestion) => void;
    suggestions: AutocompleteSuggestion[];
    placeholder?: string;
    style?: React.CSSProperties;
    className?: string;
}

export function BattlefieldAutocompleteInput({
    value,
    onChange,
    onSelect,
    suggestions,
    placeholder,
    style,
    className
}: BattlefieldAutocompleteInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (item: AutocompleteSuggestion) => {
        onSelect(item);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', flex: 1, ...style }}>
            <input
                type="text"
                className={className || 'bo-input bo-input--underline text-label'}
                value={value}
                onFocus={() => setIsOpen(true)}
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                placeholder={placeholder}
                style={{ width: '100%' }}
            />

            {isOpen && suggestions.length > 0 && (
                <div className="bo-move-autocomplete-dropdown">
                    {suggestions.map((item) => (
                        <div
                            key={item.name}
                            className="bo-move-autocomplete-item"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(item);
                            }}
                        >
                            <span className="bo-move-autocomplete-name">{item.name}</span>
                            {item.supported && (
                                <span
                                    className="bo-supported-badge"
                                    title="Supported: Automated in roll calculations (damage reduction or +2 Dexterity bonus)"
                                >
                                    <Zap size={10} className="bo-chip-zap" />
                                    <span>Supported</span>
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
