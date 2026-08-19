import type { TreeItem } from './useSidebarEngine';
import { Pencil, ArrowUp, ArrowDown, FolderInput, FolderOutput, Copy, Trash2 } from 'lucide-react';

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
                <Pencil size={14} /> Rename
            </button>

            {/* --- Quick Move Directional Pad --- */}
            <button className="sidebar__context-item" onClick={() => onMove(contextMenu.item, 'up')}>
                <ArrowUp size={14} /> Move Up
            </button>
            <button className="sidebar__context-item" onClick={() => onMove(contextMenu.item, 'down')}>
                <ArrowDown size={14} /> Move Down
            </button>
            <button className="sidebar__context-item" onClick={() => onMove(contextMenu.item, 'in')}>
                <FolderInput size={14} /> Move Into Folder
            </button>
            <button className="sidebar__context-item" onClick={() => onMove(contextMenu.item, 'out')}>
                <FolderOutput size={14} /> Move Out (Level Up)
            </button>
            {/* ---------------------------------- */}

            {contextMenu.item.type === 'character' && (
                <button className="sidebar__context-item" onClick={() => onDuplicate(contextMenu.item)}>
                    <Copy size={14} /> Duplicate
                </button>
            )}

            <button
                className="sidebar__context-item sidebar__context-item--danger"
                onClick={() => onDelete(contextMenu.item)}
            >
                <Trash2 size={14} /> Delete
            </button>
        </div>
    );
}
