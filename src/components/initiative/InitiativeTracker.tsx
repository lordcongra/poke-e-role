import { useEffect, useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { Item, Image } from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../utils/storageAdapter';
import { imageManager } from '../../utils/imageManager';
import { useCharacterStore } from '../../store/useCharacterStore';
import './InitiativeTracker.css';

interface Combatant {
    id: string;
    name: string;
    image: string;
    initiative: number;
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
    updateInit: (id: string, val: number) => void;
    removeInit: (id: string) => void;
}) {
    const [val, setVal] = useState(c.initiative.toFixed(2));
    const [resolvedImg, setResolvedImg] = useState<string>('');

    useEffect(() => {
        const currentRounded = parseFloat(c.initiative.toFixed(2));
        const inputParsed = parseFloat(val);
        if (currentRounded !== inputParsed) {
            setVal(c.initiative.toFixed(2));
        }
    }, [c.initiative]);

    useEffect(() => {
        let isMounted = true;
        if (isStandaloneMode && c.image && c.image.startsWith('local-img:')) {
            imageManager.getImageUrl(c.image).then(url => {
                if (isMounted && url) setResolvedImg(url);
            });
        } else {
            setResolvedImg(c.image);
        }
        return () => { isMounted = false; };
    }, [c.image]);

    const handleSave = () => {
        const parsed = parseFloat(val);
        const currentRounded = parseFloat(c.initiative.toFixed(2));
        if (!isNaN(parsed) && parsed !== currentRounded) {
            updateInit(c.id, parsed);
        }
    };

    // Correct PokeRole Initiative: 1d6 + Base (Dex + Alert)
    const handleRollInitiative = () => {
        const base = isNaN(parseFloat(val)) ? 0 : Math.floor(parseFloat(val));
        const d6 = Math.floor(Math.random() * 6) + 1;
        
        // Final score includes the tiny decimal tiebreaker so the list sorts properly
        const finalInit = d6 + base + (Math.floor(Math.random() * 99) / 10000);
        
        updateInit(c.id, finalInit);
        alert(`🎲 ${c.name} rolled Initiative!\n\nRolled: ${d6}\nBase: +${base}\nTotal: ${d6 + base}\n\nNew Score: ${finalInit.toFixed(4)}`);
    };

    return (
        <div className={`init-tracker__card ${isActive ? 'init-tracker__card--active' : ''}`}>
            <div
                className="init-tracker__avatar-container"
                onClick={() => removeInit(c.id)}
                title="Remove from Initiative"
            >
                {resolvedImg && (
                    <img src={resolvedImg} alt={c.name} className={`init-tracker__avatar init-tracker__avatar--${shape}`} />
                )}
                <div className={`init-tracker__avatar-overlay init-tracker__avatar-overlay--${shape}`}>✖</div>
            </div>
            <div className="init-tracker__info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="init-tracker__name">{c.name}</span>
                <input
                    type="number"
                    step="0.01"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className="init-tracker__input no-spinners"
                />
                <button 
                    type="button" 
                    onClick={handleRollInitiative}
                    title="Roll Initiative (1d6 + Current)"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 2px' }}
                >
                    🎲
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

    const [mw, setMw] = useState(0);
    const [mh, setMh] = useState(0);
    const [maxWidth, setMaxWidth] = useState(800);

    const [showAddMenu, setShowAddMenu] = useState(false);
    const [availableChars, setAvailableChars] = useState<{ id: string; name: string; image: string }[]>([]);

    useEffect(() => {
        if (isStandaloneMode) {
            setLayout(storeIdentity.initiativeTrackerLayout || 'vertical');
            setShape(storeIdentity.initiativeTrackerAvatarShape || 'circle');
            setMw(storeIdentity.initiativeTrackerMaxWidth || 0);
            setMh(storeIdentity.initiativeTrackerMaxHeight || 0);
        } else {
            const params = new URLSearchParams(window.location.search);
            setLayout((params.get('layout') as 'vertical' | 'horizontal') || 'vertical');
            setTheme(params.get('theme') || 'light');
            setShape((params.get('shape') as 'circle' | 'square' | 'none') || 'none');
            setMw(parseInt(params.get('mw') || '0', 10));
            setMh(parseInt(params.get('mh') || '0', 10));
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
                    if (savedList) setCombatants(JSON.parse(savedList));
                    if (savedTurn) setActiveTurnId(savedTurn);
                } catch (e) {}
            };

            loadLocalEncounter();

            window.addEventListener('pkr-standalone-init-update', loadLocalEncounter);

            storageAdapter.getLocalCharacters().then(chars => {
                if (!isMounted) return;
                const options = chars.map(c => ({
                    id: c.id,
                    name: c.name,
                    image: (c.metadata.tokenImageUrl as string) || ''
                }));
                setAvailableChars(options);
            });

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
                setMaxWidth(currentWidth * 0.9);
            } catch (e) {}

            OBR.scene.getMetadata().then((meta) => {
                const turnMeta = meta['pokerole-pmd-extension/initiative-turn'] as string;
                if (turnMeta) setActiveTurnId(turnMeta);
            });

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
                const parsed = initItems.map((item) => {
                    const meta = item.metadata['pokerole-pmd-extension/initiative'] as { value: number };
                    const imgItem = item as Image;
                    return {
                        id: item.id,
                        name: item.name,
                        image: imgItem.image?.url || '',
                        initiative: meta.value || 0
                    };
                });
                parsed.sort((a, b) => b.initiative - a.initiative);
                setCombatants(parsed);
            };

            const initializeCombatants = async () => {
                try {
                    const items = await OBR.scene.items.getItems();
                    mapItemsToCombatants(items);
                } catch (e) {}
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
                if (settings.mw !== undefined) setMw(parseInt(settings.mw, 10));
                if (settings.mh !== undefined) setMh(parseInt(settings.mh, 10));
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

                const limitW = mw > 0 ? mw : maxWidth > 0 ? maxWidth : 800;
                const limitH = mh > 0 ? mh : 9999;

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

                        await OBR.popover.setWidth('pkr-initiative-tracker', targetWidth).catch(() => {});
                        await OBR.popover.setHeight('pkr-initiative-tracker', targetHeight).catch(() => {});
                    }
                } catch (e) {}
            });
        });

        resizeObserver.observe(ghostRef.current);
        return () => {
            resizeObserver.disconnect();
            cancelAnimationFrame(animationFrameId);
        };
    }, [isReady, combatants, layout, shape, mw, mh, maxWidth, isStandaloneMode]);

    const updateInit = async (id: string, newVal: number) => {
        if (isNaN(newVal)) return;

        if (isStandaloneMode) {
            const updated = combatants.map(c => c.id === id ? { ...c, initiative: newVal } : c);
            updated.sort((a, b) => b.initiative - a.initiative);
            setCombatants(updated);
            localStorage.setItem('pkr_standalone_init_list', JSON.stringify(updated));
            return;
        }

        if (!OBR.isAvailable) return;
        await OBR.scene.items.updateItems([id], (items) => {
            for (const item of items) {
                item.metadata['pokerole-pmd-extension/initiative'] = { value: newVal };
            }
        });
    };

    const removeInit = async (id: string) => {
        if (isStandaloneMode) {
            const updated = combatants.filter(c => c.id !== id);
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
        });
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
            OBR.scene.setMetadata({ 'pokerole-pmd-extension/initiative-turn': nextId });
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
            OBR.scene.setMetadata({ 'pokerole-pmd-extension/initiative-turn': prevId });
        }
    };

    const handleAddStandaloneCombatant = (char: { id: string; name: string; image: string }) => {
        if (combatants.find(c => c.id === char.id)) return;
        const newList = [...combatants, { id: char.id, name: char.name, image: char.image, initiative: 0 }];
        newList.sort((a, b) => b.initiative - a.initiative);
        setCombatants(newList);
        localStorage.setItem('pkr_standalone_init_list', JSON.stringify(newList));
        setShowAddMenu(false);
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
                        <div style={{ position: 'relative', marginLeft: '6px' }}>
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
                                    {availableChars.map(char => (
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
                <div className="init-tracker__empty">Waiting for rolls...</div>
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
            <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
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