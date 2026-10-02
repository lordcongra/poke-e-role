import { useState } from 'react';
import type { TreeItem } from './useSidebarEngine';
import { SidebarAvatar } from './SidebarAvatar';
import { ChevronDown, ChevronRight, Folder, Dna, Trash2, Swords, MoreVertical } from 'lucide-react';
import { isBeltFolderName } from '../../utils/pc/pcSidebarSync';

interface SidebarTreeNodeProps {
    parentId: string | null;
    depth: number;
    items: TreeItem[];
    activeTokenId: string | null;
    expandedNodes: Record<string, boolean>;
    initTags: Record<string, string>;
    getDragClass: (itemId: string) => string;
    onDragStart: (e: React.DragEvent, item: TreeItem) => void;
    onDragOver: (e: React.DragEvent, item: TreeItem) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, item: TreeItem) => void;
    onSelect: (id: string, meta: Record<string, unknown>) => void;
    onToggleExpand: (e: React.MouseEvent, id: string) => void;
    onContextMenu: (e: React.MouseEvent, item: TreeItem) => void;
    onDelete: (item: TreeItem) => void;
    onTouchStart?: (e: React.TouchEvent, item: TreeItem) => void;
    isClickBlocked?: () => boolean;
    liftedItemId?: string | null;
    partyMemberMap?: Record<string, { trainerName: string; slotNumber: number }>;
}

