import { useEffect, useState, useRef, useCallback } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { Item, Image } from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../utils/storageAdapter';
import { imageManager } from '../../utils/imageManager';
import { useCharacterStore } from '../../store/useCharacterStore';
import { addRollLogEntry } from '../../utils/diceRoller';
import { calculateStatTotal, calculateSkillTotal, getAbilityText, parseCombatTags } from '../../utils/combatMath';
import { hydrateStateFromMetadata } from '../../utils/stateMapper';
import type { CharacterState } from '../../store/storeTypes';
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

interface StoredCharacterData extends Partial<CharacterState> {
    state?: Partial<CharacterState>;
    'pokerole-extension/stats'?: Record<string, unknown>;
}

export function extractTokenImage(meta: Record<string, unknown> | null | undefined): string {
    if (!meta) return '';
    if (typeof meta['token-image-url'] === 'string' && meta['token-image-url']) return meta['token-image-url'];
    if (typeof meta['tokenImageUrl'] === 'string' && meta['tokenImageUrl']) return meta['tokenImageUrl'];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stateObj = (meta.state || meta) as any;
    if (stateObj?.identity?.tokenImageUrl) return String(stateObj.identity.tokenImageUrl);
    
    return '';
}

export function calculateBaseInitFromCharacterData(
    data: Record<string, unknown> | null | undefined, 
    globalState: CharacterState
): number {
    if (!data) return 1;

    try {
        const charData = data as StoredCharacterData;

        const statsObj = charData.stats || charData.state?.stats;
        const skillsObj = charData.skills || charData.state?.skills;

        if (statsObj && typeof statsObj === 'object') {
            const dexBase = Number(statsObj.dex?.base) || 1;
            const dexRank = Number(statsObj.dex?.rank) || 0;
            const dexBuff = Number(statsObj.dex?.buff) || 0;
            const dexDebuff = Number(statsObj.dex?.debuff) || 0;
            const dexTotal = Math.max(1, dexBase + dexRank + dexBuff - dexDebuff);

            const alertBase = Number(skillsObj?.alert?.base) || 0;
            const alertBuff = Number(skillsObj?.alert?.buff) || 0;
            const alertTotal = Math.max(0, alertBase + alertBuff);

            let itemDexBuff = 0;
            let itemAlertBuff = 0;
            const inv = charData.inventory || charData.state?.inventory;
            
            if (Array.isArray(inv)) {
                const identityObj = (charData.identity || charData.state?.identity || {}) as Record<string, unknown>;
                const abilityText = getAbilityText(
                    (identityObj.ability as string) || '', 
                    charData.roomCustomAbilities as CharacterState['roomCustomAbilities'] || globalState.roomCustomAbilities || []
                );
                const itemBuffs = parseCombatTags(
                    inv, 
                    (charData.extraCategories || []) as CharacterState['extraCategories'], 
                    undefined, 
                    abilityText
                );
                itemDexBuff = itemBuffs.stats['dex'] || 0;
                itemAlertBuff = itemBuffs.skills['alert'] || 0;
            }

            return Math.max(1, dexTotal + itemDexBuff) + Math.max(0, alertTotal + itemAlertBuff);
        }

        let flatMeta: Record<string, unknown> = data;
        if (charData['pokerole-extension/stats'] && typeof charData['pokerole-extension/stats'] === 'object') {
            flatMeta = charData['pokerole-extension/stats'] as Record<string, unknown>;
        }

        const partialState = hydrateStateFromMetadata(flatMeta, globalState);
        const characterState = { ...globalState, ...partialState } as CharacterState;
        
        const abilityText = getAbilityText(characterState.identity.ability, characterState.roomCustomAbilities);
        const itemBuffs = parseCombatTags(characterState.inventory, characterState.extraCategories, undefined, abilityText);
        
        const dex = calculateStatTotal('dex', characterState, itemBuffs);
        const alertSkill = calculateSkillTotal('alert', characterState, itemBuffs);
        
        return Math.max(1, dex) + Math.max(0, alertSkill);
    } catch (e) {
        console.error('[InitiativeTracker] Error calculating base initiative:', e);
        return 1;
    }
}

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
    updateInit: (id: string, d6Value: number, baseInitiative: number, forceDecimal: number) => void;
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
            updateInit(c.id, parsed - baseValue, baseValue, 0);
        }
    };

    const handleRollSingle = () => {
        const rolledD6 = Math.floor(Math.random() * 6) + 1;
        const tiebreakerDec = (Math.floor(Math.random() * 99) + 1) / 100;
        const total = rolledD6 + baseValue;
        
        updateInit(c.id, rolledD6, baseValue, tiebreakerDec);
        
        addRollLogEntry(
            `⚔️ Initiative Roll for ${c.name}`,
            `Rolled: ${rolledD6} + Base (${baseValue}) = ${total}\nTiebreaker Dec: +${tiebreakerDec}`,
            c.image,
            c.name
        );
    };

    return (
        <div className={`init-tracker__card ${isActive ? 'init-tracker__card--active' : ''}`}>
            
            <button 
                type="button" 
                className="init-tracker__card-close"
                onClick={() => removeInit(c.id)}
                title="Remove Combatant"
            >
                ✖
            </button>

            <div className="init-tracker__avatar-container" title={c.name}>
                {resolvedImage && (
                    <img src={resolvedImage} alt={c.name} className={`init-tracker__avatar init-tracker__avatar--${shape}`} />
                )}
            </div>
            
            <div className="init-tracker__info">
                <span className="init-tracker__name" title={c.name}>{c.name}</span>
                
                <div className="init-tracker__controls">
                    <input
                        type="number"
                        step="0.01"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        onBlur={handleSave}
                        onKeyDown={(event) => event.key === 'Enter' && handleSave()}
                        className="init-tracker__input no-spinners"
                        title={`Score (Base Init: ${baseValue})`}
                    />
                    <button 
                        type="button" 
                        onClick={handleRollSingle}
                        className="init-tracker__roll-btn"
                        title="Roll Initiative (1d6 + Base Init)"
                    >
                        🎲
                    </button>
                </div>
            </div>
        </div>
    );
}

