import React from 'react';
import { ArrowUp, ArrowDown, Megaphone } from 'lucide-react';
import { broadcastInfo } from '@/utils/combat/diceRoller';

export interface ReactionLadderTier {
    tier: string;
    speed: number;
    moves: string[];
}

export const REACTIONS_LADDER: ReactionLadderTier[] = [
    { tier: '↑6', speed: 6, moves: ['Evasion', 'Clash', 'Snatch', 'Sucker Punch'] },
    { tier: '↑5', speed: 5, moves: ['Protect', 'Endure', 'Helping Hand'] },
    { tier: '↑4', speed: 4, moves: ["King's Shield", 'Obstruct', 'Baneful Bunker'] },
    { tier: '↑3', speed: 3, moves: ['Encore', 'Spotlight', 'Wide Guard'] },
    { tier: '↑2', speed: 2, moves: ['Extreme Speed', 'Rage Powder', 'Zippy Zap'] },
    { tier: '↑1', speed: 1, moves: ['Quick Attack', 'Water Shuriken', 'Mach Punch'] }
];

export const LATE_REACTIONS_LADDER: ReactionLadderTier[] = [
    { tier: '↓1', speed: 1, moves: ['Circle Throw', 'Vital Throw', 'Feint'] },
    { tier: '↓2', speed: 2, moves: ['Dragon Tail'] },
    { tier: '↓3', speed: 3, moves: ['Shell Trap'] },
    { tier: '↓4', speed: 4, moves: ['Avalanche'] },
    { tier: '↓5', speed: 5, moves: ['Counter', 'Mirror Coat', 'Metal Burst'] },
    { tier: '↓6', speed: 6, moves: ['Roar', 'Whirlwind'] }
];

export const REACTION_LADDER_DISCORD_MARKDOWN = `## ⚡ **Reaction & Late Reaction Priority Ladder**
> *Official Poke-role combat timing ladder for interrupting maneuvers and delayed counter-attacks.*

### ↑ **Reactions (Resolve BEFORE Action — Higher Numbers Resolve FIRST)**
• **↑6**: Evasion, Clash, Snatch, Sucker Punch
• **↑5**: Protect, Endure, Helping Hand
• **↑4**: King's Shield, Obstruct, Baneful Bunker
• **↑3**: Encore, Spotlight, Wide Guard
• **↑2**: Extreme Speed, Rage Powder, Zippy Zap
• **↑1**: Quick Attack, Water Shuriken, Mach Punch
*Turn Flow: [Main Action Declared] ➔ [Reaction Declared] ➔ [Reaction Resolves] ➔ [Main Action Resolves]*

### ↓ **Late Reactions (Resolve AFTER Action — Lower Numbers Resolve FIRST, Higher Numbers Resolve LATER)**
• **↓1**: Circle Throw, Vital Throw, Feint
• **↓2**: Dragon Tail
• **↓3**: Shell Trap
• **↓4**: Avalanche
• **↓5**: Counter, Mirror Coat, Metal Burst
• **↓6**: Roar, Whirlwind
*Turn Flow: [Main Action Declared] ➔ [Main Action Resolves] ➔ [Late Reaction Declared] ➔ [Late Reaction Resolves]*`;

interface GmReactionPriorityLadderProps {
    onBroadcastLadder?: () => void;
}

export const GmReactionPriorityLadder: React.FC<GmReactionPriorityLadderProps> = ({ onBroadcastLadder }) => {
    const handleBroadcast = () => {
        if (onBroadcastLadder) {
            onBroadcastLadder();
        } else {
            broadcastInfo('Reaction & Late Reaction Priority Ladder', REACTION_LADDER_DISCORD_MARKDOWN);
        }
    };

    const renderColumn = (title: string, sub: string, color: string, isReaction: boolean, list: ReactionLadderTier[]) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: 'var(--panel-bg)', padding: '10px', borderRadius: '6px', border: `1px solid ${color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', color, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                    {isReaction ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {title}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sub}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {list.map((item) => (
                    <div key={item.tier} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--panel-alt)', fontSize: '0.76rem' }}>
                        <span style={{ backgroundColor: color, color: '#FFFFFF', fontWeight: 'bold', padding: '1px 6px', borderRadius: '3px', minWidth: '28px', textAlign: 'center' }}>
                            {item.tier}
                        </span>
                        <span style={{ color: 'var(--text-main)', lineHeight: '1.3' }}>{item.moves.join(', ')}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', backgroundColor: 'var(--panel-alt)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>12-Tier Reaction Priority Ladder</strong>
                <button
                    type="button"
                    className="action-button action-button--dark gm-card-item-broadcast-btn"
                    onClick={handleBroadcast}
                    title="Broadcast priority ladder to chat/roll log"
                    aria-label="Broadcast Reaction Priority Ladder"
                >
                    <Megaphone size={12} /> Broadcast Ladder
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ padding: '6px 10px', backgroundColor: 'var(--panel-bg)', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ fontWeight: 'bold', color: '#00ACC1' }}>Reactions:</span>
                    <span style={{ color: 'var(--text-muted)' }}>[Main Action Declared] ➔ [Reaction Declared] ➔</span>
                    <span style={{ fontWeight: 'bold', color: '#00ACC1' }}>[Reaction Resolves]</span>
                    <span style={{ color: 'var(--text-muted)' }}>➔ [Main Action Resolves]</span>
                </div>
                <div style={{ padding: '6px 10px', backgroundColor: 'var(--panel-bg)', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ fontWeight: 'bold', color: '#7E57C2' }}>Late Reactions:</span>
                    <span style={{ color: 'var(--text-muted)' }}>[Main Action Declared] ➔ [Main Action Resolves] ➔ [Late Reaction Declared] ➔</span>
                    <span style={{ fontWeight: 'bold', color: '#7E57C2' }}>[Late Reaction Resolves]</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                {renderColumn('Reactions (Resolve BEFORE Action)', 'Higher Resolves First', '#00ACC1', true, REACTIONS_LADDER)}
                {renderColumn('Late Reactions (Resolve AFTER Action)', 'Lower Resolves First', '#7E57C2', false, LATE_REACTIONS_LADDER)}
            </div>
        </div>
    );
};
