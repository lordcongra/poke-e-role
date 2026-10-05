import { useState, useEffect } from 'react';
import { useSidebarEngine } from './useSidebarEngine';
import { SidebarContextMenu } from './SidebarContextMenu';
import { SidebarTreeNode } from './SidebarTreeNode';
import { RestoreBackupModal } from './RestoreBackupModal';
import { BackupModal } from './BackupModal';
import { LegacyNestingModal } from './LegacyNestingModal';
import { Menu, ChevronLeft, FolderPlus, FilePlus, Save, ArchiveRestore, AlertTriangle, X, Folder } from 'lucide-react';
import { SidebarAvatar } from './SidebarAvatar';
import './Sidebar.css';

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
        partyMemberMap,
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
        handleOrganizeTrainerFolders,
        handleOpenPc,
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
        setDragOverInfo,
        dragOverInfo,
        treeContainerRef,
        liftedItemId,
        touchGhostItem,
        touchGhostPos,
        isTouchDragActive,
        handleItemTouchStart,
        isClickBlocked,
        closeContextMenu,
        isLegacyNestingModalOpen,
        legacyNestedCount,
        handleAutoFolderLegacyNesting,
        handleFlattenLegacyNesting,
        handleDismissLegacyNesting
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
                        <Save size={14} /> Backup
                        {hasUnbackedChanges && <span className="sidebar__backup-badge" title="Unbacked changes" />}
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
                ref={treeContainerRef}
                className={`sidebar__tree ${isTouchDragActive || liftedItemId ? 'sidebar__tree--dragging' : ''}`}
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
                    partyMemberMap={partyMemberMap}
                    getDragClass={getDragClass}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onSelect={handleSelectCharacter}
                    onToggleExpand={toggleExpand}
                    onContextMenu={handleContextMenu}
                    onDelete={executeDelete}
                    liftedItemId={liftedItemId}
                    onTouchStart={handleItemTouchStart}
                    isClickBlocked={isClickBlocked}
                />

                {items.length === 0 && (
                    <p className="sidebar__empty text-subtext">Directory is empty. Create a file above!</p>
                )}
                <div
                    className={`sidebar__dropzone-root text-subtext ${
                        dragOverInfo?.id === '__root__' ? 'sidebar__dropzone-root--active' : ''
                    }`}
                    data-drop-zone="root"
                >
                    Drop here to move to Root
                </div>
            </div>

            {/* Floating Drag Ghost for Touch Drag-and-Drop */}
            {touchGhostItem && touchGhostPos && (
                <div
                    className="sidebar__drag-ghost"
                    style={{
                        left: `${touchGhostPos.x}px`,
                        top: `${touchGhostPos.y}px`
                    }}
                >
                    {touchGhostItem.type === 'folder' ? (
                        <span className="sidebar__item-icon" style={{ color: 'var(--primary)' }}>
                            <Folder size={16} />
                        </span>
                    ) : (
                        <SidebarAvatar meta={touchGhostItem.meta} />
                    )}
                    <span className="sidebar__drag-ghost-name text-label">{touchGhostItem.name}</span>
                </div>
            )}

            {contextMenu && (
                <>
                    <div
                        className="sidebar__context-backdrop"
                        onClick={closeContextMenu}
                        onTouchStart={(e) => {
                            e.stopPropagation();
                            closeContextMenu();
                        }}
                    />
                    <SidebarContextMenu
                        contextMenu={contextMenu}
                        onRename={executeRename}
                        onMove={executeMove}
                        onDuplicate={executeDuplicate}
                        onDelete={executeDelete}
                        onOrganizeFolders={handleOrganizeTrainerFolders}
                        onOpenPc={handleOpenPc}
                    />
                </>
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

            {/* Legacy Nested Sheets Modal */}
            {isLegacyNestingModalOpen && (
                <LegacyNestingModal
                    count={legacyNestedCount}
                    onAutoFolder={handleAutoFolderLegacyNesting}
                    onFlatten={handleFlattenLegacyNesting}
                    onClose={handleDismissLegacyNesting}
                />
            )}
        </div>
    );
}
