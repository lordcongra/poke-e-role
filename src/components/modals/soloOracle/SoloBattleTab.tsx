import { useState, useEffect, useMemo } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { Dice5, Check, ScrollText } from 'lucide-react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { CombatStat } from '@/types/enums';
import { rollFateCheck, type FateCheckResult } from '@/utils/solo/oracleUtils';
import { addSoloLog } from '@/utils/solo/soloLogStorage';
import {
    extractCandidateMoves,
    calculateMoveProbabilities,
    selectMoveByTactics,
    rollWildInstinct,
    selectClashMove,
    formatMoveDirective,
    formatClashDirective,
    formatEvadeDirective,
    formatFateReactionDirective,
    extractTokenTargetInfo,
    type TacticsMode,
    type CustomWeights,
    type BattleTargetInfo
} from '@/utils/solo/soloBattleOracleUtils';
import type { MoveData } from '@/store/storeTypes';
import { SoloBattleTargetSelector } from './SoloBattleTargetSelector';
import { SoloBattleTacticsSelector } from './SoloBattleTacticsSelector';
import { SoloBattleReactions } from './SoloBattleReactions';

interface SoloBattleTabProps {
    activeCampaign: string;
    chaosFactor: number;
}

type TargetType = 'sheet' | 'token' | 'custom';

