import type { PokemonLookupEntry } from '../../utils/api/apiTypes';
import type { TrainerPokedexEntry } from '../../store/entityTypes';
import { TYPE_COLORS } from '../../data/constants';
import { Eye, Check, Sparkles, BookOpen, Trash2 } from 'lucide-react';

export interface TrainerPokedexRowProps {
    pokemon: PokemonLookupEntry;
    entry: TrainerPokedexEntry;
    customTypeColors?: Record<string, string>;
    onInspect: (name: string) => void;
    onToggleCaught?: (name: string) => void;
    onRemove?: (name: string) => void;
}

export function TrainerPokedexRow({
    pokemon: p,
    entry,
    customTypeColors = {},
    onInspect,
    onToggleCaught,
    onRemove
}: TrainerPokedexRowProps) {
    const allColors = { ...TYPE_COLORS, ...customTypeColors };

    return (
        <div
            className="trainer-pokedex-row"
            id={`trainer-pokedex-row-${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
        >
            <div className="trainer-pokedex-row__identity">
                <span className="trainer-pokedex-row__dex-id">#{p.dexId}</span>
                <span className="trainer-pokedex-row__name text-label" title={p.name}>
                    {p.name}
                </span>
                {p.isCustom && <span className="trainer-pokedex-row__custom-tag">HB</span>}
            </div>

            <div className="trainer-pokedex-row__types">
                <span
                    className="trainer-pokedex-row__type-badge"
                    style={{ backgroundColor: allColors[p.type1] || 'var(--primary)' }}
                >
                    {p.type1}
                </span>
                {p.type2 && (
                    <span
                        className="trainer-pokedex-row__type-badge"
                        style={{ backgroundColor: allColors[p.type2] || 'var(--primary)' }}
                    >
                        {p.type2}
                    </span>
                )}
            </div>

            <div className="trainer-pokedex-row__status-chips">
                {entry.caught ? (
                    <button
                        type="button"
                        className="trainer-pokedex-row__chip trainer-pokedex-row__chip--caught trainer-pokedex-row__chip--btn"
                        onClick={() => onToggleCaught?.(p.name)}
                        title="Caught (click to mark as Seen only)"
                        aria-label={`Toggle caught status for ${p.name}. Currently Caught.`}
                    >
                        <Check size={11} strokeWidth={3} />
                    </button>
                ) : (
                    <button
                        type="button"
                        className="trainer-pokedex-row__chip trainer-pokedex-row__chip--seen trainer-pokedex-row__chip--btn"
                        onClick={() => onToggleCaught?.(p.name)}
                        title="Seen (click to mark as Caught)"
                        aria-label={`Toggle caught status for ${p.name}. Currently Seen only.`}
                    >
                        <Eye size={11} />
                    </button>
                )}

                {entry.shiny && (
                    <span
                        className="trainer-pokedex-row__chip trainer-pokedex-row__chip--shiny"
                        title="Shiny"
                        aria-label="Shiny"
                    >
                        <Sparkles size={11} />
                    </span>
                )}
            </div>

            <div className="trainer-pokedex-row__actions">
                <button
                    type="button"
                    className="action-button action-button--dark trainer-pokedex-row__inspect-btn"
                    onClick={() => onInspect(p.name)}
                    title={`Inspect ${p.name} in Pokédex`}
                    aria-label={`Inspect ${p.name} in Pokédex`}
                >
                    <BookOpen size={14} />
                </button>

                {onRemove && (
                    <button
                        type="button"
                        className="action-button action-button--red trainer-pokedex-row__remove-btn"
                        onClick={() => onRemove(p.name)}
                        title={`Remove ${p.name} from Pokédex`}
                        aria-label={`Remove ${p.name} from Pokédex`}
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>
        </div>
    );
}
