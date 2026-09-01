import React from 'react';
import {
    Megaphone,
    Sparkles,
    Backpack,
    Apple,
    Sword,
    Info,
    Scroll,
    Heart,
    Flame,
    CheckCircle2,
    ExternalLink,
    Repeat
} from 'lucide-react';
import {
    PMD_CHARACTER_RULES,
    PMD_BAG_CAPACITY_TABLE,
    PMD_ITEM_WEIGHT_TABLE,
    PMD_FOOD_WILL_TABLE,
    PMD_WEAPONS_MODELS,
    PMD_SWITCHER_MOVE_MODELS,
    type PmdBagCapacity,
    type PmdItemWeight,
    type PmdFoodItem,
    type PmdWeaponModel,
    type PmdSwitcherModel
} from '../../../data/gmScreenData';

interface GmHomebrewCardsProps {
    itemId: string;
    onBroadcastCharacterRule: (r: (typeof PMD_CHARACTER_RULES)[0]) => void;
    onBroadcastTreasureBagCapacity: (c: PmdBagCapacity) => void;
    onBroadcastItemWeight: (w: PmdItemWeight) => void;
    onBroadcastFoodItem: (f: PmdFoodItem) => void;
    onBroadcastWeaponModel: (w: PmdWeaponModel) => void;
    onBroadcastSwitcherModel: (s: PmdSwitcherModel) => void;
}

