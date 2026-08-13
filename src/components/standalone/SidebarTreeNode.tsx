import type { TreeItem } from './useSidebarEngine';
import { SidebarAvatar } from './SidebarAvatar';

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
        onDelete
    } = props;

    const children = items.filter((i) => i.parentId === parentId);
    if (children.length === 0) return null;

    return (
        <>
            {children.map((item) => {
                const hasChildren = items.some((i) => i.parentId === item.id);
                const isExpanded = expandedNodes[item.id];
                const initTag = initTags[item.id];

                return (
                    <div key={item.id} className="sidebar__node">
                        <div
                            className={`sidebar__item ${activeTokenId === item.id ? 'sidebar__item--active' : ''} ${getDragClass(item.id)}`}
                            style={{ paddingLeft: `${depth * 16 + 8}px` }}
                            draggable
                            onDragStart={(e) => onDragStart(e, item)}
                            onDragOver={(e) => onDragOver(e, item)}
                            onDragLeave={onDragLeave}
                            onDrop={(e) => onDrop(e, item)}
                            onClick={(e) => {
                                if (item.type === 'character') {
                                    onSelect(item.id, item.meta as Record<string, unknown>);
                                } else {
                                    onToggleExpand(e, item.id);
                                }
                            }}
                            onContextMenu={(e) => onContextMenu(e, item)}
                        >
                            <div className="sidebar__item-content">
                                {hasChildren ? (
                                    <span className="sidebar__caret" onClick={(e) => onToggleExpand(e, item.id)}>
                                        {isExpanded ? '▼' : '▶'}
                                    </span>
                                ) : (
                                    <span className="sidebar__caret-empty" />
                                )}

                                {item.type === 'folder' ? (
                                    <span className="sidebar__item-icon">📁</span>
                                ) : (
                                    <SidebarAvatar meta={item.meta} />
                                )}

                                <span className="sidebar__item-name">{item.name}</span>
                                
                                {initTag && (
                                    <span className={`sidebar__init-badge ${initTag === '⚔️' ? 'sidebar__init-badge--combat' : ''}`}>
                                        {initTag}
                                    </span>
                                )}
                            </div>
                            <button
                                className="sidebar__delete-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(item);
                                }}
                                title="Delete"
                            >
                                🗑️
                            </button>
                        </div>
                        
                        {isExpanded && (
                            <SidebarTreeNode
                                {...props}
                                parentId={item.id}
                                depth={depth + 1}
                            />
                        )}
                    </div>
                );
            })}
        </>
    );
}