export function SoloBattleTab({ activeCampaign, chaosFactor }: SoloBattleTabProps) {
    // 1. Reactive Leaf Selectors from useCharacterStore
    const sheetNickname = useCharacterStore((s) => s.identity.nickname);
    const sheetSpecies = useCharacterStore((s) => s.identity.species);
    const sheetHpCurr = useCharacterStore((s) => s.health.hpCurr);
    const sheetHpMax = useCharacterStore((s) => s.health.hpMax);
    const sheetWillCurr = useCharacterStore((s) => s.will.willCurr);
    const sheetWillMax = useCharacterStore((s) => s.will.willMax);
    const sheetInsStat = useCharacterStore((s) => s.stats[CombatStat.INS]);
    const sheetMoves = useCharacterStore((s) => s.moves);

    const sheetName = sheetNickname?.trim() || sheetSpecies?.trim() || 'Active Pokémon';
    const sheetInsight = Math.max(
        1,
        (sheetInsStat?.base || 1) + (sheetInsStat?.rank || 0) + (sheetInsStat?.buff || 0) - (sheetInsStat?.debuff || 0)
    );

    // 2. Target Selection State
    const [targetType, setTargetType] = useState<TargetType>('sheet');
    const [sceneTokens, setSceneTokens] = useState<BattleTargetInfo[]>([]);
    const [selectedTokenId, setSelectedTokenId] = useState<string>('');

    // Custom Target State
    const [customName, setCustomName] = useState<string>('Wild Pokémon');
    const [customMovesText, setCustomMovesText] = useState<string>('Tackle, Growl');
    const [customInsight, setCustomInsight] = useState<number>(1);

    // 3. Tactics & Weights State
    const [tacticsMode, setTacticsMode] = useState<TacticsMode>('equal');
    const [customWeights, setCustomWeights] = useState<CustomWeights>({ damaging: 2, support: 1 });

    // 4. Directive Result State
    const [currentDirective, setCurrentDirective] = useState<string>('');
    const [directiveContext, setDirectiveContext] = useState<string>('');
    const [directiveType, setDirectiveType] = useState<'move' | 'reaction'>('move');
    const [loggedFeedback, setLoggedFeedback] = useState<boolean>(false);

    // 5. Reaction & Fate Check State
    const [reactionOdds, setReactionOdds] = useState<number>(0);
    const [fateReactionResult, setFateReactionResult] = useState<FateCheckResult | null>(null);

    // Subscribe to OBR Scene Tokens if available
    useEffect(() => {
        if (!OBR.isAvailable) return;

        const refreshTokens = async () => {
            try {
                const items = await OBR.scene.items.getItems((i) => i.layer === 'CHARACTER');
                const parsed = items.map((item) => extractTokenTargetInfo(item));
                setSceneTokens(parsed);
                if (parsed.length > 0 && !selectedTokenId) {
                    setSelectedTokenId(parsed[0].id);
                }
            } catch (e) {
                console.warn('[SoloBattleTab] Failed to fetch scene tokens:', e);
            }
        };

        refreshTokens();

        const unsub = OBR.scene.items.onChange((items) => {
            const charItems = items.filter((i) => i.layer === 'CHARACTER');
            const parsed = charItems.map((item) => extractTokenTargetInfo(item));
            setSceneTokens(parsed);
        });

        return () => {
            try {
                unsub();
            } catch {}
        };
    }, [selectedTokenId]);

    // Active Target Resolution
    const activeTarget: BattleTargetInfo = useMemo(() => {
        if (targetType === 'token') {
            const matched = sceneTokens.find((t) => t.id === selectedTokenId);
            if (matched) return matched;
        }

        if (targetType === 'custom') {
            const parsedMoves: MoveData[] = customMovesText
                .split(',')
                .map((m) => m.trim())
                .filter(Boolean)
                .map((name, idx) => ({
                    id: `custom-move-${idx}`,
                    name,
                    category: idx % 2 === 0 ? 'Physical' : 'Status',
                    type: 'Normal',
                    power: 1,
                    active: true,
                    acc1: 'str',
                    acc2: 'brawl',
                    dmg1: 'str',
                    desc: '',
                    marker: ''
                }));

            return {
                id: 'custom-target',
                name: customName.trim() || 'Wild Pokémon',
                hpCurr: 5,
                hpMax: 5,
                willCurr: 4,
                willMax: 4,
                insight: customInsight,
                moves: parsedMoves
            };
        }

        return {
            id: 'active-sheet',
            name: sheetName,
            hpCurr: sheetHpCurr,
            hpMax: sheetHpMax,
            willCurr: sheetWillCurr,
            willMax: sheetWillMax,
            insight: sheetInsight,
            moves: sheetMoves
        };
    }, [
        targetType,
        selectedTokenId,
        sceneTokens,
        customName,
        customMovesText,
        customInsight,
        sheetName,
        sheetHpCurr,
        sheetHpMax,
        sheetWillCurr,
        sheetWillMax,
        sheetInsight,
        sheetMoves
    ]);

    // Candidate moves respecting 3 + Insight limit
    const candidateMoves = useMemo(() => {
        return extractCandidateMoves(activeTarget.moves, activeTarget.insight);
    }, [activeTarget]);

    // Move probabilities with live percentages
    const moveProbabilities = useMemo(() => {
        return calculateMoveProbabilities(candidateMoves, tacticsMode, customWeights);
    }, [candidateMoves, tacticsMode, customWeights]);

    // Handlers
    const handleChooseMove = () => {
        setLoggedFeedback(false);
        if (candidateMoves.length === 0) {
            setCurrentDirective(`No moves configured on ${activeTarget.name}'s sheet.`);
            setDirectiveContext('No candidate moves available on sheet');
            setDirectiveType('move');
            return;
        }

        if (tacticsMode === 'wild') {
            const wildRes = rollWildInstinct(candidateMoves, activeTarget.name);
            setCurrentDirective(wildRes.directive);
            setDirectiveContext(`Wild Instinct [d6 = ${wildRes.d6Roll}]: ${wildRes.behavior} — ${wildRes.description}`);
            setDirectiveType('move');
        } else {
            const selected = selectMoveByTactics(candidateMoves, tacticsMode, customWeights);
            if (selected) {
                const directive = formatMoveDirective(activeTarget.name, selected.name);
                setCurrentDirective(directive);
                setDirectiveContext(
                    `Tactics: ${tacticsMode.toUpperCase()} • ${selected.category} (${selected.type}) • Power ${selected.power || 0}`
                );
                setDirectiveType('move');
            }
        }
    };

    const handleEvade = () => {
        setLoggedFeedback(false);
        const directive = formatEvadeDirective(activeTarget.name);
        setCurrentDirective(directive);
        setDirectiveContext('Defensive Reaction: Evade (Speed + Alert)');
        setDirectiveType('reaction');
    };

    const handleClash = () => {
        setLoggedFeedback(false);
        const clashMove = selectClashMove(candidateMoves);
        if (clashMove) {
            const directive = formatClashDirective(activeTarget.name, clashMove.name);
            setCurrentDirective(directive);
            setDirectiveContext(`Defensive Reaction: Clash (${clashMove.category} • Power ${clashMove.power || 0})`);
        } else {
            setCurrentDirective(`Cannot Clash! ${activeTarget.name} has no damaging moves available.`);
            setDirectiveContext('Defensive Reaction: Clash Failed (Needs Physical or Special move)');
        }
        setDirectiveType('reaction');
    };

    const handleRollFateReaction = () => {
        const result = rollFateCheck(reactionOdds, chaosFactor);
        setFateReactionResult(result);
        setLoggedFeedback(false);

        const outcome = formatFateReactionDirective(activeTarget.name, result.result);
        setCurrentDirective(outcome.directive);
        setDirectiveContext(
            `Fate Check: ${result.result} (Roll ${result.roll} vs ${result.target}, Odds ${result.oddsLabel}) — ${outcome.note}`
        );
        setDirectiveType('reaction');
    };

    const handleLogToHistory = async () => {
        if (!currentDirective) return;
        try {
            await addSoloLog({
                campaign: activeCampaign,
                type: 'battle',
                roll: fateReactionResult ? fateReactionResult.roll : 0,
                result: currentDirective,
                label: directiveType === 'reaction' ? 'Battle Reaction' : 'Battle Move Directive',
                details: `${activeTarget.name} | ${directiveContext}`
            });
            setLoggedFeedback(true);
        } catch (e) {
            console.warn('[SoloBattleTab] Failed to log battle directive:', e);
        }
    };

    return (
        <div className="solo-battle-tab">
            {/* 1. Header / Target Selection */}
            <SoloBattleTargetSelector
                targetType={targetType}
                onSelectTargetType={setTargetType}
                sceneTokens={sceneTokens}
                selectedTokenId={selectedTokenId}
                onSelectTokenId={setSelectedTokenId}
                customName={customName}
                onChangeCustomName={setCustomName}
                customMovesText={customMovesText}
                onChangeCustomMovesText={setCustomMovesText}
                customInsight={customInsight}
                onChangeCustomInsight={setCustomInsight}
                activeTarget={activeTarget}
            />

            {/* 2. Tactics Mode Selector */}
            <SoloBattleTacticsSelector
                tacticsMode={tacticsMode}
                onSelectTacticsMode={setTacticsMode}
                customWeights={customWeights}
                onChangeCustomWeights={setCustomWeights}
            />

            {/* 3. Candidate Move Pool Preview with Live % Badges */}
            <div className="solo-battle__moves-preview">
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '6px'
                    }}
                >
                    <span className="text-subtext" style={{ fontWeight: 600 }}>
                        Candidate Moves ({candidateMoves.length} / {3 + activeTarget.insight})
                    </span>
                    <span className="text-subtext" style={{ fontSize: '0.75rem' }}>
                        Live Probability Distribution
                    </span>
                </div>
                {candidateMoves.length === 0 ? (
                    <div className="text-subtext" style={{ fontStyle: 'italic', padding: '8px 0' }}>
                        No moves available on target sheet.
                    </div>
                ) : (
                    <div className="solo-battle__move-cards-list">
                        {moveProbabilities.map((prob) => (
                            <div key={prob.move.id || prob.move.name} className="solo-battle__move-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span className="solo-battle__move-name">{prob.move.name}</span>
                                    <span
                                        className={`solo-battle__cat-badge solo-battle__cat-badge--${prob.move.category?.toLowerCase() || 'status'}`}
                                    >
                                        {prob.move.category}
                                    </span>
                                </div>
                                <span className="solo-battle__prob-badge">{prob.percentage}%</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 4. Move Decision Button */}
            <div className="solo-battle__action-row">
                <button
                    type="button"
                    className="action-button action-button--theme solo-battle__main-btn"
                    onClick={handleChooseMove}
                >
                    <Dice5 size={18} /> Choose Next Move Directive
                </button>
            </div>

            {/* 5. Prominent Directive Result Box */}
            {currentDirective && (
                <div className="solo-battle__directive-box">
                    <div className="solo-battle__directive-header">
                        <span className="solo-battle__directive-tag">
                            <ScrollText size={13} /> {directiveType.toUpperCase()} DIRECTIVE
                        </span>
                        <button
                            type="button"
                            className="action-button action-button--secondary solo-battle__log-btn"
                            onClick={handleLogToHistory}
                            disabled={loggedFeedback}
                        >
                            {loggedFeedback ? (
                                <>
                                    <Check size={13} color="var(--primary)" /> Logged!
                                </>
                            ) : (
                                'Log to History'
                            )}
                        </button>
                    </div>
                    <div className="solo-battle__directive-text text-title-primary">{currentDirective}</div>
                    {directiveContext && (
                        <div className="solo-battle__directive-context text-subtext">{directiveContext}</div>
                    )}
                </div>
            )}

            {/* 6. Defensive Reactions */}
            <SoloBattleReactions
                onEvade={handleEvade}
                onClash={handleClash}
                reactionOdds={reactionOdds}
                onChangeReactionOdds={setReactionOdds}
                onRollFateReaction={handleRollFateReaction}
            />
        </div>
    );
}
