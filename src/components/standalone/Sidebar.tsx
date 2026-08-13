import { useSidebarEngine } from './useSidebarEngine';
import { SidebarContextMenu } from './SidebarContextMenu';
import { SidebarTreeNode } from './SidebarTreeNode';
import './Sidebar.css';

export function Sidebar() {
    const {
        activeTokenId,
        items,
        isCollapsed,
        setIsCollapsed,
        newName,
        setNewName,
        expandedNodes,
        initTags,
        contextMenu,
        restoreInputRef,
        handleCreate,
        handleExportMasterBackup,
        handleRestoreMasterBackup,
        handleSelectCharacter,
        executeRename,
        executeDuplicate,
        executeMove,
        executeDelete,
        toggleExpand,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleContextMenu,
        getDragClass,
        setDragOverInfo
    } = useSidebarEngine();

    if (isCollapsed) {
        return (
            <div className="sidebar sidebar--collapsed">
                <button className="sidebar__toggle-btn" onClick={() => setIsCollapsed(false)}>
                    ☰
                </button>
            </div>
        );
    }

    return (
        <div className="sidebar">
            <div className="sidebar__header">
                <h2 className="sidebar__title">Directory</h2>
                <button className="sidebar__toggle-btn" onClick={() => setIsCollapsed(true)}>
                    ◀
                </button>
            </div>

            <div className="sidebar__create-panel">
                <div className="sidebar__create-row">
                    <input
                        type="text"
                        className="sidebar__input"
                        placeholder="New Name..."
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreate('character');
                        }}
                    />
                </div>
                <div className="sidebar__create-row">
                    <button className="sidebar__btn sidebar__btn--folder" onClick={() => handleCreate('folder')}>
                        📁 Add Folder
                    </button>
                    <button className="sidebar__btn sidebar__btn--char" onClick={() => handleCreate('character')}>
                        📄 Add Sheet
                    </button>
                </div>
                <div className="sidebar__create-row sidebar__backup-row">
                    <button
                        className="sidebar__btn sidebar__btn--backup"
                        onClick={handleExportMasterBackup}
                        title="Export all folders and characters"
                    >
                        💾 Backup
                    </button>
                    <button
                        className="sidebar__btn sidebar__btn--restore"
                        onClick={() => restoreInputRef.current?.click()}
                        title="Restore from a Master Backup file"
                    >
                        📂 Restore
                    </button>
                    <input
                        type="file"
                        ref={restoreInputRef}
                        onChange={handleRestoreMasterBackup}
                        accept=".json"
                        className="sidebar__hidden-input"
                    />
                </div>
            </div>

            <div
                className="sidebar__tree"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, null)}
                onMouseLeave={() => setDragOverInfo(null)}
            >
                <SidebarTreeNode
                    parentId={null}
                    depth={0}
                    items={items}
                    activeTokenId={activeTokenId}
                    expandedNodes={expandedNodes}
                    initTags={initTags}
                    getDragClass={getDragClass}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onSelect={handleSelectCharacter}
                    onToggleExpand={toggleExpand}
                    onContextMenu={handleContextMenu}
                    onDelete={executeDelete}
                />

                {items.length === 0 && <p className="sidebar__empty">Directory is empty. Create a file above!</p>}
                <div className="sidebar__dropzone-root">Drop here to move to Root</div>
            </div>

            {contextMenu && (
                <SidebarContextMenu
                    contextMenu={contextMenu}
                    onRename={executeRename}
                    onMove={executeMove}
                    onDuplicate={executeDuplicate}
                    onDelete={executeDelete}
                />
            )}
        </div>
    );
}
