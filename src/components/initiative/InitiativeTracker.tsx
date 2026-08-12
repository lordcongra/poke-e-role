import { useEffect, useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { Item, Image } from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter, LOCAL_STORAGE_PREFIX } from '../../utils/storageAdapter';
import { imageManager } from '../../utils/imageManager';
import { useCharacterStore } from '../../store/useCharacterStore';
import { addRollLogEntry } from '../../utils/diceRoller';
import './InitiativeTracker.css';

export interface Combatant {
    id: string;
    name: string;
    image: string;
    d6: number;
    baseInit: number;
    total: number;
    tiebreaker: number;
}

// Rule-Accurate PokeRole Sort:
// 1. Total Roll (1d6 + BaseInit)
// 2. Base Initiative Score (Dex + Alert)
// 3. Tiebreaker Re-roll
export function sortCombatants(list: Combatant[]): Combatant[] {
    return [...list].sort((a, b) => {
        const aTotal = typeof a.total === 'number' ? a.total : 0;
        const bTotal = typeof b.total === 'number' ? b.total : 0;
        if (bTotal !== aTotal) return bTotal - aTotal;

        const aBase = typeof a.baseInit === 'number' ? a.baseInit : 0;
        const bBase = typeof b.baseInit === 'number' ? b.baseInit : 0;
        if (bBase !== aBase) return bBase - aBase;

        return (b.tiebreaker || 0) - (a.tiebreaker || 0);
    });
}

function CombatantCard({
    c,
    shape,
    isActive,
    updateInit,
    removeInit
}: {
    c: Combatant;
    shape: string;
    isActive: boolean;
    updateInit: (id: string, d6Value: number, baseInitiative: number) => void;
    removeInit: (id: string) => void;
}) {
    const totalScore = typeof c.total === 'number' ? c.total : 0;
    const baseInitiativeScore = typeof c.baseInit === 'number' ? c.baseInit : 0;

    const [value, setValue] = useState<string>(totalScore.toFixed(2));
    const [baseValue, setBaseValue] = useState<number>(baseInitiativeScore);
    const [resolvedImage, setResolvedImage] = useState<string>('');

    useEffect(() => {
        const currentTotal = typeof c.total === 'number' ? c.total : 0;
        setValue(currentTotal.toFixed(2));
        setBaseValue(typeof c.baseInit === 'number' ? c.baseInit : 0);
    }, [c.total, c.baseInit]);

    useEffect(() => {
        let isMounted = true;
        if (isStandaloneMode && c.image && c.image.startsWith('local-img:')) {
            imageManager.getImageUrl(c.image).then((url) => {
                if (isMounted && url) setResolvedImage(url);
            }).catch((error) => console.warn('[InitiativeTracker] Failed to resolve IndexedDB image url:', error));
        } else {
            setResolvedImage(c.image);
        }
        return () => { isMounted = false; };
    }, [c.image]);

    const handleSave = () => {
        const parsed = parseFloat(value);
        const currentRounded = parseFloat(totalScore.toFixed(2));
        if (!isNaN(parsed) && parsed !== currentRounded) {
            updateInit(c.id, parsed - baseValue, baseValue);
        }
    };

    const handleRollSingle = () => {
        const rolledD6 = Math.floor(Math.random() * 6) + 1;
        updateInit(c.id, rolledD6, baseValue);
        addRollLogEntry(
            `⚔️ Initiative Roll for ${c.name}`,
            `Rolled: ${rolledD6} + Base (${baseValue}) = Total ${rolledD6 + baseValue}`,
            c.image,
            c.name
        );
    };

    return (
        <div className={`init-tracker__card ${isActive ? 'init-tracker__card--active' : ''}`}>
            <div
                className="init-tracker__avatar-container"
                onClick={() => removeInit(c.id)}
                title="Remove from Initiative"
            >
                {resolvedImage && (
                    <img src={resolvedImage} alt={c.name} className={`init-tracker__avatar init-tracker__avatar--${shape}`} />
                )}
                <div className={`init-tracker__avatar-overlay init-tracker__avatar-overlay--${shape}`}>✖</div>
            </div>
            <div className="init-tracker__info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="init-tracker__name">{c.name}</span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.8rem' }}>
                    <span>Score:</span>
                    <input
                        type="number"
                        step="0.01"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        onBlur={handleSave}
                        onKeyDown={(event) => event.key === 'Enter' && handleSave()}
                        className="init-tracker__input no-spinners"
                        style={{ width: '42px', textAlign: 'center' }}
                    />
                </div>

                <button 
                    type="button" 
                    onClick={handleRollSingle}
                    title="Roll Initiative (1d6 + Base Init)"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0 2px' }}
                >
                    🎲
                </button>

                <button 
                    type="button" 
                    onClick={() => removeInit(c.id)}
                    title="Delete Combatant"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#f44336' }}
                >
                    🗑️
                </button>
            </div>
        </div>
    );
}

