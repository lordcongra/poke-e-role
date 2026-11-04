import { HelpCircle, X, Zap, Package, Megaphone } from 'lucide-react';
import { TagPillList } from '@/components/ui/TagPillList';
import { extractTagsFromText } from '@/components/modals/items/tagBuilder/tagBuilderLogic';
import { broadcastInfo } from '@/utils/combat/diceRoller';
import { lookupAbilityDetails } from '@/utils/common/abilityLookupUtils';
import { lookupMultipleItemDetails } from '@/utils/common/itemLookupUtils';

export interface ItemDetailEntry {
    name: string;
    desc?: string;
    tags?: string;
}

export interface BattleOrganizerTooltipInfo {
    title: string;
    desc?: string;
    effect?: string;
    summary?: string;
    tags?: string;
    type?: 'ability' | 'item' | 'info';
    broadcastText?: string;
    items?: ItemDetailEntry[];
}

export interface BattleOrganizerTooltipModalProps {
    tooltipInfo: BattleOrganizerTooltipInfo | null;
    onClose: () => void;
}

export async function getAbilityTooltipInfo(
    abilityName: string,
    rank?: string,
    tags?: string
): Promise<BattleOrganizerTooltipInfo> {
    const details = await lookupAbilityDetails(abilityName, rank, tags);
    const title = details.name || abilityName;

    const broadcastParts: string[] = [];
    if (details.tags) broadcastParts.push(`Tags: ${details.tags}`);
    if (details.effect) broadcastParts.push(`Effect: ${details.effect}`);
    if (details.summary && details.summary !== details.effect) broadcastParts.push(`Summary: ${details.summary}`);
    if (details.description && details.description !== details.effect) broadcastParts.push(`Description: ${details.description}`);
    const broadcastText =
        broadcastParts.join('\n\n') || details.description || details.effect || details.summary || 'No description available.';

    return {
        title,
        desc: details.description,
        effect: details.effect,
        summary: details.summary,
        tags: details.tags,
        type: 'ability',
        broadcastText
    };
}

export async function getItemTooltipInfo(rawHeldItem: string): Promise<BattleOrganizerTooltipInfo> {
    const items = await lookupMultipleItemDetails(rawHeldItem);

    if (items.length === 0) {
        return {
            title: rawHeldItem || 'Held Items',
            desc: 'No details found for this held item.',
            type: 'item',
            broadcastText: 'No details found for this held item.'
        };
    }

    if (items.length === 1) {
        const details = items[0];
        const title = details.name;
        const broadcastParts: string[] = [];
        if (details.tags) broadcastParts.push(`Tags: ${details.tags}`);
        if (details.description && details.description !== 'No description available.') {
            broadcastParts.push(`Description: ${details.description}`);
        }
        const broadcastText = broadcastParts.join('\n\n') || details.description || 'No description available.';

        return {
            title,
            desc: details.description,
            tags: details.tags,
            type: 'item',
            broadcastText
        };
    }

    const itemEntries: ItemDetailEntry[] = items.map((it) => ({
        name: it.name,
        desc: it.description,
        tags: it.tags
    }));

    const broadcastBlocks: string[] = [];
    for (const it of items) {
        const lines: string[] = [`* ${it.name}`];
        if (it.tags) lines.push(`  Tags: ${it.tags}`);
        if (it.description && it.description !== 'No description available.') {
            lines.push(`  Description: ${it.description}`);
        }
        broadcastBlocks.push(lines.join('\n'));
    }

    return {
        title: `Held Items (${items.length})`,
        type: 'item',
        items: itemEntries,
        broadcastText: broadcastBlocks.join('\n\n')
    };
}

