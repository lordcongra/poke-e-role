import { useEffect, useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { Item, Image } from '@owlbear-rodeo/sdk';
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

    useEffect(() => {
        const currentRounded = parseFloat(c.initiative.toFixed(2));
        const inputParsed = parseFloat(val);
        if (currentRounded !== inputParsed) {
            setVal(c.initiative.toFixed(2));
        }
    }, [c.initiative]);

    const handleSave = () => {
        const parsed = parseFloat(val);
        const currentRounded = parseFloat(c.initiative.toFixed(2));
        if (!isNaN(parsed) && parsed !== currentRounded) {
            updateInit(c.id, parsed);
        }
    };

    return (
        <div className={`init-tracker__card ${isActive ? 'init-tracker__card--active' : ''}`}>
            <div className="init-tracker__avatar-container" onClick={() => removeInit(c.id)} title="Remove from Initiative">
                {c.image && (
                    <img src={c.image} alt={c.name} className={`init-tracker__avatar init-tracker__avatar--${shape}`} />
                )}
                <div className={`init-tracker__avatar-overlay init-tracker__avatar-overlay--${shape}`}>✖</div>
            </div>
            <div className="init-tracker__info">
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
            </div>
        </div>
    );
}

export function InitiativeTracker() {
    const [combatants, setCombatants] = useState<Combatant[]>([]);
    const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');
    const [theme, setTheme] = useState('light');
    const [shape, setShape] = useState<'circle' | 'square' | 'none'>('circle');
    const [isReady, setIsReady] = useState(false);
    
    // Explicit padding buffers from IdentityControls
    const [wb, setWb] = useState(24);
    const [hb, setHb] = useState(24);
    
    const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
    const [maxWidth, setMaxWidth] = useState(800);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setLayout((params.get('layout') as 'vertical' | 'horizontal') || 'vertical');
        setTheme(params.get('theme') || 'light');
        setShape((params.get('shape') as 'circle' | 'square' | 'none') || 'circle');
        setWb(parseInt(params.get('wb') || '24', 10));
        setHb(parseInt(params.get('hb') || '24', 10));
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            document.body.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.body.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, [theme]);

    useEffect(() => {
        let isMounted = true;

        OBR.onReady(async () => {
            if (!isMounted) return;
            setIsReady(true);

            const currentWidth = await OBR.viewport.getWidth();
            setMaxWidth(currentWidth * 0.9);

            OBR.scene.getMetadata().then(meta => {
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
                    (item) => item.layer === 'CHARACTER' && item.metadata['pokerole-pmd-extension/initiative'] !== undefined
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
                } catch (e) {
                    console.error('Failed to fetch initiative items', e);
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
                if (settings.wb) setWb(parseInt(settings.wb, 10));
                if (settings.hb) setHb(parseInt(settings.hb, 10));
            });

            return () => {
                unsubItems();
                unsubMeta();
                unsubPingToggle();
                unsubPingCheck();
                unsubSettings();
            };
        });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!isReady || !containerRef.current || !OBR.isAvailable) return;

        let animationFrameId: number;

        const resizeObserver = new ResizeObserver(() => {
            cancelAnimationFrame(animationFrameId);
            
            animationFrameId = requestAnimationFrame(async () => {
                const el = containerRef.current;
                if (!el) return;

                const targetWidth = Math.min(el.scrollWidth + wb, maxWidth);
                const targetHeight = el.scrollHeight + hb;

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

        resizeObserver.observe(containerRef.current);
        return () => {
            resizeObserver.disconnect();
            cancelAnimationFrame(animationFrameId);
        };
    }, [isReady, combatants, layout, shape, wb, hb, maxWidth]);

    const updateInit = async (id: string, newVal: number) => {
        if (isNaN(newVal) || !OBR.isAvailable) return;
        await OBR.scene.items.updateItems([id], (items) => {
            for (const item of items) {
                item.metadata['pokerole-pmd-extension/initiative'] = { value: newVal };
            }
        });
    };

    const removeInit = async (id: string) => {
        if (!OBR.isAvailable) return;
        await OBR.scene.items.updateItems([id], (items) => {
            for (const item of items) {
                delete item.metadata['pokerole-pmd-extension/initiative'];
                delete item.metadata['com.pretty-initiative/metadata'];
            }
        });
    };

    const nextTurn = () => {
        if (combatants.length === 0 || !OBR.isAvailable) return;
        let nextIndex = 0;
        if (activeTurnId) {
            const currentIndex = combatants.findIndex((c) => c.id === activeTurnId);
            if (currentIndex !== -1) {
                nextIndex = (currentIndex + 1) % combatants.length;
            }
        }
        const nextId = combatants[nextIndex].id;
        OBR.scene.setMetadata({ 'pokerole-pmd-extension/initiative-turn': nextId });
    };

    const prevTurn = () => {
        if (combatants.length === 0 || !OBR.isAvailable) return;
        let prevIndex = combatants.length - 1;
        if (activeTurnId) {
            const currentIndex = combatants.findIndex((c) => c.id === activeTurnId);
            if (currentIndex !== -1) {
                prevIndex = (currentIndex - 1 + combatants.length) % combatants.length;
            }
        }
        const prevId = combatants[prevIndex].id;
        OBR.scene.setMetadata({ 'pokerole-pmd-extension/initiative-turn': prevId });
    };

    if (!isReady) {
        return (
            <div ref={containerRef} className={`init-tracker init-tracker--${layout}`}>
                <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Connecting to Room...
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`init-tracker init-tracker--${layout}`} style={{ maxWidth: `${maxWidth}px` }}>
            <div className={`init-tracker__header init-tracker__header--${layout}`}>
                <div className="init-tracker__turn-controls">
                    <button type="button" className="init-tracker__turn-btn" onClick={prevTurn} title="Previous Turn">◀</button>
                    {layout !== 'horizontal' && <span className="init-tracker__title">INITIATIVE</span>}
                    <button type="button" className="init-tracker__turn-btn" onClick={nextTurn} title="Next Turn">▶</button>
                </div>
            </div>
            {combatants.length === 0 ? (
                <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Waiting for rolls...
                </div>
            ) : (
                <div className={`init-tracker__list init-tracker__list--${layout}`}>
                    {combatants.map((c, index) => (
                        <div style={{ display: 'flex', alignItems: 'center' }} key={c.id}>
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
        </div>
    );
}