interface InitiativeTrackerProps {
    isStandaloneWidget?: boolean;
}

export function InitiativeTracker({ isStandaloneWidget = false }: InitiativeTrackerProps) {
    const storeIdentity = useCharacterStore((state) => state.identity);
    const globalState = useCharacterStore();

    const activeTokenId = globalState.tokenId;
    const dexStat = globalState.stats?.dex;
    const alertSkill = globalState.skills?.alert;
    const inventory = globalState.inventory;
    const ability = globalState.identity?.ability;
    const extraCategories = globalState.extraCategories;
    const tokenImageUrl = globalState.identity?.tokenImageUrl;

    const [combatants, setCombatants] = useState<Combatant[]>([]);
    const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');
    const [theme, setTheme] = useState('light');
    const [shape, setShape] = useState<'circle' | 'square' | 'none'>('circle');
    const [isReady, setIsReady] = useState(false);
    const [isGM, setIsGM] = useState(false);

    const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
    const ghostRef = useRef<HTMLDivElement>(null);

    const [maxTrackerWidth, setMaxTrackerWidth] = useState(0);
    const [maxTrackerHeight, setMaxTrackerHeight] = useState(0);
    const [viewportMaxWidth, setViewportMaxWidth] = useState(800);

    const [showAddMenu, setShowAddMenu] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [availableChars, setAvailableChars] = useState<{ id: string; name: string; image: string; rawMetadata?: Record<string, unknown> }[]>([]);
    const [availableObrChars, setAvailableObrChars] = useState<{ id: string; name: string; item: Item }[]>([]);

    const fetchAvailableCharacters = useCallback(async () => {
        if (isStandaloneMode) {
            try {
                const chars = await storageAdapter.getLocalCharacters();
                const options = chars.map((c) => {
                    const meta = (c.metadata || {}) as Record<string, unknown>;
                    return {
                        id: c.id,
                        name: c.name,
                        image: extractTokenImage(meta),
                        rawMetadata: meta
                    };
                });
                setAvailableChars(options);
            } catch (error) {
                console.error('[InitiativeTracker] Failed to fetch local characters:', error);
            }
        }
    }, []);

    useEffect(() => {
        if (!isStandaloneMode || !activeTokenId || combatants.length === 0) return;

        setCombatants((prev) => {
            let changed = false;
            const next = prev.map((c) => {
                if (c.id === activeTokenId) {
                    const newBase = calculateBaseInitFromCharacterData(globalState as unknown as Record<string, unknown>, globalState);
                    const newImage = tokenImageUrl || ''; 
                    
                    if (newBase !== c.baseInit || newImage !== c.image) {
                        changed = true;
                        const newTotal = c.d6 > 0 ? (c.d6 + newBase + c.tiebreaker) : (newBase + c.tiebreaker);
                        return { ...c, baseInit: newBase, total: newTotal, image: newImage };
                    }
                }
                return c;
            });
            
            if (changed) {
                const sorted = sortCombatants(next);
                localStorage.setItem('pkr_standalone_init_list', JSON.stringify(sorted));
                return sorted;
            }
            return prev;
        });
    }, [isStandaloneMode, activeTokenId, dexStat, alertSkill, inventory, ability, extraCategories, tokenImageUrl]);

    useEffect(() => {
        if (showAddMenu) {
            fetchAvailableCharacters();
        } else {
            setSearchTerm('');
        }
    }, [showAddMenu, fetchAvailableCharacters]);

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
            
            const loadLocalEncounter = async () => {
                try {
                    const savedList = localStorage.getItem('pkr_standalone_init_list');
                    const savedTurn = localStorage.getItem('pkr_standalone_init_turn');
                    const localChars = await storageAdapter.getLocalCharacters();

                    if (savedList) {
                        const parsedList = JSON.parse(savedList);
                        if (Array.isArray(parsedList)) {
                            const normalizedList: Combatant[] = parsedList.map((item: Record<string, unknown>) => {
                                const charId = String(item.id || '');
                                const matchingChar = localChars.find((c) => c.id === charId);
                                
                                let baseInitiative = typeof item.baseInit === 'number' ? item.baseInit : 0;
                                let resolvedImage = String(item.image || '');

                                if (matchingChar && matchingChar.metadata) {
                                    const meta = matchingChar.metadata as Record<string, unknown>;
                                    baseInitiative = calculateBaseInitFromCharacterData(meta, globalState);
                                    resolvedImage = extractTokenImage(meta);
                                }

                                const d6Value = typeof item.d6 === 'number' ? item.d6 : 0;
                                const tiebreakerValue = typeof item.tiebreaker === 'number' ? item.tiebreaker : 0;
                                
                                const totalScore = d6Value > 0 
                                    ? (d6Value + baseInitiative + tiebreakerValue) 
                                    : (baseInitiative + tiebreakerValue);

                                return {
                                    id: charId || crypto.randomUUID(),
                                    name: String(item.name || 'Unknown'),
                                    image: resolvedImage,
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

            const handleLocalDataChange = () => {
                fetchAvailableCharacters();
                loadLocalEncounter(); 
            };

            loadLocalEncounter();
            fetchAvailableCharacters();

            window.addEventListener('pkr-standalone-init-update', loadLocalEncounter);
            window.addEventListener('pkr-character-list-update', fetchAvailableCharacters);
            window.addEventListener('pkr-local-data-changed', handleLocalDataChange);
            window.addEventListener('storage', handleLocalDataChange);

            return () => { 
                isMounted = false; 
                window.removeEventListener('pkr-standalone-init-update', loadLocalEncounter);
                window.removeEventListener('pkr-character-list-update', fetchAvailableCharacters);
                window.removeEventListener('pkr-local-data-changed', handleLocalDataChange);
                window.removeEventListener('storage', handleLocalDataChange);
            };
        }

        OBR.onReady(async () => {
            if (!isMounted) return;
            setIsReady(true);

            OBR.player.getRole().then((role) => {
                if (isMounted) setIsGM(role === 'GM');
            });

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
                
                const nonInitItems = items.filter(
                    (item) => item.layer === 'CHARACTER' && item.metadata['pokerole-pmd-extension/initiative'] === undefined
                );
                setAvailableObrChars(nonInitItems.map(i => ({ id: i.id, name: i.name, item: i })));

                const parsed: Combatant[] = initItems.map((item) => {
                    const meta = item.metadata['pokerole-pmd-extension/initiative'] as { value: number };
                    const imgItem = item as Image;
                    const val = meta.value || 0;
                    
                    const dynamicBaseInit = calculateBaseInitFromCharacterData(item.metadata, globalState);
                    
                    return {
                        id: item.id,
                        name: item.name,
                        image: imgItem.image?.url || '',
                        d6: 0,
                        baseInit: dynamicBaseInit,
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
    }, [isStandaloneMode, fetchAvailableCharacters, globalState]); 

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

                        await OBR.popover.setWidth('pkr-initiative-tracker', targetWidth).catch(() => {});
                        await OBR.popover.setHeight('pkr-initiative-tracker', targetHeight).catch(() => {});
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
    }, [isReady, combatants, layout, shape, maxTrackerWidth, maxTrackerHeight, viewportMaxWidth, isStandaloneMode, showAddMenu]);

    const updateInit = async (id: string, d6Value: number, baseInitiative: number, forceDecimal: number = 0) => {
        const total = d6Value + baseInitiative + forceDecimal;
        
        if (isStandaloneMode) {
            const updated = combatants.map((c) => c.id === id ? { ...c, d6: d6Value, baseInit: baseInitiative, total, tiebreaker: forceDecimal } : c);
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

    const handleRollAll = async () => {
        if (!isStandaloneMode) return;

        let logSummary = '⚔️ All Combatants Rolled Initiative:\n\n';
        const localChars = await storageAdapter.getLocalCharacters();

        const updated = combatants.map((c) => {
            const charObj = localChars.find((lc) => lc.id === c.id);
            const baseScore = charObj?.metadata 
                ? calculateBaseInitFromCharacterData(charObj.metadata as Record<string, unknown>, globalState) 
                : c.baseInit;

            const rolledD6 = Math.floor(Math.random() * 6) + 1;
            const tiebreakerDec = (Math.floor(Math.random() * 99) + 1) / 100;
            const total = rolledD6 + baseScore + tiebreakerDec;

            logSummary += `${c.name}: [${rolledD6}] + Base ${baseScore} = ${(rolledD6 + baseScore)}\n`;

            return { ...c, d6: rolledD6, baseInit: baseScore, total, tiebreaker: tiebreakerDec };
        });

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

    const handleAddStandaloneCombatant = (char: { id: string; name: string; image: string; rawMetadata?: Record<string, unknown> }) => {
        if (combatants.find((c) => c.id === char.id)) return;
        
        const baseInit = calculateBaseInitFromCharacterData(char.rawMetadata, globalState);
        const newList = sortCombatants([
            ...combatants, 
            { id: char.id, name: char.name, image: char.image, d6: 0, baseInit: baseInit, total: baseInit, tiebreaker: 0 }
        ]);
        
        setCombatants(newList);
        localStorage.setItem('pkr_standalone_init_list', JSON.stringify(newList));
        setShowAddMenu(false);
    };

    const handleAddObrCombatant = async (item: Item) => {
        if (!OBR.isAvailable) return;
        try {
            const dynamicBaseInit = calculateBaseInitFromCharacterData(item.metadata, globalState);
            await OBR.scene.items.updateItems([item.id], (items) => {
                for (const i of items) {
                    i.metadata['pokerole-pmd-extension/initiative'] = { value: dynamicBaseInit };
                }
            });
            setShowAddMenu(false);
        } catch (error) {
            console.error('[InitiativeTracker] Failed to add token to OBR initiative:', error);
        }
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
                        image: extractTokenImage(target.metadata as Record<string, unknown>),
                        rawMetadata: target.metadata as Record<string, unknown>
                    });
                }
            } catch (error) {
                console.error('[InitiativeTracker] Failed to handle drop character event:', error);
            }
        }
    };

    const filteredStandaloneChars = availableChars
        .filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    const filteredObrChars = availableObrChars
        .filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

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
                        <button 
                            type="button" 
                            className="init-tracker__turn-btn" 
                            onClick={handleRollAll} 
                            title="Roll Initiative for All Combatants"
                        >
                            🎲
                        </button>
                    )}

                    {(isStandaloneMode || (isGM && !isStandaloneMode)) && (
                        <button 
                            type="button" 
                            className="init-tracker__turn-btn" 
                            onClick={() => setShowAddMenu(true)} 
                            title="Add Combatant"
                        >
                            ➕
                        </button>
                    )}
                </div>
            </div>
            
            {combatants.length === 0 ? (
                <div className="init-tracker__empty">
                    Waiting for rolls... {isStandaloneMode && '(Drag characters here)'}
                </div>
            ) : (
                <div className={`init-tracker__list init-tracker__list--${layout}`}>
                    {combatants.map((c, index) => (
                        <div
                            id={isGhost ? undefined : `combatant-${c.id}`}
                            className="init-tracker__list-item"
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

            {/* --- SEARCHABLE ADD COMBATANT MODAL --- */}
            {showAddMenu && (
                <div className="init-tracker__modal-overlay" onClick={() => setShowAddMenu(false)}>
                    <div className="init-tracker__modal" onClick={(e) => e.stopPropagation()}>
                        <div className="init-tracker__modal-header">
                            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Add Combatant</h3>
                            <button type="button" className="init-tracker__modal-close" onClick={() => setShowAddMenu(false)}>✖</button>
                        </div>
                        
                        <input
                            type="text"
                            placeholder="Search names..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="init-tracker__modal-search form-input--transparent"
                            autoFocus
                        />
                        
                        <div className="init-tracker__modal-list">
                            {isStandaloneMode && filteredStandaloneChars.map((char) => (
                                <div 
                                    key={char.id}
                                    className="init-tracker__modal-item"
                                    onClick={() => handleAddStandaloneCombatant(char)}
                                >
                                    {char.name}
                                </div>
                            ))}
                            
                            {!isStandaloneMode && filteredObrChars.map((char) => (
                                <div 
                                    key={char.id}
                                    className="init-tracker__modal-item"
                                    onClick={() => handleAddObrCombatant(char.item)}
                                >
                                    {char.name}
                                </div>
                            ))}
                            
                            {((isStandaloneMode && filteredStandaloneChars.length === 0) || (!isStandaloneMode && filteredObrChars.length === 0)) && (
                                <div style={{ fontSize: '0.8rem', opacity: 0.7, padding: '8px', textAlign: 'center' }}>
                                    No matching characters found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* In-flow spacer inside ghost container to expand OBR popover when modal is active */}
            {isGhost && showAddMenu && (
                <div className="init-tracker__ghost-spacer" />
            )}
        </>
    );

    if (isStandaloneWidget) {
        return (
            <div 
                className="init-tracker__standalone-wrapper"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
            >
                <div 
                    className={`init-tracker init-tracker--${layout} init-tracker__standalone-panel`} 
                    style={{ flexDirection: layout === 'horizontal' ? 'row' : 'column' }}
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