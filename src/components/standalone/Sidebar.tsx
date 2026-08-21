import { useSidebarEngine } from './useSidebarEngine';
import { SidebarContextMenu } from './SidebarContextMenu';
import { SidebarTreeNode } from './SidebarTreeNode';
import { RestoreBackupModal } from './RestoreBackupModal';
import { Menu, ChevronLeft, FolderPlus, FilePlus, Save, ArchiveRestore } from 'lucide-react';
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
        pendingRestoreData,
        handleCreate,
        handleExportMasterBackup,
        handleRestoreMasterBackup,
        confirmRestoreMerge,
        confirmRestoreOverwrite,
        cancelRestore,
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
                <button
                    className="sidebar__toggle-btn text-label"
                    onClick={() => setIsCollapsed(false)}
                    title="Open Directory"
                >
                    <Menu size={20} />
                </button>
            </div>
        );
    }

    return (
        <div className="sidebar">
            <div className="sidebar__header">
                <h2 className="sidebar__title text-title-primary">Directory</h2>
                <button
                    className="sidebar__toggle-btn text-label"
                    onClick={() => setIsCollapsed(true)}
                    title="Collapse Sidebar"
                >
                    <ChevronLeft size={20} />
                </button>
            </div>

            <div className="sidebar__create-panel">
                <div className="sidebar__create-row">
                    <input
                        type="text"
                        className="sidebar__input text-label"
                        placeholder="New Name..."
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreate('character');
                        }}
                    />
                </div>
                <div className="sidebar__create-row">
                    <button
                        className="action-button action-button--dark sidebar__btn text-theme-header"
                        onClick={() => handleCreate('folder')}
                    >
                        <FolderPlus size={14} /> Add Folder
                    </button>
                    <button
                        className="action-button action-button--theme sidebar__btn text-theme-header"
                        onClick={() => handleCreate('character')}
                    >
                        <FilePlus size={14} /> Add Sheet
                    </button>
                </div>
                <div className="sidebar__create-row sidebar__backup-row">
                    <button
                        className="action-button action-button--dark sidebar__btn text-theme-header"
                        onClick={handleExportMasterBackup}
                        title="Export all folders and characters"
                    >
                        <Save size={14} /> Backup
                    </button>
                    <button
                        className="action-button action-button--secondary sidebar__btn text-theme-header"
                        onClick={() => restoreInputRef.current?.click()}
                        title="Restore from a Master Backup file"
                    >
                        <ArchiveRestore size={14} /> Restore
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

                {items.length === 0 && (
                    <p className="sidebar__empty text-subtext">Directory is empty. Create a file above!</p>
                )}
                <div className="sidebar__dropzone-root text-subtext">Drop here to move to Root</div>
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

            {/* Custom Restore Modal */}
            {pendingRestoreData && (
                <RestoreBackupModal
                    onMerge={confirmRestoreMerge}
                    onOverwrite={confirmRestoreOverwrite}
                    onCancel={cancelRestore}
                />
            )}
        </div>
    );
}