export function BattleOrganizerTooltipModal({ tooltipInfo, onClose }: BattleOrganizerTooltipModalProps) {
    if (!tooltipInfo) return null;

    const isInteractive = tooltipInfo.type === 'ability' || tooltipInfo.type === 'item';
    const parsedTags = tooltipInfo.tags ? extractTagsFromText(tooltipInfo.tags) : [];

    const handleBroadcast = async () => {
        const text = tooltipInfo.broadcastText || tooltipInfo.effect || tooltipInfo.desc || '';
        const prefix = tooltipInfo.type === 'ability' ? 'Ability: ' : tooltipInfo.type === 'item' ? 'Item: ' : '';
        const broadcastTitle = tooltipInfo.title.startsWith(prefix) ? tooltipInfo.title : `${prefix}${tooltipInfo.title}`;
        await broadcastInfo(broadcastTitle, text);
        onClose();
    };

    const renderIcon = () => {
        if (tooltipInfo.type === 'ability') {
            return <Zap size={18} color="var(--primary)" />;
        }
        if (tooltipInfo.type === 'item') {
            return <Package size={18} color="var(--primary)" />;
        }
        return <HelpCircle size={18} color="var(--primary)" />;
    };

    return (
        <div className="bo-settings__overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bo-settings__content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
                <div className="bo-settings__header-row">
                    <h3 className="bo-settings__title text-title-primary">
                        {renderIcon()} {tooltipInfo.title}
                    </h3>
                    <button
                        type="button"
                        className="bo-settings__close-x"
                        onClick={onClose}
                        title="Close info"
                        aria-label="Close info"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div
                    style={{
                        padding: '10px 0',
                        fontSize: '0.88rem',
                        lineHeight: '1.5',
                        color: 'var(--text-main)',
                        whiteSpace: 'pre-line'
                    }}
                >
                    {tooltipInfo.items && tooltipInfo.items.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {tooltipInfo.items.map((item, idx) => {
                                const itemTags = item.tags ? extractTagsFromText(item.tags) : [];
                                return (
                                    <div
                                        key={`${item.name}-${idx}`}
                                        style={{
                                            paddingBottom: idx < tooltipInfo.items!.length - 1 ? '10px' : '0',
                                            borderBottom:
                                                idx < tooltipInfo.items!.length - 1
                                                    ? '1px solid var(--border-color, var(--border, #3a3a3a))'
                                                    : 'none'
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontWeight: 600,
                                                color: 'var(--text-main)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                marginBottom: '4px'
                                            }}
                                        >
                                            <Package size={14} color="var(--primary)" />
                                            <span>{item.name}</span>
                                        </div>

                                        {itemTags.length > 0 && (
                                            <div style={{ margin: '4px 0 6px 0' }}>
                                                <TagPillList tags={itemTags} readOnly />
                                            </div>
                                        )}

                                        <div
                                            style={{
                                                fontSize: '0.85rem',
                                                lineHeight: '1.4',
                                                color:
                                                    item.desc === 'No description available.'
                                                        ? 'var(--text-muted)'
                                                        : 'var(--text-main)'
                                            }}
                                        >
                                            {item.desc || 'No description available.'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <>
                            {parsedTags.length > 0 && (
                                <div style={{ marginBottom: '10px' }}>
                                    <TagPillList tags={parsedTags} readOnly />
                                </div>
                            )}

                            {tooltipInfo.summary && tooltipInfo.summary !== tooltipInfo.effect && tooltipInfo.summary !== tooltipInfo.desc && (
                                <div style={{ marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    {tooltipInfo.summary}
                                </div>
                            )}

                            {tooltipInfo.effect && (
                                <div style={{ marginBottom: '8px', lineHeight: '1.4' }}>
                                    <strong style={{ color: 'var(--text-main)' }}>Effect: </strong>
                                    <span>{tooltipInfo.effect}</span>
                                </div>
                            )}

                            {tooltipInfo.desc && tooltipInfo.desc !== tooltipInfo.effect && (
                                <div
                                    style={{
                                        marginBottom: '8px',
                                        lineHeight: '1.4',
                                        color: tooltipInfo.effect ? 'var(--text-muted)' : 'var(--text-main)',
                                        fontStyle: tooltipInfo.effect ? 'italic' : 'normal'
                                    }}
                                >
                                    {tooltipInfo.desc}
                                </div>
                            )}

                            {!tooltipInfo.effect && !tooltipInfo.desc && !tooltipInfo.summary && (
                                <div style={{ color: 'var(--text-muted)' }}>No description available.</div>
                            )}
                        </>
                    )}
                </div>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '8px',
                        marginTop: '10px'
                    }}
                >
                    {isInteractive && (
                        <button
                            type="button"
                            className="action-button action-button--theme"
                            onClick={handleBroadcast}
                            title="Broadcast details to Owlbear Rodeo chat"
                        >
                            <Megaphone size={16} /> Broadcast
                        </button>
                    )}
                    <button type="button" className="action-button action-button--primary" onClick={onClose}>
                        Got It
                    </button>
                </div>
            </div>
        </div>
    );
}
