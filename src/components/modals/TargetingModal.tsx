import { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { MoveData } from '../../store/storeTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { STATS_META_ID } from '../../utils/graphicsManager';
import { isStandaloneMode, storageAdapter } from '../../utils/storageAdapter';
import './TargetingModal.css';

interface TargetingModalProps {
    move: MoveData;
    baseDamage: number;
    onClose: () => void;
    onRoll: (baseDmg: number, isCrit: boolean, isSE: boolean, reduction: number) => void;
}

interface TargetOption {
    id: string;
    name: string;
    def: number;
    isTera: boolean;
}

export function TargetingModal({ move, baseDamage, onClose, onRoll }: TargetingModalProps) {
    const [reduction, setReduction] = useState(0);
    const [isCrit, setIsCrit] = useState(false);
    const [isSE, setIsSE] = useState(false);
    const [targets, setTargets] = useState<TargetOption[]>([]);

    const ruleset = useCharacterStore((state) => state.identity.ruleset);
    const activeTransformation = useCharacterStore((state) => state.identity.activeTransformation);
    const isPhysicalMove = String(move.category).startsWith('Phys');

    useEffect(() => {
        let isMounted = true;

        const loadTargets = async () => {
            const availableTargets: TargetOption[] = [];

            // --- PATH 1: STANDALONE MODE ---
            if (isStandaloneMode) {
                try {
                    const savedList = localStorage.getItem('pkr_standalone_init_list');
                    if (savedList) {
                        const initList = JSON.parse(savedList) as Record<string, unknown>[];
                        if (Array.isArray(initList)) {
                            const localChars = await storageAdapter.getLocalCharacters();

                            initList.forEach((c) => {
                                const charId = String(c.id || '');
                                const matchingChar = localChars.find((lc) => lc.id === charId);

                                let name = String(c.name || 'Unknown');
                                let vit = 2;
                                let ins = 1;
                                let defBuff = 0;
                                let defDebuff = 0;
                                let sdefBuff = 0;
                                let sdefDebuff = 0;
                                let isTera = false;

                                if (matchingChar && matchingChar.metadata) {
                                    const meta = matchingChar.metadata as Record<string, unknown>;
                                    name = String(meta.nickname || meta.species || c.name || 'Unknown');

                                    const stateObj = (meta.state || meta) as Record<string, unknown>;
                                    const statsObj = (meta.stats || stateObj?.stats) as
                                        | Record<string, Record<string, number>>
                                        | undefined;

                                    if (statsObj && typeof statsObj === 'object') {
                                        vit = Math.max(
                                            1,
                                            (Number(statsObj.vit?.base) || 2) +
                                                (Number(statsObj.vit?.rank) || 0) +
                                                (Number(statsObj.vit?.buff) || 0) -
                                                (Number(statsObj.vit?.debuff) || 0)
                                        );
                                        ins = Math.max(
                                            1,
                                            (Number(statsObj.ins?.base) || 1) +
                                                (Number(statsObj.ins?.rank) || 0) +
                                                (Number(statsObj.ins?.buff) || 0) -
                                                (Number(statsObj.ins?.debuff) || 0)
                                        );
                                    } else {
                                        vit =
                                            (Number(meta['vit-base']) || 2) +
                                            (Number(meta['vit-rank']) || 0) +
                                            (Number(meta['vit-buff']) || 0) -
                                            (Number(meta['vit-debuff']) || 0);
                                        ins =
                                            (Number(meta['ins-base']) || 1) +
                                            (Number(meta['ins-rank']) || 0) +
                                            (Number(meta['ins-buff']) || 0) -
                                            (Number(meta['ins-debuff']) || 0);
                                    }

                                    defBuff = Number(meta['defBuff'] ?? meta['def-buff']) || 0;
                                    defDebuff = Number(meta['defDebuff'] ?? meta['def-debuff']) || 0;
                                    sdefBuff = Number(meta['sdefBuff'] ?? meta['spd-buff']) || 0;
                                    sdefDebuff = Number(meta['sdefDebuff'] ?? meta['spd-debuff']) || 0;

                                    const identityObj = (stateObj?.identity || meta.identity || {}) as Record<
                                        string,
                                        unknown
                                    >;
                                    isTera =
                                        meta['active-transformation'] === 'Terastallize' ||
                                        identityObj.activeTransformation === 'Terastallize';
                                }

                                const def = vit + defBuff - defDebuff;
                                let spd = ins + sdefBuff - sdefDebuff;
                                if (ruleset === 'tabletop') spd = vit + sdefBuff - sdefDebuff;

                                const targetDef = isPhysicalMove ? def : spd;
                                availableTargets.push({
                                    id: charId,
                                    name,
                                    def: Math.max(1, targetDef),
                                    isTera
                                });
                            });
                        }
                    }
                } catch (error) {
                    console.error('[TargetingModal] Error loading standalone targets:', error);
                }
            }
            // --- PATH 2: OWLBEAR RODEO MODE ---
            else if (OBR.isAvailable) {
                try {
                    const items = await OBR.scene.items.getItems();
                    items.forEach((item) => {
                        // Allow targeting for any character token present in initiative
                        if (item.metadata['pokerole-pmd-extension/initiative'] !== undefined) {
                            const meta = (item.metadata[STATS_META_ID] || item.metadata) as Record<string, unknown>;
                            const name = String(meta.nickname || meta.species || item.name);

                            const vit =
                                (Number(meta['vit-base']) || 2) +
                                (Number(meta['vit-rank']) || 0) +
                                (Number(meta['vit-buff']) || 0) -
                                (Number(meta['vit-debuff']) || 0);
                            const ins =
                                (Number(meta['ins-base']) || 1) +
                                (Number(meta['ins-rank']) || 0) +
                                (Number(meta['ins-buff']) || 0) -
                                (Number(meta['ins-debuff']) || 0);

                            const defBuff = Number(meta['defBuff'] ?? meta['def-buff']) || 0;
                            const defDebuff = Number(meta['defDebuff'] ?? meta['def-debuff']) || 0;
                            const sdefBuff = Number(meta['sdefBuff'] ?? meta['spd-buff']) || 0;
                            const sdefDebuff = Number(meta['sdefDebuff'] ?? meta['spd-debuff']) || 0;

                            const def = vit + defBuff - defDebuff;
                            let spd = ins + sdefBuff - sdefDebuff;

                            if (ruleset === 'tabletop') spd = vit + sdefBuff - sdefDebuff;

                            const targetDef = isPhysicalMove ? def : spd;
                            const isTera = meta['active-transformation'] === 'Terastallize';

                            availableTargets.push({ id: item.id, name, def: Math.max(1, targetDef), isTera });
                        }
                    });
                } catch (error) {
                    console.error('[TargetingModal] Error loading OBR targets:', error);
                }
            }

            // Append stable #1, #2 duplicate indicators
            const nameGroups: Record<string, string[]> = {};
            availableTargets.forEach((t) => {
                if (!nameGroups[t.name]) nameGroups[t.name] = [];
                nameGroups[t.name].push(t.id);
            });
            Object.values(nameGroups).forEach((ids) => ids.sort());

            const formattedTargets = availableTargets.map((t) => {
                const ids = nameGroups[t.name];
                if (ids && ids.length > 1) {
                    const num = ids.indexOf(t.id) + 1;
                    return { ...t, name: `${t.name} #${num}` };
                }
                return t;
            });

            if (isMounted) setTargets(formattedTargets);
        };

        loadTargets();

        return () => {
            isMounted = false;
        };
    }, [isPhysicalMove, ruleset]);

    const handleConfirm = () => {
        onRoll(baseDamage, isCrit, isSE, reduction);
    };

    const handleTargetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val !== 'manual') {
            const selectedTarget = targets.find((t) => t.id === val);
            if (selectedTarget) {
                setReduction(selectedTarget.def);

                // Automatically check SE if both combatants are Terastallized!
                if (activeTransformation === 'Terastallize' && selectedTarget.isTera) {
                    setIsSE(true);
                }
            }
        }
    };

    return (
        <div className="targeting-modal__overlay">
            <div className="targeting-modal__content">
                <h3 className="targeting-modal__title">🎯 Select Target</h3>

                <div className="targeting-modal__form-group">
                    <label className="targeting-modal__label">Enemy Token:</label>
                    <select onChange={handleTargetSelect} className="targeting-modal__select" defaultValue="manual">
                        <option value="manual">-- Manual Entry --</option>
                        {targets.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name} ({isPhysicalMove ? 'DEF' : 'SPD'}: {t.def})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="targeting-modal__form-group targeting-modal__form-group--large">
                    <label className="targeting-modal__label">
                        <span>{isPhysicalMove ? 'Defense' : 'Special Defense'}</span> Reduction:
                    </label>
                    <input
                        type="number"
                        value={reduction}
                        onChange={(e) => setReduction(Number(e.target.value) || 0)}
                        min="0"
                        className="targeting-modal__input"
                    />
                </div>

                <div className="targeting-modal__checkbox-row">
                    <label className="targeting-modal__checkbox-label targeting-modal__checkbox-label--crit">
                        <input
                            type="checkbox"
                            checked={isCrit}
                            onChange={(e) => setIsCrit(e.target.checked)}
                            className="targeting-modal__checkbox"
                        />
                        Critical Hit?
                    </label>
                    <label
                        className="targeting-modal__checkbox-label targeting-modal__checkbox-label--se"
                        title="Check this if the move is Super Effective, OR if both you and the target are Terastallized!"
                    >
                        <input
                            type="checkbox"
                            checked={isSE}
                            onChange={(e) => setIsSE(e.target.checked)}
                            className="targeting-modal__checkbox"
                        />
                        Super Effective?
                    </label>
                </div>

                <div className="targeting-modal__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark targeting-modal__btn"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--red targeting-modal__btn"
                        onClick={handleConfirm}
                    >
                        💥 Roll Damage
                    </button>
                </div>
            </div>
        </div>
    );
}