export function SidebarTreeNode(props: SidebarTreeNodeProps) {
    const {
        parentId,
        depth,
        items,
        activeTokenId,
        expandedNodes,
        initTags,
        getDragClass,
        onDragStart,
        onDragOver,
        onDragLeave,
        onDrop,
        onSelect,
        onToggleExpand,
        onContextMenu,
        onDelete,
        onTouchStart,
        isClickBlocked,
        liftedItemId
    } = props;

    // Track hovered item for desktop mouse drag - keeps draggable=false for mobile touch interactions
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const children = items.filter((i) => i.parentId === parentId);
    if (children.length === 0) return null;

    const parentItem = parentId ? items.find((i) => i.id === parentId) : null;
    const isBeltFolder = parentItem && parentItem.type === 'folder' ? isBeltFolderName(parentItem.name) : false;

    const getSlotNumber = (item: TreeItem): number => {
        if (!props.partyMemberMap) return 999;
        const direct = props.partyMemberMap[item.id];
        if (direct) return direct.slotNumber;
        const metaEntity = item.meta?.entityId ? props.partyMemberMap[item.meta.entityId as string] : undefined;
        if (metaEntity) return metaEntity.slotNumber;
        const byName = props.partyMemberMap[`__name_${item.name.trim().toLowerCase()}`];
        if (byName) return byName.slotNumber;
        const bySpecies = item.meta?.species
            ? props.partyMemberMap[`__species_${String(item.meta.species).trim().toLowerCase()}`]
            : undefined;
        if (bySpecies) return bySpecies.slotNumber;
        return 999;
    };

    const displayChildren =
        isBeltFolder && props.partyMemberMap
            ? [...children].sort((a, b) => getSlotNumber(a) - getSlotNumber(b))
            : children;

    return (
        <>
            {displayChildren.map((item) => {
                const hasChildren = items.some((i) => i.parentId === item.id);
                const isExpanded = expandedNodes[item.id];
                const initTag = initTags[item.id];

                // Track our newly injected tag string
                const isInitActive = initTag === 'init_active';

                return (
                    <div key={item.id} className="sidebar__node">
                        <div
                            className={`sidebar__item ${activeTokenId === item.id ? 'sidebar__item--active' : ''} ${getDragClass(item.id)}`}
                            style={{ paddingLeft: `${depth * 16 + 8}px` }}
                            data-item-id={item.id}
                            data-item-type={item.type}
                            draggable={!liftedItemId && hoveredId === item.id}
                            onMouseEnter={() => setHoveredId(item.id)}
                            onMouseLeave={() => setHoveredId((prev) => (prev === item.id ? null : prev))}
                            onDragStart={(e) => {
                                if (liftedItemId || (isClickBlocked && isClickBlocked())) {
                                    e.preventDefault();
                                    return;
                                }
                                onDragStart(e, item);
                            }}
                            onDragOver={(e) => onDragOver(e, item)}
                            onDragLeave={onDragLeave}
                            onDrop={(e) => onDrop(e, item)}
                            onTouchStart={(e) => {
                                setHoveredId(null);
                                onTouchStart?.(e, item);
                            }}
                            onClick={(e) => {
                                if (isClickBlocked && isClickBlocked()) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    return;
                                }
                                if (item.type === 'character') {
                                    onSelect(item.id, item.meta as Record<string, unknown>);
                                } else {
                                    onToggleExpand(e, item.id);
                                }
                            }}
                            onContextMenu={(e) => {
                                if (liftedItemId || (isClickBlocked && isClickBlocked())) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    return;
                                }
                                onContextMenu(e, item);
                            }}
                        >
                            <div className="sidebar__item-content">
                                {hasChildren ? (
                                    <span className="sidebar__caret" onClick={(e) => onToggleExpand(e, item.id)}>
                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </span>
                                ) : (
                                    <span className="sidebar__caret-empty" />
                                )}

                                {item.type === 'folder' ? (
                                    <span className="sidebar__item-icon" style={{ color: 'var(--primary)' }}>
                                        <Folder size={16} />
                                    </span>
                                ) : (
                                    <SidebarAvatar meta={item.meta} />
                                )}

                                <span className="sidebar__item-name text-label" style={{ color: 'var(--text-main)' }}>
                                    {item.name}
                                </span>

                                {initTag && (
                                    <span
                                        className={`sidebar__init-badge text-theme-header ${isInitActive ? 'sidebar__init-badge--combat' : ''}`}
                                        title={isInitActive ? 'In Initiative Tracker' : undefined}
                                        style={
                                            isInitActive
                                                ? { display: 'flex', alignItems: 'center', justifyContent: 'center' }
                                                : undefined
                                        }
                                    >
                                        {isInitActive ? <Swords size={14} /> : initTag}
                                    </span>
                                )}

                                {/* Transformation Status Badge */}
                                {item.activeTrans && item.activeTrans !== 'None' && (
                                    <span
                                        className="sidebar__trans-badge"
                                        title={`Transformed: ${item.activeTrans}`}
                                        style={{ color: 'var(--primary)' }}
                                    >
                                        <Dna size={14} />
                                    </span>
                                )}

                                {/* Active Belt Party Pokéball Badge */}
                                {(() => {
                                    const badge =
                                        props.partyMemberMap?.[item.id] ||
                                        (item.meta?.entityId
                                            ? props.partyMemberMap?.[item.meta.entityId as string]
                                            : undefined) ||
                                        (isBeltFolder
                                            ? props.partyMemberMap?.[`__name_${item.name.trim().toLowerCase()}`] ||
                                              (item.meta?.species
                                                  ? props.partyMemberMap?.[
                                                        `__species_${String(item.meta.species).trim().toLowerCase()}`
                                                    ]
                                                  : undefined)
                                            : undefined);
                                    if (!badge) return null;
                                    return (
                                        <span
                                            className="sidebar__party-badge"
                                            title={`Active in ${badge.trainerName}'s Belt (Slot #${badge.slotNumber})`}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                marginLeft: 4,
                                                flexShrink: 0
                                            }}
                                        >
                                            <svg
                                                width={13}
                                                height={13}
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2.4"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                style={{ color: 'var(--semantic-danger, #ef4444)' }}
                                            >
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="2" y1="12" x2="22" y2="12" />
                                                <circle cx="12" cy="12" r="3" />
                                                <circle cx="12" cy="12" r="1" fill="currentColor" />
                                            </svg>
                                        </span>
                                    );
                                })()}
                            </div>
                            <div className="sidebar__item-actions">
                                <button
                                    type="button"
                                    className="sidebar__more-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onContextMenu(e, item);
                                    }}
                                    title="More options"
                                    aria-label="More options"
                                >
                                    <MoreVertical size={16} />
                                </button>
                                <button
                                    className="sidebar__delete-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(item);
                                    }}
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {isExpanded && <SidebarTreeNode {...props} parentId={item.id} depth={depth + 1} />}
                    </div>
                );
            })}
        </>
    );
}