export const GmHomebrewCards: React.FC<GmHomebrewCardsProps> = ({
    itemId,
    onBroadcastCharacterRule,
    onBroadcastTreasureBagCapacity,
    onBroadcastItemWeight,
    onBroadcastFoodItem,
    onBroadcastWeaponModel,
    onBroadcastSwitcherModel
}) => {
    switch (itemId) {
        case 'pmd-character-creation':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="pmd-callout-box">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sparkles size={16} color="var(--primary)" />
                            <strong className="text-title-primary" style={{ fontSize: '0.9rem' }}>
                                Pokémon Mystery Dungeon Character & Progression Rules
                            </strong>
                        </div>
                        <p className="text-subtext" style={{ margin: 0, color: 'var(--text-main)' }}>
                            In Pokémon Mystery Dungeon (PMD) campaigns, Pokémon act as autonomous explorers without
                            human trainers. These popular community rules adapt character creation, durability,
                            knowledge skills, and rank advancement for dungeon crawling.
                        </p>
                    </div>

                    <div className="pmd-rules-grid">
                        {PMD_CHARACTER_RULES.map((rule) => (
                            <div key={rule.id} className="pmd-rule-card">
                                <div className="pmd-rule-card__header">
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            flexWrap: 'wrap',
                                            flex: 1
                                        }}
                                    >
                                        <strong
                                            className="text-label"
                                            style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}
                                        >
                                            {rule.title}
                                        </strong>
                                        <span className="pmd-rule-badge text-theme-header">{rule.badge}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                                        onClick={() => onBroadcastCharacterRule(rule)}
                                        title={`Broadcast ${rule.title} to chat/roll log`}
                                        aria-label={`Broadcast ${rule.title}`}
                                    >
                                        <Megaphone size={12} /> Broadcast
                                    </button>
                                </div>

                                <p
                                    className="text-subtext"
                                    style={{ margin: 0, color: 'var(--text-main)', lineHeight: '1.4' }}
                                >
                                    {rule.summary}
                                </p>
                                <p
                                    className="text-subtext"
                                    style={{
                                        margin: 0,
                                        color: 'var(--text-muted)',
                                        fontSize: '0.78rem',
                                        lineHeight: '1.35'
                                    }}
                                >
                                    {rule.detail}
                                </p>

                                {rule.link && (
                                    <a
                                        href={rule.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="action-button action-button--theme pmd-link-btn"
                                        title="Open Prof. Drake's Held Item Google Doc in new tab"
                                    >
                                        <ExternalLink size={12} />
                                        <span>{rule.linkLabel || 'Held Item Compendium'}</span>
                                    </a>
                                )}

                                <div className="pmd-app-tip-box">
                                    <CheckCircle2
                                        size={13}
                                        color="var(--primary)"
                                        style={{ flexShrink: 0, marginTop: '1px' }}
                                    />
                                    <span
                                        className="text-subtext"
                                        style={{ fontSize: '0.76rem', color: 'var(--text-main)' }}
                                    >
                                        <strong>App Integration:</strong> {rule.appTip}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pmd-disclaimer-box">
                        <Info size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span className="text-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <strong>GM Note:</strong> These character adjustments and progression options are optional
                            community suggestions for PMD campaigns, not official requirements. Feel free to adapt or
                            modify them for your table!
                        </span>
                    </div>
                </div>
            );

        case 'pmd-treasure-bag-weight':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="pmd-callout-box">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Backpack size={16} color="var(--primary)" />
                            <strong className="text-title-primary" style={{ fontSize: '0.9rem' }}>
                                Congra’s Treasure Bag & Weight Progression System
                            </strong>
                        </div>
                        <p className="text-subtext" style={{ margin: 0, color: 'var(--text-main)' }}>
                            Created by <strong>Congra</strong> (<em>@congra</em> in the Pokérole Discord), this system
                            introduces tactical inventory management for PMD expeditions. Players manage limited weight
                            capacity in their Treasure Bag, which scales by{' '}
                            <strong>+5 Weight per Guild Rank achieved</strong>.
                        </p>
                    </div>

                    {/* Bag Capacity Table */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <Scroll size={14} color="var(--primary)" />
                            <strong className="text-label" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                                Treasure Bag Capacity by Guild Rank
                            </strong>
                        </div>
                        <div className="gm-table-wrapper">
                            <table className="gm-table">
                                <thead>
                                    <tr>
                                        <th>Guild Rank</th>
                                        <th style={{ textAlign: 'center' }}>Bag Capacity (Weight)</th>
                                        <th>Notes & Pack Type</th>
                                        <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {PMD_BAG_CAPACITY_TABLE.map((b) => (
                                        <tr key={b.rank}>
                                            <td>
                                                <strong>{b.rank}</strong>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="pmd-weight-pill text-value-highlight">
                                                    {b.capacity} Wt
                                                </span>
                                            </td>
                                            <td>{b.notes}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="action-button action-button--dark gm-card-item-broadcast-btn"
                                                    onClick={() => onBroadcastTreasureBagCapacity(b)}
                                                    title={`Broadcast ${b.rank} Bag Capacity`}
                                                    aria-label={`Broadcast ${b.rank} Bag Capacity`}
                                                >
                                                    <Megaphone size={12} /> Broadcast
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Item Weight Reference Table */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <Info size={14} color="var(--primary)" />
                            <strong className="text-label" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                                Item Type Weight & Packing Reference
                            </strong>
                        </div>
                        <div className="gm-table-wrapper">
                            <table className="gm-table">
                                <thead>
                                    <tr>
                                        <th>Item Category</th>
                                        <th style={{ textAlign: 'center' }}>Weight (Each)</th>
                                        <th style={{ textAlign: 'center' }}>Stack Rate</th>
                                        <th>Examples</th>
                                        <th>Usage & Description</th>
                                        <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {PMD_ITEM_WEIGHT_TABLE.map((i) => (
                                        <tr key={i.category}>
                                            <td>
                                                <strong>{i.category}</strong>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="pmd-weight-pill text-value-highlight">
                                                    {i.weight} Wt
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                <span className="text-subtext">{i.stackRate}</span>
                                            </td>
                                            <td>
                                                <em>{i.examples}</em>
                                            </td>
                                            <td>{i.description}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="action-button action-button--dark gm-card-item-broadcast-btn"
                                                    onClick={() => onBroadcastItemWeight(i)}
                                                    title={`Broadcast ${i.category} Weight`}
                                                    aria-label={`Broadcast ${i.category} Weight`}
                                                >
                                                    <Megaphone size={12} /> Broadcast
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="pmd-disclaimer-box">
                        <Info size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span className="text-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <strong>GM Note:</strong> Treasure Bag capacities and item weights are optional guidelines
                            to support dungeon prep. Adjust weight limits and categories as desired for your table!
                        </span>
                    </div>
                </div>
            );

        case 'pmd-dungeon-economy-food':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Health Drops Banner */}
                    <div className="pmd-callout-box">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Heart size={16} color="var(--primary)" />
                            <strong className="text-title-primary" style={{ fontSize: '0.9rem' }}>
                                Post-Battle Health Berry Drops
                            </strong>
                        </div>
                        <p className="text-subtext" style={{ margin: 0, color: 'var(--text-main)' }}>
                            Because mystery dungeons contain many consecutive battles without access to human Pokémon
                            Centers, health-restoring berries like <strong>Oran Berries</strong> (restores HP) and{' '}
                            <strong>Sitrus Berries</strong> (restores HP / grants Temp HP) should drop frequently from
                            defeated wild Pokémon and treasure rooms to sustain exploration.
                        </p>
                    </div>

                    {/* Food, Apples & Gummis Table */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <Apple size={14} color="var(--primary)" />
                            <strong className="text-label" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                                Mystery Dungeon Food: Will Restoration, Gummis & Belly Treats
                            </strong>
                        </div>
                        <p
                            className="text-subtext"
                            style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}
                        >
                            Food items from the Mystery Dungeon franchise replace the traditional hunger/belly mechanic
                            by replenishing Will Points and granting temporary dungeon buffs or permanent attribute
                            rewards.
                        </p>

                        <div className="gm-table-wrapper">
                            <table className="gm-table">
                                <thead>
                                    <tr>
                                        <th>Food / Item</th>
                                        <th>Type</th>
                                        <th style={{ textAlign: 'center' }}>Will Restored</th>
                                        <th>Effect & Benefits</th>
                                        <th style={{ textAlign: 'center' }}>Rarity</th>
                                        <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {PMD_FOOD_WILL_TABLE.map((food) => (
                                        <tr key={food.name}>
                                            <td>
                                                <strong>{food.name}</strong>
                                            </td>
                                            <td>
                                                <span
                                                    className={`pmd-food-pill pmd-food-pill--${food.category
                                                        .toLowerCase()
                                                        .replace(/\s+/g, '-')}`}
                                                >
                                                    {food.category}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                <strong
                                                    className="text-value-highlight"
                                                    style={{ color: 'var(--primary)' }}
                                                >
                                                    {food.willRestore}
                                                </strong>
                                            </td>
                                            <td>{food.effect}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span
                                                    className={`pmd-rarity-badge pmd-rarity-badge--${food.rarity.toLowerCase().replace(/\s+/g, '-')}`}
                                                >
                                                    {food.rarity}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="action-button action-button--dark gm-card-item-broadcast-btn"
                                                    onClick={() => onBroadcastFoodItem(food)}
                                                    title={`Broadcast ${food.name}`}
                                                    aria-label={`Broadcast ${food.name}`}
                                                >
                                                    <Megaphone size={12} /> Broadcast
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="pmd-disclaimer-box">
                        <Info size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span className="text-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <strong>GM Note:</strong> Food effects, Will restoration amounts, and berry drop rates are
                            optional suggestions to adapt PMD dungeon mechanics to Pokerole.
                        </span>
                    </div>
                </div>
            );

        case 'pmd-weapons-equipment':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="pmd-callout-box">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sword size={16} color="var(--primary)" />
                            <strong className="text-title-primary" style={{ fontSize: '0.9rem' }}>
                                Mystery Dungeon Weapons & Spellcasting Focus Models
                            </strong>
                        </div>
                        <p className="text-subtext" style={{ margin: 0, color: 'var(--text-main)' }}>
                            Some campaigns allow player Pokémon to wield weapons or spell wands found in mystery
                            dungeons. Below are the two most prominent community implementations from the Pokérole
                            Discord. Both models typically occupy <strong>1.0 Weight</strong> in the Treasure Bag.
                        </p>
                    </div>

                    <div className="pmd-weapons-grid">
                        {PMD_WEAPONS_MODELS.map((model) => (
                            <div key={model.name} className="pmd-weapon-card">
                                <div className="pmd-weapon-card__header">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <strong
                                            className="text-label"
                                            style={{ color: 'var(--primary)', fontSize: '0.92rem' }}
                                        >
                                            {model.name}
                                        </strong>
                                        <span
                                            className="text-subtext"
                                            style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                                        >
                                            Model by <strong>{model.creator}</strong> • Type: <em>{model.type}</em>
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                                        onClick={() => onBroadcastWeaponModel(model)}
                                        title={`Broadcast ${model.name}`}
                                        aria-label={`Broadcast ${model.name}`}
                                    >
                                        <Megaphone size={12} /> Broadcast
                                    </button>
                                </div>

                                <p
                                    className="text-subtext"
                                    style={{ margin: 0, color: 'var(--text-main)', lineHeight: '1.4' }}
                                >
                                    {model.description}
                                </p>

                                {model.link && (
                                    <a
                                        href={model.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="action-button action-button--theme pmd-link-btn"
                                        title={`Open ${model.linkLabel || 'Google Doc'} in new tab`}
                                    >
                                        <ExternalLink size={12} />
                                        <span>{model.linkLabel || "Prof. Drake's Weapon Progression Doc"}</span>
                                    </a>
                                )}

                                <div className="pmd-weapon-example-box">
                                    <Flame
                                        size={14}
                                        color="var(--primary)"
                                        style={{ flexShrink: 0, marginTop: '2px' }}
                                    />
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', lineHeight: '1.35' }}>
                                        <strong>Example:</strong> {model.example}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pmd-disclaimer-box">
                        <Info size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span className="text-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <strong>GM Note:</strong> Weapon systems are optional homebrew. GMs should adjust weapon
                            power, stats, and availability to suit their campaign style!
                        </span>
                    </div>
                </div>
            );

        case 'pmd-switcher-moves':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="pmd-callout-box">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Repeat size={16} color="var(--primary)" />
                            <strong className="text-title-primary" style={{ fontSize: '0.9rem' }}>
                                Switcher Moves & Tactical Repositioning in PMD
                            </strong>
                        </div>
                        <p className="text-subtext" style={{ margin: 0, color: 'var(--text-main)', lineHeight: '1.4' }}>
                            In standard trainer battles, Switcher Moves (like{' '}
                            <em>
                                U-turn, Volt Switch, Flip Turn, Teleport, Baton Pass, Parting Shot, Ally Switch, Shed
                                Tail
                            </em>
                            ) return the Pokémon to its Pokéball. Because PMD features autonomous rescue teams
                            navigating tactical dungeon grids together without human trainers on the sidelines, the
                            community uses these popular alternatives for repositioning, cover, and ally redirection.
                        </p>
                    </div>

                    <div className="pmd-weapons-grid">
                        {PMD_SWITCHER_MOVE_MODELS.map((model) => (
                            <div key={model.name} className="pmd-weapon-card">
                                <div className="pmd-weapon-card__header">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <strong
                                            className="text-label"
                                            style={{ color: 'var(--primary)', fontSize: '0.92rem' }}
                                        >
                                            {model.name}
                                        </strong>
                                        <span
                                            className="text-subtext"
                                            style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                                        >
                                            Model by <strong>{model.creator}</strong> • Style: <em>{model.style}</em>
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                                        onClick={() => onBroadcastSwitcherModel(model)}
                                        title={`Broadcast ${model.name}`}
                                        aria-label={`Broadcast ${model.name}`}
                                    >
                                        <Megaphone size={12} /> Broadcast
                                    </button>
                                </div>

                                <p
                                    className="text-subtext"
                                    style={{
                                        margin: 0,
                                        color: 'var(--text-main)',
                                        lineHeight: '1.4',
                                        whiteSpace: 'pre-line'
                                    }}
                                >
                                    {model.description}
                                </p>

                                <div className="pmd-weapon-example-box">
                                    <Sparkles
                                        size={14}
                                        color="var(--primary)"
                                        style={{ flexShrink: 0, marginTop: '2px' }}
                                    />
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', lineHeight: '1.35' }}>
                                        <strong>Example:</strong> {model.example}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pmd-disclaimer-box">
                        <Info size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span className="text-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <strong>GM Note:</strong> Switcher move mechanics are optional community suggestions for PMD
                            campaigns. GMs can choose whichever model fits their dungeon tactical style best!
                        </span>
                    </div>
                </div>
            );

        default:
            return null;
    }
};
