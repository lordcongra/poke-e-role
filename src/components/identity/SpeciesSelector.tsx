import { useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { fetchPokemonData } from '../../utils/api';
import { SpeciesChangeModal } from '../modals/SpeciesChangeModal';

interface SpeciesSelectorProps {
    uniqueSpecies: string[];
    onOpenGenerator: () => void;
}

export function SpeciesSelector({ uniqueSpecies, onOpenGenerator }: SpeciesSelectorProps) {
    const identityStore = useCharacterStore((state) => state.identity);
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const toggleForm = useCharacterStore((state) => state.toggleForm);

    const [isFetching, setIsFetching] = useState(false);
    const [pendingSpeciesData, setPendingSpeciesData] = useState<Record<string, unknown> | null>(null);

    const handleFetch = async () => {
        if (!identityStore.species || identityStore.mode === 'Trainer') return;
        setIsFetching(true);
        try {
            const data = await fetchPokemonData(identityStore.species);
            if (data) {
                const store = useCharacterStore.getState();
                const hasSkills = Object.values(store.skills).some((skill) => skill.base > 0 || skill.buff > 0);
                const hasMoves = store.moves.length > 0;

                if (hasSkills || hasMoves) {
                    setPendingSpeciesData(data as Record<string, unknown>);
                } else {
                    store.applySpeciesData(data as Record<string, unknown>, true, true);
                }
            }
        } catch (error) {
            console.error('Fetch failed:', error);
        } finally {
            setIsFetching(false);
        }
    };

    return (
        <>
            <div className="identity-grid__row">
                <span className="identity-grid__label">{identityStore.mode === 'Trainer' ? 'Concept' : 'Species'}</span>
                <div className="identity-header__species-container">
                    <input
                        type="text"
                        list="species-datalist"
                        className="identity-grid__input identity-header__flex-input"
                        placeholder={identityStore.mode === 'Trainer' ? 'e.g. Bug Catcher' : 'e.g. Aron'}
                        value={identityStore.species || ''}
                        onChange={(event) => setIdentity('species', event.target.value)}
                        onBlur={handleFetch}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') handleFetch();
                        }}
                    />
                    <datalist id="species-datalist">
                        {uniqueSpecies.map((species) => (
                            <option key={species} value={species} />
                        ))}
                    </datalist>
                    {isFetching && <span className="identity-header__loading-icon">⏳</span>}

                    {identityStore.mode === 'Pokémon' && (
                        <>
                            <button
                                type="button"
                                className="action-button action-button--dark identity-header__species-btn"
                                onClick={() => {
                                    if (!identityStore.species) {
                                        if (OBR.isAvailable)
                                            OBR.notification.show('⚠️ Please select a Species first!', 'WARNING');
                                        return;
                                    }
                                    onOpenGenerator();
                                }}
                                title="Auto-Build Pokémon"
                            >
                                🎲
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--dark identity-header__species-btn"
                                style={{
                                    background: identityStore.isAltForm ? '#00695C' : '#555',
                                    borderColor: identityStore.isAltForm ? '#00695C' : '#555'
                                }}
                                onClick={toggleForm}
                                title={
                                    identityStore.isAltForm ? 'Swap to Base Form' : 'Swap to Alt Form / Mega Evolution'
                                }
                            >
                                🧬
                            </button>
                        </>
                    )}
                </div>
            </div>

            {pendingSpeciesData && (
                <SpeciesChangeModal
                    pendingSpeciesData={pendingSpeciesData}
                    onClose={() => setPendingSpeciesData(null)}
                />
            )}
        </>
    );
}
