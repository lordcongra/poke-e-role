import { useState, useEffect } from 'react';
import { Check, Copy, Link2, Megaphone, ChevronDown, ChevronUp, Search, BookOpen, Loader2 } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { fetchAbilityData } from '../../../utils/api/api';
import type { AbilityLookupCardProps, AbilityItem } from './abilityLookupTypes';

export function AbilityLookupCard({
    ability,
    isExpanded,
    pokemonHolders,
    copiedDiscord,
    copiedLink,
    onToggleExpand,
    onCopyDiscord,
    onCopyCardLink,
    onBroadcast,
    onSelectPokemon,
    onFilterPokemonByAbility
}: AbilityLookupCardProps) {
    const roomCustomAbilities = useCharacterStore((state) => state.roomCustomAbilities || []);
    const [effect, setEffect] = useState<string | undefined>(ability.effect);
    const [description, setDescription] = useState<string | undefined>(ability.description);
    const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(!ability.effect && !ability.description);

    useEffect(() => {
        let isMounted = true;

        if (ability.effect || ability.description) {
            setEffect(ability.effect);
            setDescription(ability.description);
            setIsLoadingDetails(false);
            return;
        }

        const clean = ability.name.trim().toLowerCase();
        const custom = roomCustomAbilities.find((ca) => ca.name.trim().toLowerCase() === clean);
        if (custom) {
            setEffect(custom.effect);
            setDescription(custom.description);
            setIsLoadingDetails(false);
            return;
        }

        setIsLoadingDetails(true);
        fetchAbilityData(ability.name)
            .then((data) => {
                if (!isMounted) return;
                const safeData = data as Record<string, unknown> | null;
                setEffect(typeof safeData?.Effect === 'string' ? safeData.Effect : undefined);
                setDescription(typeof safeData?.Description === 'string' ? safeData.Description : undefined);
            })
            .catch((err) => {
                console.warn('[AbilityLookupCard] Failed to fetch ability details:', err);
            })
            .finally(() => {
                if (isMounted) setIsLoadingDetails(false);
            });

        return () => {
            isMounted = false;
        };
    }, [ability.name, ability.effect, ability.description, roomCustomAbilities]);

    const activeAbilityItem: AbilityItem = {
        name: ability.name,
        isCustom: ability.isCustom,
        effect,
        description
    };

    return (
        <div
            id={`ability-card-${ability.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            className="gm-pokemon-lookup__card gm-ability-lookup__card"
        >
            {/* Header */}
            <div className="gm-pokemon-lookup__card-header">
                <div className="gm-pokemon-lookup__card-identity">
                    <span className="gm-pokemon-lookup__card-name">{ability.name}</span>
                    {ability.isCustom && <span className="gm-pokemon-lookup__custom-tag">Homebrew</span>}
                </div>

                <div className="gm-pokemon-lookup__card-actions">
                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={() => onCopyDiscord(activeAbilityItem)}
                        title="Copy Discord Markdown summary"
                    >
                        {copiedDiscord ? (
                            <>
                                <Check size={14} color="var(--primary)" /> Copied!
                            </>
                        ) : (
                            <>
                                <Copy size={14} /> Discord
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={() => onCopyCardLink(ability.name)}
                        title="Copy direct link to this ability"
                    >
                        {copiedLink ? (
                            <>
                                <Check size={14} color="var(--primary)" /> Link!
                            </>
                        ) : (
                            <>
                                <Link2 size={14} /> Link
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={() => onBroadcast(activeAbilityItem)}
                        title="Broadcast ability details to Owlbear Rodeo chat"
                    >
                        <Megaphone size={14} /> Share
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={() => onToggleExpand(ability.name)}
                        title={isExpanded ? 'Collapse Pokémon list' : 'View Pokémon with this ability'}
                    >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? 'Hide' : 'Pokémon'}
                    </button>
                </div>
            </div>

            {/* Effect Box */}
            <div className="gm-ability-lookup__effect-box">
                <span className="gm-ability-lookup__effect-label text-label">Effect:</span>
                {isLoadingDetails ? (
                    <span className="text-subtext flex-layout--row-center" style={{ gap: 6 }}>
                        <Loader2 size={12} className="animate-spin" /> Loading effect...
                    </span>
                ) : (
                    <span className="gm-ability-lookup__effect-text">
                        {effect || 'No specific mechanical effect described.'}
                    </span>
                )}
            </div>

            {/* Description Flavour Text */}
            {!isLoadingDetails && description && (
                <div className="gm-ability-lookup__desc-box text-subtext">
                    <em>{description}</em>
                </div>
            )}

            {/* Expandable Pokémon Drawer */}
            {isExpanded && (
                <div className="gm-pokemon-lookup__drawer gm-ability-lookup__drawer">
                    <div className="gm-ability-lookup__holders-header">
                        <div className="flex-layout--row-center" style={{ gap: 8 }}>
                            <BookOpen size={14} color="var(--primary)" />
                            <span className="text-label">Available to {pokemonHolders.length} Pokémon</span>
                            {onFilterPokemonByAbility && (
                                <button
                                    type="button"
                                    className="action-button action-button--dark"
                                    style={{ fontSize: '0.72rem', padding: '2px 8px', gap: 4 }}
                                    onClick={() => onFilterPokemonByAbility(ability.name)}
                                    title={`Filter Pokémon Lookup for species with ${ability.name}`}
                                >
                                    <Search size={11} /> Filter in Pokédex
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="gm-ability-lookup__holders-content">
                        {pokemonHolders.length === 0 ? (
                            <p className="text-subtext" style={{ fontStyle: 'italic', margin: 0 }}>
                                No standard Pokédex species currently have this ability listed.
                            </p>
                        ) : (
                            <div className="gm-ability-lookup__holders-pills-list">
                                {pokemonHolders.map((p) => (
                                    <button
                                        key={`holder-${p.name}-${p.slotLabel}`}
                                        type="button"
                                        className="gm-pokemon-lookup__move-pill gm-ability-lookup__poke-pill"
                                        onClick={() => onSelectPokemon && onSelectPokemon(p.name)}
                                        title={`View ${p.name} in Pokémon Lookup`}
                                    >
                                        <span className="gm-ability-lookup__poke-pill-name">{p.name}</span>
                                        <span className="gm-ability-lookup__poke-pill-slot text-subtext">
                                            ({p.slotLabel})
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
