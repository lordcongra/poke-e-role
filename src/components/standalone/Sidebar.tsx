import { useState, useEffect } from 'react';
import { useSidebarEngine } from './useSidebarEngine';
import { SidebarContextMenu } from './SidebarContextMenu';
import { SidebarTreeNode } from './SidebarTreeNode';
import { RestoreBackupModal } from './RestoreBackupModal';
import { BackupModal } from './BackupModal';
import { Menu, ChevronLeft, FolderPlus, FilePlus, Save, ArchiveRestore, AlertTriangle, X } from 'lucide-react';
import './Sidebar.css';

const ICON_SHADOW = 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.8)) drop-shadow(0 1px 4px rgba(0, 0, 0, 0.6))';

export function Sidebar() {
    const [isPromptDismissed, setIsPromptDismissed] = useState(false);

    const {
        activeTokenId,
        items,
        characterCount,
        folderCount,
        isCollapsed,
        setIsCollapsed,
        newName,
        setNewName,
        expandedNodes,
        initTags,
        contextMenu,
        isBackupModalOpen,
        setIsBackupModalOpen,
        hasUnbackedChanges,
        restoreInputRef,
        pendingRestoreData,
        handleCreate,
        handleExportMasterBackup,
        confirmExportMasterBackup,
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

    useEffect(() => {
        setIsPromptDismissed(false);
    }, [hasUnbackedChanges]);

    if (isCollapsed) {
        return (
            <div className="sidebar sidebar--collapsed">
                <button
                    className="sidebar__toggle-btn text-label"
                    onClick={() => setIsCollapsed(false)}
                    title={hasUnbackedChanges ? 'Open Directory (Unbacked Changes)' : 'Open Directory'}
                >
                    <Menu size={20} />
                    {hasUnbackedChanges && <span className="sidebar__collapsed-badge" title="Unbacked changes" />}
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
                        style={{ color: 'var(--text-main)' }}
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
                        <FolderPlus size={14} style={{ filter: ICON_SHADOW }} /> Add Folder
                    </button>
                    <button
                        className="action-button action-button--theme sidebar__btn text-theme-header"
                        onClick={() => handleCreate('character')}
                    >
                        <FilePlus size={14} style={{ filter: ICON_SHADOW }} /> Add Sheet
                    </button>
                </div>
                <div className="sidebar__create-row sidebar__backup-row">
                    <button
                        className={`action-button action-button--dark sidebar__btn text-theme-header ${
                            hasUnbackedChanges ? 'sidebar__btn--unbacked' : ''
                        }`}
                        onClick={handleExportMasterBackup}
                        title={
                            hasUnbackedChanges
                                ? 'Unbacked changes! Click to backup directory.'
                                : 'Export all folders and characters'
                        }
                    >
                        <Save size={14} style={{ filter: ICON_SHADOW }} /> Backup
                        {hasUnbackedChanges && <span className="sidebar__backup-badge" title="Unbacked changes" />}
                    </button>
                    <button
                        className="action-button action-button--secondary sidebar__btn text-theme-header"
                        onClick={() => restoreInputRef.current?.click()}
                        title="Restore from a Master Backup file"
                    >
                        <ArchiveRestore size={14} style={{ filter: ICON_SHADOW }} /> Restore
                    </button>
                    <input
                        type="file"
                        ref={restoreInputRef}
                        onChange={handleRestoreMasterBackup}
                        accept=".json"
                        className="sidebar__hidden-input"
                    />
                </div>

                {hasUnbackedChanges && !isPromptDismissed && (
                    <div className="sidebar__backup-prompt text-subtext">
                        <div
                            className="sidebar__backup-prompt-main"
                            onClick={handleExportMasterBackup}
                            title="Click to backup your data"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleExportMasterBackup();
                                }
                            }}
                        >
                            <AlertTriangle size={13} className="sidebar__backup-prompt-icon" />
                            <span>Unsaved changes! Backup recommended.</span>
                        </div>
                        <button
                            type="button"
                            className="sidebar__backup-prompt-dismiss"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsPromptDismissed(true);
                            }}
                            aria-label="Dismiss backup warning"
                            title="Dismiss warning"
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}
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

            {/* Custom Backup Modal */}
            {isBackupModalOpen && (
                <BackupModal
                    characterCount={characterCount}
                    folderCount={folderCount}
                    onConfirm={confirmExportMasterBackup}
                    onClose={() => setIsBackupModalOpen(false)}
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
