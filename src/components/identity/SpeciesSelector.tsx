import { useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { fetchPokemonData } from '../../utils/api';
import { SpeciesChangeModal } from '../modals/SpeciesChangeModal';
import { TransformationModal } from '../modals/TransformationModal';

interface SpeciesSelectorProps {
    uniqueSpecies: string[];
    onOpenGenerator: () => void;
}

export function SpeciesSelector({ uniqueSpecies, onOpenGenerator }: SpeciesSelectorProps) {
    const identityStore = useCharacterStore((state) => state.identity);
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const applySpeciesData = useCharacterStore((state) => state.applySpeciesData);

    const [isFetching, setIsFetching] = useState(false);
    const [pendingSpeciesData, setPendingSpeciesData] = useState<Record<string, unknown> | null>(null);
    const [showTransformModal, setShowTransformModal] = useState(false);

    const handleFetch = async () => {
        if (identityStore.mode === 'Trainer') return;

        const speciesName = identityStore.species || '';

        // If the user completely cleared the input box, wipe the stats!
        if (speciesName.trim() === '') {
            applySpeciesData({ Name: '', Moves: [] }, true, true);
            return;
        }

        setIsFetching(true);
        try {
            const data = await fetchPokemonData(speciesName);
            if (data) {
                // ALWAYS trigger the modal so the user has explicit control over how the stats apply!
                setPendingSpeciesData(data as Record<string, unknown>);
            } else {
                if (OBR.isAvailable) {
                    OBR.notification.show(`⚠️ Species "${speciesName}" not found.`, 'WARNING');
                }
            }
        } catch (error) {
            console.error('Fetch failed:', error);
        } finally {
            setIsFetching(false);
        }
    };

    const isTransformed = identityStore.activeTransformation !== 'None';

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
                                    background: isTransformed ? '#00695C' : '#555',
                                    borderColor: isTransformed ? '#00695C' : '#555'
                                }}
                                onClick={() => setShowTransformModal(true)}
                                title={
                                    isTransformed
                                        ? 'Manage Active Transformation'
                                        : 'Transform (Mega, Dynamax, Tera, etc.)'
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

            {showTransformModal && <TransformationModal onClose={() => setShowTransformModal(false)} />}
        </>
    );
}
