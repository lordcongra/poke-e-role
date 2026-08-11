import React, { useEffect, useState } from 'react';
import { storageAdapter } from '../../utils/storageAdapter';
import { useCharacterStore } from '../../store/useCharacterStore';
import { setActiveTokenId } from '../../utils/obr';
import { fetchPokemonData } from '../../utils/api';
import './MainMenu.css';

interface LocalCharacter {
    id: string;
    name: string;
    metadata: Record<string, unknown>;
}

export function MainMenu() {
    const [characters, setCharacters] = useState<LocalCharacter[]>([]);
    const [newCharName, setNewCharName] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        loadCharacters();
    }, []);

    const loadCharacters = async () => {
        setIsLoading(true);
        try {
            const chars = await StorageAdapter.getLocalCharacters();
            setCharacters(chars);
        } catch (error) {
            console.error('[MainMenu] Failed to load local characters', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = async (id: string, meta: Record<string, unknown>) => {
        setActiveTokenId(id);
        const store = useCharacterStore.getState();
        store.setTokenData(id, 'PLAYER');
        store.loadFromOwlbear(meta);

        // Replicate the on-click species hydration logic from useOwlbearSync
        if (meta['species']) {
            try {
                const data = await fetchPokemonData(String(meta['species']));
                if (data) store.refreshSpeciesData(data as Record<string, unknown>);
            } catch (e) {
                console.warn('[MainMenu] Failed to fetch species data during character load:', e);
            }
        } else {
            store.applyLearnset({ Moves: [] });
        }
    };

    const handleCreate = async () => {
        if (!newCharName.trim()) return;
        try {
            const newId = await StorageAdapter.createLocalCharacter(newCharName);
            handleSelect(newId, { nickname: newCharName });
        } catch (error) {
            console.error('[MainMenu] Failed to generate local character', error);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent the parent div onClick from firing
        if (window.confirm('Are you sure you want to delete this character entirely?')) {
            await StorageAdapter.deleteLocalCharacter(id);
            loadCharacters();
        }
    };

    return (
        <div className="main-menu">
            <div className="main-menu__container">
                <header className="main-menu__header">
                    <h1 className="main-menu__title">PokéRole Sheet</h1>
                    <p className="main-menu__subtitle">Standalone Local Mode</p>
                </header>

                <div className="main-menu__create-section">
                    <input
                        type="text"
                        className="main-menu__input"
                        placeholder="New Character Name..."
                        value={newCharName}
                        onChange={(e) => setNewCharName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                    <button className="main-menu__btn" onClick={handleCreate}>
                        Create Sheet
                    </button>
                </div>

                <div className="main-menu__list">
                    {isLoading ? (
                        <p style={{ textAlign: 'center' }}>Loading saved characters...</p>
                    ) : characters.length > 0 ? (
                        characters.map((char) => (
                            <div
                                key={char.id}
                                className="main-menu__card"
                                onClick={() => handleSelect(char.id, char.metadata)}
                            >
                                <div className="main-menu__card-info">
                                    <h3 className="main-menu__char-name">{char.name}</h3>
                                    <p className="main-menu__char-meta">ID: {char.id.substring(0, 8)}...</p>
                                </div>
                                <button
                                    className="main-menu__btn main-menu__btn--danger"
                                    onClick={(e) => handleDelete(e, char.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        ))
                    ) : (
                        <p style={{ textAlign: 'center', color: '#888' }}>No characters found. Create one above!</p>
                    )}
                </div>
            </div>
        </div>
    );
}
