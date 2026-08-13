import type { TreeItem } from './useSidebarEngine';

interface SidebarContextMenuProps {
    contextMenu: { x: number; y: number; item: TreeItem };
    onRename: (item: TreeItem) => void;
    onMove: (item: TreeItem, direction: 'up' | 'down' | 'in' | 'out') => void;
    onDuplicate: (item: TreeItem) => void;
    onDelete: (item: TreeItem) => void;
}

export function SidebarContextMenu({ contextMenu, onRename, onMove, onDuplicate, onDelete }: SidebarContextMenuProps) {
    return (
        <div
            className="sidebar__context-menu"
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            onClick={(e) => e.stopPropagation()}
        >
            <button className="sidebar__context-item" onClick={() => onRename(contextMenu.item)}>
                ✏️ Rename
            </button>

            {/* --- Quick Move Directional Pad --- */}
            <button className="sidebar__context-item" onClick={() => onMove(contextMenu.item, 'up')}>
                ⬆️ Move Up
            </button>
            <button className="sidebar__context-item" onClick={() => onMove(contextMenu.item, 'down')}>
                ⬇️ Move Down
            </button>
            <button className="sidebar__context-item" onClick={() => onMove(contextMenu.item, 'in')}>
                ➡️ Move Into Folder
            </button>
            <button className="sidebar__context-item" onClick={() => onMove(contextMenu.item, 'out')}>
                ⬅️ Move Out (Level Up)
            </button>
            {/* ---------------------------------- */}

            {contextMenu.item.type === 'character' && (
                <button className="sidebar__context-item" onClick={() => onDuplicate(contextMenu.item)}>
                    📄 Duplicate
                </button>
            )}

            <button
                className="sidebar__context-item sidebar__context-item--danger"
                onClick={() => onDelete(contextMenu.item)}
            >
                🗑️ Delete
            </button>
        </div>
    );
}