interface InitiativeTrackerProps {
    isStandaloneWidget?: boolean;
    onClose?: () => void;
}

export function InitiativeTracker({ isStandaloneWidget = false, onClose }: InitiativeTrackerProps) {
    const storeIdentity = useCharacterStore((state) => state.identity);

    const [combatants, setCombatants] = useState<Combatant[]>([]);
    const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');
    const [theme, setTheme] = useState('light');
    const [shape, setShape] = useState<'circle' | 'square' | 'none'>('circle');
    const [isReady, setIsReady] = useState(false);

    const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
    const ghostRef = useRef<HTMLDivElement>(null);

    const [maxTrackerWidth, setMaxTrackerWidth] = useState(0);
    const [maxTrackerHeight, setMaxTrackerHeight] = useState(0);
    const [viewportMaxWidth, setViewportMaxWidth] = useState(800);

    const [showAddMenu, setShowAddMenu] = useState(false);
    const [availableChars, setAvailableChars] = useState<{ id: string; name: string; image: string }[]>([]);

    useEffect(() => {
        if (isStandaloneMode) {
            setLayout(storeIdentity.initiativeTrackerLayout || 'vertical');
            setShape(storeIdentity.initiativeTrackerAvatarShape || 'circle');
            setMaxTrackerWidth(storeIdentity.initiativeTrackerMaxWidth || 0);
            setMaxTrackerHeight(storeIdentity.initiativeTrackerMaxHeight || 0);
        } else {
            const params = new URLSearchParams(window.location.search);
            setLayout((params.get('layout') as 'vertical' | 'horizontal') || 'vertical');
            setTheme(params.get('theme') || 'light');
            setShape((params.get('shape') as 'circle' | 'square' | 'none') || 'none');
            setMaxTrackerWidth(parseInt(params.get('mw') || '0', 10));
            setMaxTrackerHeight(parseInt(params.get('mh') || '0', 10));
        }
    }, [storeIdentity, isStandaloneMode]);

    useEffect(() => {
        if (isStandaloneMode) return; 

        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            document.body.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.body.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, [theme, isStandaloneMode]);

    useEffect(() => {
        let isMounted = true;

        if (isStandaloneMode) {
            setIsReady(true);
            
            const loadLocalEncounter = () => {
                try {
                    const savedList = localStorage.getItem('pkr_standalone_init_list');
                    const savedTurn = localStorage.getItem('pkr_standalone_init_turn');
                    if (savedList) {
                        const parsedList = JSON.parse(savedList);
                        if (Array.isArray(parsedList)) {
                            // Defensive Normalization: Ensures legacy localStorage items map safely without crashing React
                            const normalizedList: Combatant[] = parsedList.map((item: Record<string, unknown>) => {
                                const totalScore = typeof item.total === 'number' ? item.total : (typeof item.initiative === 'number' ? item.initiative : 0);
                                const baseInitiative = typeof item.baseInit === 'number' ? item.baseInit : 0;
                                const d6Value = typeof item.d6 === 'number' ? item.d6 : 0;
                                const tiebreakerValue = typeof item.tiebreaker === 'number' ? item.tiebreaker : 0;
                                return {
                                    id: String(item.id || crypto.randomUUID()),
                                    name: String(item.name || 'Unknown'),
                                    image: String(item.image || ''),
                                    d6: d6Value,
                                    baseInit: baseInitiative,
                                    total: totalScore,
                                    tiebreaker: tiebreakerValue
                                };
                            });
                            setCombatants(sortCombatants(normalizedList));
                        }
                    }
                    if (savedTurn) setActiveTurnId(savedTurn);
                } catch (error) {
                    console.error('[InitiativeTracker] Failed to parse local initiative list:', error);
                }
            };

            loadLocalEncounter();
            window.addEventListener('pkr-standalone-init-update', loadLocalEncounter);

            storageAdapter.getLocalCharacters().then((chars) => {
                if (!isMounted) return;
                const options = chars.map((c) => ({
                    id: c.id,
                    name: c.name,
                    image: (c.metadata.tokenImageUrl as string) || ''
                }));
                setAvailableChars(options);
            }).catch((error) => console.error('[InitiativeTracker] Failed to fetch local characters:', error));

            return () => { 
                isMounted = false; 
                window.removeEventListener('pkr-standalone-init-update', loadLocalEncounter);
            };
        }

        OBR.onReady(async () => {
            if (!isMounted) return;
            setIsReady(true);

            try {
                const currentWidth = (await OBR.viewport.getWidth()) ?? 800;
                setViewportMaxWidth(currentWidth * 0.9);
            } catch (error) {
                console.warn('[InitiativeTracker] Could not fetch viewport width:', error);
            }

            OBR.scene.getMetadata().then((meta) => {
                const turnMeta = meta['pokerole-pmd-extension/initiative-turn'] as string;
                if (turnMeta) setActiveTurnId(turnMeta);
            }).catch((error) => console.error('[InitiativeTracker] Failed to read scene metadata:', error));

            const handleMetadataChange = (meta: Record<string, unknown>) => {
                const turnMeta = meta['pokerole-pmd-extension/initiative-turn'] as string;
                if (turnMeta !== undefined) setActiveTurnId(turnMeta);
            };
            const unsubMeta = OBR.scene.onMetadataChange(handleMetadataChange);

            const mapItemsToCombatants = (items: Item[]) => {
                const initItems = items.filter(
                    (item) =>
                        item.layer === 'CHARACTER' && item.metadata['pokerole-pmd-extension/initiative'] !== undefined
                );
                const parsed: Combatant[] = initItems.map((item) => {
                    const meta = item.metadata['pokerole-pmd-extension/initiative'] as { value: number };
                    const imgItem = item as Image;
                    const val = meta.value || 0;
                    return {
                        id: item.id,
                        name: item.name,
                        image: imgItem.image?.url || '',
                        d6: 0,
                        baseInit: 0,
                        total: val,
                        tiebreaker: 0
                    };
                });
                setCombatants(sortCombatants(parsed));
            };

            const initializeCombatants = async () => {
                try {
                    const items = await OBR.scene.items.getItems();
                    mapItemsToCombatants(items);
                } catch (error) {
                    console.error('[InitiativeTracker] Failed to initialize combatants:', error);
                }
            };

            initializeCombatants();
            const unsubItems = OBR.scene.items.onChange(mapItemsToCombatants);

            const unsubPingToggle = OBR.broadcast.onMessage('pkr-init-ping-toggle', () => {
                OBR.broadcast.sendMessage('pkr-init-pong', {}, { destination: 'LOCAL' });
            });
            const unsubPingCheck = OBR.broadcast.onMessage('pkr-init-ping-check', () => {
                OBR.broadcast.sendMessage('pkr-init-pong', {}, { destination: 'LOCAL' });
            });

            const unsubSettings = OBR.broadcast.onMessage('pkr-init-settings-update', (event) => {
                const settings = event.data as Record<string, string>;
                if (settings.layout) setLayout(settings.layout as 'vertical' | 'horizontal');
                if (settings.shape) setShape(settings.shape as 'circle' | 'square' | 'none');
                if (settings.mw !== undefined) setMaxTrackerWidth(parseInt(settings.mw, 10));
                if (settings.mh !== undefined) setMaxTrackerHeight(parseInt(settings.mh, 10));
            });

            const unsubTheme = OBR.broadcast.onMessage('pkr-theme-update', (event) => {
                setTheme(event.data as string);
            });

            return () => {
                unsubItems();
                unsubMeta();
                unsubPingToggle();
                unsubPingCheck();
                unsubSettings();
                unsubTheme();
            };
        });

        return () => { isMounted = false; };
    }, [isStandaloneMode]);

    useEffect(() => {
        if (activeTurnId && isReady && !isStandaloneWidget) {
            setTimeout(() => {
                const activeCard = document.getElementById(`combatant-${activeTurnId}`);
                if (activeCard) {
                    activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }, 50);
        }
    }, [activeTurnId, isReady, isStandaloneWidget]);

    // OBR Popover Resize Observer
    useEffect(() => {
        if (!isReady || !ghostRef.current || !OBR.isAvailable || isStandaloneMode) return;

        let animationFrameId: number;

        const resizeObserver = new ResizeObserver(() => {
            cancelAnimationFrame(animationFrameId);

            animationFrameId = requestAnimationFrame(async () => {
                const ghostEl = ghostRef.current;
                if (!ghostEl) return;

                const naturalWidth = ghostEl.offsetWidth;
                const naturalHeight = ghostEl.offsetHeight;

                const limitW = maxTrackerWidth > 0 ? maxTrackerWidth : viewportMaxWidth > 0 ? viewportMaxWidth : 800;
                const limitH = maxTrackerHeight > 0 ? maxTrackerHeight : 9999;

                let targetWidth = Math.min(naturalWidth + 8, limitW);
                let targetHeight = Math.min(naturalHeight + 8, limitH);

                if (naturalWidth + 8 > limitW && layout === 'horizontal') {
                    targetHeight = Math.min(targetHeight + 8, limitH);
                }
                if (naturalHeight + 8 > limitH && layout === 'vertical') {
                    targetWidth = Math.min(targetWidth + 8, limitW);
                }

                try {
                    const currentW = (await OBR.popover.getWidth('pkr-initiative-tracker')) ?? 0;
                    const currentH = (await OBR.popover.getHeight('pkr-initiative-tracker')) ?? 0;

                    if (Math.abs(currentW - targetWidth) > 2 || Math.abs(currentH - targetHeight) > 2) {
                        localStorage.setItem('pkr_init_width', targetWidth.toString());
                        localStorage.setItem('pkr_init_height', targetHeight.toString());

                        await OBR.popover.setWidth('pkr-initiative-tracker', targetWidth).catch((error) => console.warn('[InitiativeTracker] Set width failed:', error));
                        await OBR.popover.setHeight('pkr-initiative-tracker', targetHeight).catch((error) => console.warn('[InitiativeTracker] Set height failed:', error));
                    }
                } catch (error) {
                    console.error('[InitiativeTracker] Resize observer error:', error);
                }
            });
        });

        resizeObserver.observe(ghostRef.current);
        return () => {
            resizeObserver.disconnect();
            cancelAnimationFrame(animationFrameId);
        };
    }, [isReady, combatants, layout, shape, maxTrackerWidth, maxTrackerHeight, viewportMaxWidth, isStandaloneMode]);

    const updateInit = async (id: string, d6Value: number, baseInitiative: number) => {
        const total = d6Value + baseInitiative;
        if (isStandaloneMode) {
            const updated = combatants.map((c) => c.id === id ? { ...c, d6: d6Value, baseInit: baseInitiative, total, tiebreaker: 0 } : c);
            const sorted = sortCombatants(updated);
            setCombatants(sorted);
            localStorage.setItem('pkr_standalone_init_list', JSON.stringify(sorted));
            return;
        }

        if (!OBR.isAvailable) return;
        await OBR.scene.items.updateItems([id], (items) => {
            for (const item of items) {
                item.metadata['pokerole-pmd-extension/initiative'] = { value: total };
            }
        }).catch((error) => console.error('[InitiativeTracker] Failed to update OBR items:', error));
    };

    const handleRollAll = () => {
        if (!isStandaloneMode) return;

        let logSummary = '⚔️ All Combatants Rolled Initiative:\n\n';

        const updated = combatants.map((c) => {
            let baseScore = c.baseInit;
            try {
                const dataStr = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${c.id}`);
                if (dataStr) {
                    const data = JSON.parse(dataStr);
                    const dex = (data.stats?.dex?.base || 1) + (data.stats?.dex?.rank || 0) + (data.stats?.dex?.buff || 0) - (data.stats?.dex?.debuff || 0);
                    const alertSkill = (data.skills?.alert?.base || 0) + (data.skills?.alert?.buff || 0);
                    baseScore = Math.max(1, dex) + Math.max(0, alertSkill);
                }
            } catch (error) {
                console.warn(`[InitiativeTracker] Could not load base stats for character ${c.id}:`, error);
            }

            const rolledD6 = Math.floor(Math.random() * 6) + 1;
            const total = rolledD6 + baseScore;

            logSummary += `${c.name}: [${rolledD6}] + Base ${baseScore} = ${total}\n`;

            return { ...c, d6: rolledD6, baseInit: baseScore, total, tiebreaker: 0 };
        });

        // Resolve exact ties (if same Total AND same BaseInit)
        for (let i = 0; i < updated.length; i++) {
            for (let j = i + 1; j < updated.length; j++) {
                if (updated[i].total === updated[j].total && updated[i].baseInit === updated[j].baseInit) {
                    updated[i].tiebreaker = Math.floor(Math.random() * 6) + 1;
                    updated[j].tiebreaker = Math.floor(Math.random() * 6) + 1;
                }
            }
        }

        const sorted = sortCombatants(updated);
        setCombatants(sorted);
        localStorage.setItem('pkr_standalone_init_list', JSON.stringify(sorted));

        addRollLogEntry('⚔️ Roll All Initiative', logSummary, `${import.meta.env.BASE_URL || '/'}pokeball.svg`, 'Initiative Engine');
    };

    const removeInit = async (id: string) => {
        if (isStandaloneMode) {
            const updated = combatants.filter((c) => c.id !== id);
            setCombatants(updated);
            localStorage.setItem('pkr_standalone_init_list', JSON.stringify(updated));
            if (activeTurnId === id) {
                setActiveTurnId(null);
                localStorage.removeItem('pkr_standalone_init_turn');
            }
            return;
        }

        if (!OBR.isAvailable) return;
        await OBR.scene.items.updateItems([id], (items) => {
            for (const item of items) {
                delete item.metadata['pokerole-pmd-extension/initiative'];
                delete item.metadata['com.pretty-initiative/metadata'];
            }
        }).catch((error) => console.error('[InitiativeTracker] Failed to remove OBR initiative metadata:', error));
    };

    const nextTurn = () => {
        if (combatants.length === 0) return;
        let nextIndex = 0;
        if (activeTurnId) {
            const currentIndex = combatants.findIndex((c) => c.id === activeTurnId);
            if (currentIndex !== -1) {
                nextIndex = (currentIndex + 1) % combatants.length;
            }
        }
        const nextId = combatants[nextIndex].id;
        
        if (isStandaloneMode) {
            setActiveTurnId(nextId);
            localStorage.setItem('pkr_standalone_init_turn', nextId);
        } else if (OBR.isAvailable) {
            OBR.scene.setMetadata({ 'pokerole-pmd-extension/initiative-turn': nextId }).catch((error) => console.warn('[InitiativeTracker] Failed to advance scene turn:', error));
        }
    };

    const prevTurn = () => {
        if (combatants.length === 0) return;
        let prevIndex = combatants.length - 1;
        if (activeTurnId) {
            const currentIndex = combatants.findIndex((c) => c.id === activeTurnId);
            if (currentIndex !== -1) {
                prevIndex = (currentIndex - 1 + combatants.length) % combatants.length;
            }
        }
        const prevId = combatants[prevIndex].id;

        if (isStandaloneMode) {
            setActiveTurnId(prevId);
            localStorage.setItem('pkr_standalone_init_turn', prevId);
        } else if (OBR.isAvailable) {
            OBR.scene.setMetadata({ 'pokerole-pmd-extension/initiative-turn': prevId }).catch((error) => console.warn('[InitiativeTracker] Failed to reverse scene turn:', error));
        }
    };

    const handleAddStandaloneCombatant = (char: { id: string; name: string; image: string }) => {
        if (combatants.find((c) => c.id === char.id)) return;
        const newList = sortCombatants([
            ...combatants, 
            { id: char.id, name: char.name, image: char.image, d6: 0, baseInit: 0, total: 0, tiebreaker: 0 }
        ]);
        setCombatants(newList);
        localStorage.setItem('pkr_standalone_init_list', JSON.stringify(newList));
        setShowAddMenu(false);
    };

    const handleDrop = async (event: React.DragEvent) => {
        event.preventDefault();
        const itemId = event.dataTransfer.getData('itemId');
        const itemType = event.dataTransfer.getData('itemType');
        
        if (itemId && itemType === 'character') {
            try {
                const chars = await storageAdapter.getLocalCharacters();
                const target = chars.find((c) => c.id === itemId);
                if (target) {
                    handleAddStandaloneCombatant({
                        id: target.id,
                        name: target.name,
                        image: (target.metadata.tokenImageUrl as string) || ''
                    });
                }
            } catch (error) {
                console.error('[InitiativeTracker] Failed to handle drop character event:', error);
            }
        }
    };

    if (!isReady) {
        return (
            <div className="init-tracker-wrapper">
                <div className={`init-tracker init-tracker--${layout}`}>
                    <div className="init-tracker__empty">Connecting...</div>
                </div>
            </div>
        );
    }

    const renderTrackerContent = (isGhost: boolean) => (
        <>
            <div className={`init-tracker__header init-tracker__header--${layout}`}>
                <div className="init-tracker__turn-controls">
                    <button type="button" className="init-tracker__turn-btn" onClick={prevTurn} title="Previous Turn">◀</button>
                    <button type="button" className="init-tracker__turn-btn" onClick={nextTurn} title="Next Turn">▶</button>
                    
                    {isStandaloneMode && (
                        <>
                            <button 
                                type="button" 
                                className="init-tracker__turn-btn" 
                                onClick={handleRollAll} 
                                title="Roll Initiative for All Combatants"
                            >
                                🎲 Roll All
                            </button>

                            <div style={{ position: 'relative', marginLeft: '2px' }}>
                                <button 
                                    type="button" 
                                    className="init-tracker__turn-btn" 
                                    onClick={() => setShowAddMenu(!showAddMenu)} 
                                    title="Add Combatant"
                                >
                                    ➕
                                </button>
                                {showAddMenu && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                                        background: 'var(--panel-bg)', border: '1px solid var(--border)',
                                        borderRadius: '4px', padding: '6px', zIndex: 100,
                                        maxHeight: '200px', overflowY: 'auto', width: '180px',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                    }}>
                                        {availableChars.map((char) => (
                                            <div 
                                                key={char.id}
                                                onClick={() => handleAddStandaloneCombatant(char)}
                                                style={{ padding: '4px 6px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}
                                            >
                                                {char.name}
                                            </div>
                                        ))}
                                        {availableChars.length === 0 && <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>No characters found.</div>}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {isStandaloneWidget && (
                    <button onClick={onClose} style={{
                        background: 'transparent', border: 'none', color: 'inherit',
                        cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', marginLeft: 'auto', padding: '0 8px'
                    }}>✖</button>
                )}
            </div>
            
            {combatants.length === 0 ? (
                <div className="init-tracker__empty">
                    Waiting for rolls... (Drag characters here)
                </div>
            ) : (
                <div className={`init-tracker__list init-tracker__list--${layout}`}>
                    {combatants.map((c, index) => (
                        <div
                            id={isGhost ? undefined : `combatant-${c.id}`}
                            style={{ display: 'flex', alignItems: 'center' }}
                            key={c.id}
                        >
                            <CombatantCard
                                c={c}
                                shape={shape}
                                isActive={c.id === activeTurnId}
                                updateInit={updateInit}
                                removeInit={removeInit}
                            />
                            {index < combatants.length - 1 && layout === 'horizontal' && (
                                <span className="init-tracker__flow-arrow">❯</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    if (isStandaloneWidget) {
        return (
            <div 
                style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
            >
                <div 
                    className={`init-tracker init-tracker--${layout}`} 
                    style={{ 
                        border: '1px solid var(--border)', 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                        borderRadius: '6px', 
                        height: '100%', 
                        width: '100%', 
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {renderTrackerContent(false)}
                </div>
            </div>
        );
    }

    return (
        <>
            <div
                ref={ghostRef}
                className={`init-tracker init-tracker--${layout} init-tracker--ghost`}
                aria-hidden="true"
            >
                {renderTrackerContent(true)}
            </div>

            <div className="init-tracker-wrapper">
                <div className={`init-tracker init-tracker--${layout}`}>{renderTrackerContent(false)}</div>
            </div>
        </>
    );
}