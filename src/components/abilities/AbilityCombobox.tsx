import { useEffect, useState, useRef } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { loadLocalDataset, ALL_ABILITIES } from '../../utils/api';
import { TooltipIcon } from '../ui/TooltipIcon';
import { TagBuilderModal } from '../modals/items/TagBuilderModal';
import { ArrowLeftRight, RotateCcw, Check, Tag } from 'lucide-react';
import './AbilityCombobox.css';

interface AbilityComboboxProps {
    onOpenAbilityModal: () => void;
}

export function AbilityCombobox({ onOpenAbilityModal }: AbilityComboboxProps) {
    const ability = useCharacterStore((state) => state.identity.ability || '');
    const availableAbilities = useCharacterStore((state) => state.identity.availableAbilities || []);
    const previousNativeAbility = useCharacterStore((state) => state.identity.previousNativeAbility || '');
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const role = useCharacterStore((state) => state.role);
    const roomCustomAbilities = useCharacterStore((state) => state.roomCustomAbilities || []);

    const [allAbilitiesList, setAllAbilitiesList] = useState<string[]>([]);
    const [isAbilityDropdownOpen, setIsAbilityDropdownOpen] = useState(false);
    const [abilitySearch, setAbilitySearch] = useState('');
    const [showAbilityTagBuilder, setShowAbilityTagBuilder] = useState(false);
    const abilityContainerRef = useRef<HTMLDivElement>(null);

    const filteredAbilities = roomCustomAbilities.filter((ab) => role === 'GM' || !ab.gmOnly);

    useEffect(() => {
        loadLocalDataset()
            .then(() => {
                setAllAbilitiesList([...ALL_ABILITIES]);
            })
            .catch((error) => console.error('[AbilityCombobox] Failed to load local dataset:', error));
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (abilityContainerRef.current && !abilityContainerRef.current.contains(event.target as Node)) {
                setIsAbilityDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const nativeAbilities = availableAbilities;
    const hasMultipleAbilities = nativeAbilities.length >= 2;

    const handleQuickSwap = () => {
        if (!hasMultipleAbilities) return;
        const current = ability.toLowerCase().trim();
        const currentIndex = nativeAbilities.findIndex((a) => a.toLowerCase().trim() === current);

        let nextAbility = nativeAbilities[0];
        if (currentIndex >= 0) {
            nextAbility = nativeAbilities[(currentIndex + 1) % nativeAbilities.length];
        } else if (previousNativeAbility) {
            nextAbility = previousNativeAbility;
        }
        setIdentity('ability', nextAbility);
    };

    const isOverride = Boolean(
        previousNativeAbility &&
        previousNativeAbility !== ability &&
        nativeAbilities.length > 0 &&
        !nativeAbilities.some((a) => a.toLowerCase().trim() === ability.toLowerCase().trim())
    );

    const searchTrimmed = abilitySearch.toLowerCase().trim();

    const matchingNative = nativeAbilities.filter((a) => !searchTrimmed || a.toLowerCase().includes(searchTrimmed));

    const matchingCustom = filteredAbilities.filter(
        (ca) =>
            (!searchTrimmed || ca.name.toLowerCase().includes(searchTrimmed)) &&
            !nativeAbilities.some((na) => na.toLowerCase().trim() === ca.name.toLowerCase().trim())
    );

    const matchingCanon = allAbilitiesList
        .filter(
            (ab) =>
                (!searchTrimmed || ab.toLowerCase().includes(searchTrimmed)) &&
                !nativeAbilities.some((na) => na.toLowerCase().trim() === ab.toLowerCase().trim()) &&
                !matchingCustom.some((ca) => ca.name.toLowerCase().trim() === ab.toLowerCase().trim())
        )
        .slice(0, 25);

    const hasExactMatch =
        nativeAbilities.some((a) => a.toLowerCase().trim() === searchTrimmed) ||
        matchingCustom.some((ca) => ca.name.toLowerCase().trim() === searchTrimmed) ||
        matchingCanon.some((a) => a.toLowerCase().trim() === searchTrimmed);

    return (
        <div className="identity-grid__row">
            <span className="identity-grid__label text-label">
                Ability <TooltipIcon onClick={onOpenAbilityModal} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '2px' }}>
                <div style={{ display: 'flex', gap: '4px', width: '100%', alignItems: 'center' }}>
                    <div className="ability-combobox-wrapper" ref={abilityContainerRef}>
                        <input
                            type="text"
                            className="identity-grid__input text-label"
                            value={isAbilityDropdownOpen ? abilitySearch : ability}
                            onChange={(event) => {
                                setAbilitySearch(event.target.value);
                                if (!isAbilityDropdownOpen) setIsAbilityDropdownOpen(true);
                            }}
                            onFocus={() => {
                                setAbilitySearch(ability);
                                setIsAbilityDropdownOpen(true);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    if (abilitySearch.trim()) {
                                        setIdentity('ability', abilitySearch.trim());
                                    }
                                    setIsAbilityDropdownOpen(false);
                                } else if (event.key === 'Escape') {
                                    setIsAbilityDropdownOpen(false);
                                }
                            }}
                            placeholder="Type or select ability..."
                            style={{ width: '100%' }}
                        />

                        {isAbilityDropdownOpen && (
                            <div className="ability-dropdown-menu">
                                {/* Species Abilities */}
                                {matchingNative.length > 0 && (
                                    <>
                                        <div className="ability-dropdown-menu__header">Species Abilities</div>
                                        {matchingNative.map((ab, idx) => {
                                            const isCurrent = ability.toLowerCase().trim() === ab.toLowerCase().trim();
                                            let slotLabel = `Slot ${idx + 1}`;
                                            if (ab.includes('(HA)') || idx === 2) slotLabel = 'HA';
                                            return (
                                                <div
                                                    key={ab}
                                                    className={`ability-dropdown-menu__item ${isCurrent ? 'ability-dropdown-menu__item--selected' : ''}`}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setIdentity('ability', ab);
                                                        setIsAbilityDropdownOpen(false);
                                                    }}
                                                >
                                                    <span>{ab}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span className="ability-dropdown-menu__badge">
                                                            {slotLabel}
                                                        </span>
                                                        {isCurrent && (
                                                            <Check size={12} color="var(--primary, #3b82f6)" />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}

                                {/* Homebrew Workshop Abilities */}
                                {matchingCustom.length > 0 && (
                                    <>
                                        <div className="ability-dropdown-menu__header">Homebrew Workshop</div>
                                        {matchingCustom.map((ca) => {
                                            const isCurrent =
                                                ability.toLowerCase().trim() === ca.name.toLowerCase().trim();
                                            return (
                                                <div
                                                    key={ca.name}
                                                    className={`ability-dropdown-menu__item ${isCurrent ? 'ability-dropdown-menu__item--selected' : ''}`}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setIdentity('ability', ca.name);
                                                        setIsAbilityDropdownOpen(false);
                                                    }}
                                                >
                                                    <span>{ca.name}</span>
                                                    <span className="ability-dropdown-menu__badge ability-dropdown-menu__badge--homebrew">
                                                        Homebrew
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}

                                {/* Canon Abilities */}
                                {matchingCanon.length > 0 && (
                                    <>
                                        <div className="ability-dropdown-menu__header">Canon Abilities</div>
                                        {matchingCanon.map((ab) => {
                                            const isCurrent = ability.toLowerCase().trim() === ab.toLowerCase().trim();
                                            return (
                                                <div
                                                    key={ab}
                                                    className={`ability-dropdown-menu__item ${isCurrent ? 'ability-dropdown-menu__item--selected' : ''}`}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setIdentity('ability', ab);
                                                        setIsAbilityDropdownOpen(false);
                                                    }}
                                                >
                                                    <span>{ab}</span>
                                                    {isCurrent && <Check size={12} color="var(--primary, #3b82f6)" />}
                                                </div>
                                            );
                                        })}
                                    </>
                                )}

                                {/* Freeform Custom Entry */}
                                {searchTrimmed && !hasExactMatch && (
                                    <div
                                        className="ability-dropdown-menu__item"
                                        style={{ fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.1)' }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setIdentity('ability', abilitySearch.trim());
                                            setIsAbilityDropdownOpen(false);
                                        }}
                                    >
                                        <span>
                                            Use custom: <strong>"{abilitySearch.trim()}"</strong>
                                        </span>
                                        <span className="ability-dropdown-menu__badge">Custom</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 1-Click Quick-Swap Button */}
                    {hasMultipleAbilities && (
                        <button
                            type="button"
                            onClick={handleQuickSwap}
                            className="action-button action-button--dark"
                            style={{
                                padding: '0 6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '24px'
                            }}
                            title="Quick-swap between native abilities"
                        >
                            <ArrowLeftRight size={13} />
                        </button>
                    )}

                    {/* Tag Builder Button */}
                    <button
                        type="button"
                        onClick={() => setShowAbilityTagBuilder(true)}
                        className="action-button action-button--dark"
                        style={{
                            padding: '0 6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '24px'
                        }}
                        title="Configure Smart Tags for Ability"
                    >
                        <Tag size={13} />
                    </button>
                </div>

                {/* Active Battle Override Pill & Revert */}
                {isOverride && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.75rem',
                            marginTop: '1px'
                        }}
                    >
                        <span className="text-subtext" style={{ color: 'var(--accent-warning, #f59e0b)' }}>
                            Override: <strong>{ability}</strong>
                        </span>
                        <button
                            type="button"
                            className="action-button action-button--dark"
                            style={{
                                padding: '1px 6px',
                                fontSize: '0.72rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                            }}
                            onClick={() => setIdentity('ability', previousNativeAbility)}
                            title={`Revert to native ${previousNativeAbility}`}
                        >
                            <RotateCcw size={10} /> Revert to {previousNativeAbility}
                        </button>
                    </div>
                )}
            </div>

            {showAbilityTagBuilder && (
                <TagBuilderModal
                    targetId="ability"
                    targetType="ability"
                    onClose={() => setShowAbilityTagBuilder(false)}
                />
            )}
        </div>
    );
}
