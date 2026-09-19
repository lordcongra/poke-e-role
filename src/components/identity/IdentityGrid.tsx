import { useEffect, useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { Rank, SheetMode } from '../../store/storeTypes';
import { loadLocalDataset, SPECIES_URLS } from '../../utils/api';
import { POKEMON_TYPES, TYPE_COLORS, NATURES, AGES, RANKS } from '../../data/constants';
import { TooltipIcon } from '../ui/TooltipIcon';
import { CustomInfoRow } from '../ui/CustomInfoRow';
import { SpeciesSelector } from './SpeciesSelector';
import { StandaloneAvatar } from '../standalone/StandaloneAvatar';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { Plus } from 'lucide-react';
import { AbilityCombobox } from '../abilities/AbilityCombobox';
import { SlotTooltipModal } from '../modals/identity/SlotTooltipModal';
import { CustomInfoDeleteModal } from '../modals/identity/CustomInfoDeleteModal';

interface IdentityGridProps {
    onOpenAbility: () => void;
    onOpenNature: () => void;
    onOpenPokedex: () => void;
    onOpenImagePicker?: () => void;
}

export function IdentityGrid({ onOpenAbility, onOpenNature, onOpenPokedex, onOpenImagePicker }: IdentityGridProps) {
    const identityStore = useCharacterStore((state) => state.identity) || {};
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const setMode = useCharacterStore((state) => state.setMode);

    const customInfo = useCharacterStore((state) => state.customInfo);
    const addCustomInfo = useCharacterStore((state) => state.addCustomInfo);
    const removeCustomInfo = useCharacterStore((state) => state.removeCustomInfo);

    const role = useCharacterStore((state) => state.role);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes || []);
    const roomCustomPokemon = useCharacterStore((state) => state.roomCustomPokemon || []);

    const filteredTypes = roomCustomTypes.filter((type) => role === 'GM' || !type.gmOnly);
    const filteredPokemon = roomCustomPokemon.filter((pokemon) => role === 'GM' || !pokemon.gmOnly);

    const allTypes = [...POKEMON_TYPES, ...filteredTypes.map((type) => type.name)];
    const allTypeColors = {
        ...TYPE_COLORS,
        ...Object.fromEntries(filteredTypes.map((type) => [type.name, type.color]))
    };

    const [speciesList, setSpeciesList] = useState<string[]>([]);
    const [deleteCustomInfoId, setDeleteCustomInfoId] = useState<string | null>(null);
    const [slotTooltipInfo, setSlotTooltipInfo] = useState<{ title: string; desc: string } | null>(null);

    useEffect(() => {
        loadLocalDataset()
            .then(() => {
                const formattedSpecies = Object.keys(SPECIES_URLS).map((species) =>
                    species
                        .split('-')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join('-')
                );
                setSpeciesList(formattedSpecies.sort());
            })
            .catch((error) => console.error('[IdentityGrid] Failed to load local dataset:', error));
    }, []);

    const uniqueSpecies = Array.from(new Set([...speciesList, ...filteredPokemon.map((pokemon) => pokemon.Name)]));

    const getTypeColor = (type?: string) => {
        if (!type || type === 'None' || type === '--') return 'var(--panel-alt)';
        const clean = type.trim();
        const title = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
        return allTypeColors[clean] || allTypeColors[title] || 'var(--panel-alt)';
    };

    return (
        <>
            <div
                className={`identity-grid identity-header__grid ${isStandaloneMode ? 'identity-grid--standalone' : ''}`}
            >
                {isStandaloneMode && <StandaloneAvatar onClick={onOpenImagePicker} />}

                <div className="identity-grid__row">
                    <span className="identity-grid__label text-label">Nickname</span>
                    <input
                        type="text"
                        className="identity-grid__input text-label"
                        value={identityStore.nickname}
                        onChange={(event) => setIdentity('nickname', event.target.value)}
                        placeholder="Nickname..."
                    />
                </div>

                <SpeciesSelector uniqueSpecies={uniqueSpecies} onOpenPokedex={onOpenPokedex} />

                <div className="identity-grid__row">
                    <span className="identity-grid__label text-label">
                        Nature <TooltipIcon onClick={onOpenNature} />
                    </span>
                    <select
                        className="identity-grid__select text-label"
                        value={identityStore.nature}
                        onChange={(event) => setIdentity('nature', event.target.value)}
                    >
                        {NATURES.map((nature) => (
                            <option key={nature} value={nature}>
                                {nature || '-- Select --'}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="identity-grid__row">
                    <span className="identity-grid__label text-label">Rank</span>
                    <select
                        className="identity-grid__select text-label"
                        value={identityStore.rank}
                        onChange={(event) => setIdentity('rank', event.target.value as Rank)}
                    >
                        {RANKS.map((rank) => (
                            <option key={rank} value={rank}>
                                {rank}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="identity-grid__row">
                    <span className="identity-grid__label text-label">Typing</span>
                    <div className="identity-header__typing-container">
                        <select
                            className={`identity-grid__select identity-header__type-select ${
                                identityStore.type1 && identityStore.type1 !== 'None'
                                    ? 'text-theme-header'
                                    : 'text-label'
                            }`}
                            style={{
                                background: getTypeColor(identityStore.type1)
                            }}
                            value={identityStore.type1 || ''}
                            onChange={(event) => setIdentity('type1', event.target.value)}
                        >
                            {allTypes.map((type) => (
                                <option key={`t1-${type}`} value={type}>
                                    {type || '--'}
                                </option>
                            ))}
                        </select>
                        <select
                            className={`identity-grid__select identity-header__type-select ${
                                identityStore.type2 && identityStore.type2 !== 'None'
                                    ? 'text-theme-header'
                                    : 'text-label'
                            }`}
                            style={{
                                background: getTypeColor(identityStore.type2)
                            }}
                            value={identityStore.type2 || ''}
                            onChange={(event) => setIdentity('type2', event.target.value)}
                        >
                            {allTypes.map((type) => (
                                <option key={`t2-${type}`} value={type}>
                                    {type || '--'}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Ability Combobox with Dropdown & Quick-Swap */}
                <AbilityCombobox onOpenAbilityModal={onOpenAbility} />

                <div className="identity-grid__row">
                    <span className="identity-grid__label text-label">Mode</span>
                    <select
                        className="identity-grid__select text-label"
                        value={identityStore.mode || 'Pokémon'}
                        onChange={(event) => setMode(event.target.value as SheetMode)}
                    >
                        <option value="Pokémon">Pokémon</option>
                        <option value="Trainer">Trainer</option>
                        <option value="Trainer (Special)">Trainer (Special)</option>
                    </select>
                </div>

                <div className="identity-grid__row identity-header__age-gender-row">
                    <span className="identity-grid__label text-label">
                        Age{' '}
                        <TooltipIcon
                            onClick={() =>
                                setSlotTooltipInfo({
                                    title: 'Age Attribute Buffs',
                                    desc: 'Setting an age grants bonus attribute points to Core and Social pools:\n• Teen: +2 Core / +2 Social Attributes\n• Adult: +4 Core / +4 Social Attributes\n• Senior: +3 Core / +6 Social Attributes'
                                })
                            }
                        />
                    </span>
                    <select
                        className="identity-grid__select identity-header__age-select text-label"
                        value={identityStore.age || '--'}
                        onChange={(event) => setIdentity('age', event.target.value)}
                    >
                        {AGES.map((age) => (
                            <option key={age} value={age}>
                                {age}
                            </option>
                        ))}
                    </select>
                    <span className="identity-grid__label identity-header__label-margin text-label">Gender</span>
                    <input
                        type="text"
                        className="identity-grid__input identity-header__gender-input text-label"
                        value={identityStore.gender || ''}
                        onChange={(event) => setIdentity('gender', event.target.value)}
                        placeholder="..."
                    />
                </div>

                <div className="identity-grid__row">
                    <span className="identity-grid__label text-label">
                        Combat{' '}
                        <TooltipIcon
                            onClick={() =>
                                setSlotTooltipInfo({
                                    title: 'Combat Held Items',
                                    desc: 'Section for combat-related held items, battle equipment, and battle items (e.g. Leftovers, Choice Band, Focus Sash, Berry).'
                                })
                            }
                        />
                    </span>
                    <input
                        type="text"
                        className="identity-grid__input text-label"
                        value={identityStore.combat || ''}
                        onChange={(event) => setIdentity('combat', event.target.value)}
                        placeholder="Combat held item..."
                    />
                </div>
                <div className="identity-grid__row">
                    <span className="identity-grid__label text-label">
                        Social{' '}
                        <TooltipIcon
                            onClick={() =>
                                setSlotTooltipInfo({
                                    title: 'Social Held Items',
                                    desc: 'Section for social-related held items, contest accessories, charisma charms, or badges (e.g. Soothe Bell, Amulet Coin, Ribbons).'
                                })
                            }
                        />
                    </span>
                    <input
                        type="text"
                        className="identity-grid__input text-label"
                        value={identityStore.social || ''}
                        onChange={(event) => setIdentity('social', event.target.value)}
                        placeholder="Social held item..."
                    />
                </div>
                <div className="identity-grid__row">
                    <span className="identity-grid__label text-label">
                        Hand{' '}
                        <TooltipIcon
                            onClick={() =>
                                setSlotTooltipInfo({
                                    title: 'Hand / Weapons',
                                    desc: 'Section for handheld weapons, tools, stylers, and gear actively carried or wielded in hands (e.g. Sword, Bow, Wand, Capture Styler).'
                                })
                            }
                        />
                    </span>
                    <input
                        type="text"
                        className="identity-grid__input text-label"
                        value={identityStore.hand || ''}
                        onChange={(event) => setIdentity('hand', event.target.value)}
                        placeholder="Handheld weapon or gear..."
                    />
                </div>
                <div className="identity-grid__row">
                    <span className="identity-grid__label text-label">
                        Rolls{' '}
                        <TooltipIcon
                            onClick={() =>
                                setSlotTooltipInfo({
                                    title: 'Rolls Visibility',
                                    desc: 'This function only works on the Owlbear Rodeo version of the sheet to toggle Public vs. GM-only dice rolls. It is left in the standalone app version because the sheet would look unbalanced with one less slot there.'
                                })
                            }
                        />
                    </span>
                    <select
                        className="identity-grid__select text-label"
                        value={identityStore.rolls || 'Public (Everyone)'}
                        onChange={(event) => setIdentity('rolls', event.target.value)}
                    >
                        <option>Public (Everyone)</option>
                        <option>Private (GM)</option>
                    </select>
                </div>

                {customInfo.length > 0 && (
                    <div className="identity-header__custom-info-container">
                        {customInfo.map((info, index) => {
                            const isOddLast = customInfo.length % 2 !== 0 && index === customInfo.length - 1;
                            return (
                                <div
                                    key={info.id}
                                    className="identity-header__custom-info-item"
                                    style={isOddLast ? { gridColumn: '1 / -1' } : undefined}
                                >
                                    <CustomInfoRow info={info} onDelete={() => setDeleteCustomInfoId(info.id)} />
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                    <button
                        type="button"
                        onClick={addCustomInfo}
                        className="action-button action-button--dark"
                        style={{ width: '100%', padding: '6px' }}
                        title="Add Custom Field"
                    >
                        <Plus size={16} /> Add Custom Field
                    </button>
                </div>
            </div>

            {slotTooltipInfo && (
                <SlotTooltipModal
                    title={slotTooltipInfo.title}
                    desc={slotTooltipInfo.desc}
                    onClose={() => setSlotTooltipInfo(null)}
                />
            )}

            {deleteCustomInfoId && (
                <CustomInfoDeleteModal
                    onConfirm={() => {
                        removeCustomInfo(deleteCustomInfoId);
                        setDeleteCustomInfoId(null);
                    }}
                    onCancel={() => setDeleteCustomInfoId(null)}
                />
            )}
        </>
    );
}
