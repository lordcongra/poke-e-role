import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '@/store/useCharacterStore';
import { HomebrewTypes } from './HomebrewTypes';
import { HomebrewAbilities } from './HomebrewAbilities';
import { HomebrewMoves } from './HomebrewMoves';
import { HomebrewPokemon } from './HomebrewPokemon';
import { HomebrewItems } from './HomebrewItems';
import { HomebrewForms } from './HomebrewForms';
import { HomebrewStatuses } from './HomebrewStatuses';
import { HomebrewFieldEffects } from './HomebrewFieldEffects';
import { isStandaloneMode } from '@/utils/sync/storageAdapter';
import { validateAndSanitizeHomebrewBackup } from '@/utils/sync/homebrewSanitizer';
import { downloadJson } from '@/utils/common/fileSystemHelpers';
import { Hammer, X, Radio, Save, FolderOpen, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import { HomebrewStorageTracker } from './HomebrewStorageTracker';
import { HomebrewImportConfirmModal, type HomebrewImportPayload } from './HomebrewImportConfirmModal';
import './Homebrew.css';

export function HomebrewModal({ onClose }: { onClose: () => void }) {
    const role = useCharacterStore((state) => state.role);
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = isStandaloneMode || role === 'GM' || access === 'Full';

    const [isMaximized, setIsMaximized] = useState<boolean>(() => {
        if (!isStandaloneMode) return true;
        try {
            return localStorage.getItem('pkr_homebrew_standalone_maximized') === 'true';
        } catch {
            return false;
        }
    });

    const toggleMaximize = () => {
        setIsMaximized((prev) => {
            const next = !prev;
            try {
                localStorage.setItem('pkr_homebrew_standalone_maximized', String(next));
            } catch (e) {
                console.error('[HomebrewModal] Failed to persist maximize state', e);
            }
            return next;
        });
    };

    const [activeTab, setActiveTab] = useState<
        'types' | 'abilities' | 'moves' | 'pokemon' | 'items' | 'forms' | 'statuses' | 'fieldEffects'
    >('types');
    const overwriteAllHomebrewData = useCharacterStore((state) => state.overwriteAllHomebrewData);
    const mergeAllHomebrewData = useCharacterStore((state) => state.mergeAllHomebrewData);

    const needsBackup = useCharacterStore((state) => state.needsBackup);
    const markHomebrewBackedUp = useCharacterStore((state) => state.markHomebrewBackedUp);

    const fileRef = useRef<HTMLInputElement>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [importAllData, setImportAllData] = useState<HomebrewImportPayload | null>(null);

    const handleBroadcastSync = () => {
        if (!OBR.isAvailable) return;
        const payload = useCharacterStore.getState().getHomebrewPayload();

        if (role === 'GM') {
            OBR.broadcast.sendMessage('pokerole-pmd-extension/homebrew-payload', payload, { destination: 'REMOTE' });
            OBR.notification.show('Homebrew data pushed to all players!', 'SUCCESS');
        } else {
            OBR.broadcast.sendMessage('pokerole-pmd-extension/player-homebrew-request', payload, {
                destination: 'REMOTE'
            });
            OBR.notification.show('Homebrew contribution sent to GM!', 'INFO');
        }
    };

    const handleExportAll = () => {
        const state = useCharacterStore.getState();
        const exportData = {
            customTypes: state.roomCustomTypes,
            customAbilities: state.roomCustomAbilities,
            customMoves: state.roomCustomMoves,
            customPokemon: state.roomCustomPokemon,
            customItems: state.roomCustomItems,
            customForms: state.roomCustomForms,
            customStatuses: state.roomCustomStatuses,
            customFieldEffects: state.roomCustomFieldEffects
        };
        downloadJson(exportData, 'pokerole_homebrew_backup.json');

        markHomebrewBackedUp();
    };

    const handleImportAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportError(null);
        const showError = (message: string) => {
            setImportError(message);
            if (OBR.isAvailable) OBR.notification.show(message, 'ERROR');
        };
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target?.result as string);
                const sanitized = validateAndSanitizeHomebrewBackup(imported);
                if (sanitized) {
                    setImportAllData({
                        types: sanitized.customTypes,
                        abs: sanitized.customAbilities,
                        moves: sanitized.customMoves,
                        mons: sanitized.customPokemon,
                        items: sanitized.customItems,
                        forms: sanitized.customForms,
                        statuses: sanitized.customStatuses,
                        fieldEffects: sanitized.customFieldEffects || []
                    });
                } else {
                    showError('Invalid Homebrew Backup file.');
                }
            } catch (err) {
                console.error('[HomebrewModal] Failed to parse homebrew backup JSON:', err);
                showError('Failed to parse JSON.');
            }
            if (fileRef.current) fileRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const overlayClass =
        `homebrew-modal__overlay ${!isStandaloneMode ? 'homebrew-modal__overlay--obr' : isMaximized ? 'homebrew-modal__overlay--maximized' : ''}`.trim();
    const contentClass = `homebrew-modal__content ${
        !isStandaloneMode
            ? 'homebrew-modal__content--obr'
            : isMaximized
              ? 'homebrew-modal__content--standalone-maximized'
              : 'homebrew-modal__content--standalone'
    }`.trim();

    return (
        <div className={overlayClass}>
            <div className={contentClass}>
                <div className="homebrew-modal__header">
                    <div className="homebrew-modal__title-row">
                        <h3
                            className="homebrew-modal__title text-theme-header"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Hammer size={20} /> Homebrew Workshop
                        </h3>
                        <div className="homebrew-modal__header-actions">
                            {isStandaloneMode && (
                                <button
                                    onClick={toggleMaximize}
                                    className="homebrew-modal__header-btn text-theme-header"
                                    title={isMaximized ? 'Restore Window' : 'Maximize Window'}
                                    aria-label={isMaximized ? 'Restore Window' : 'Maximize Window'}
                                >
                                    {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="homebrew-modal__close-btn text-theme-header"
                                title="Close Workshop"
                                aria-label="Close Workshop"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="homebrew-modal__tabs">
                        <button
                            onClick={() => setActiveTab('types')}
                            className={`homebrew-modal__tab ${activeTab === 'types' ? 'homebrew-modal__tab--active' : ''}`}
                        >
                            Types
                        </button>
                        <button
                            onClick={() => setActiveTab('abilities')}
                            className={`homebrew-modal__tab ${activeTab === 'abilities' ? 'homebrew-modal__tab--active' : ''}`}
                        >
                            Abilities
                        </button>
                        <button
                            onClick={() => setActiveTab('moves')}
                            className={`homebrew-modal__tab ${activeTab === 'moves' ? 'homebrew-modal__tab--active' : ''}`}
                        >
                            Moves
                        </button>
                        <button
                            onClick={() => setActiveTab('pokemon')}
                            className={`homebrew-modal__tab ${activeTab === 'pokemon' ? 'homebrew-modal__tab--active' : ''}`}
                        >
                            Pokémon
                        </button>
                        <button
                            onClick={() => setActiveTab('items')}
                            className={`homebrew-modal__tab ${activeTab === 'items' ? 'homebrew-modal__tab--active' : ''}`}
                        >
                            Items
                        </button>
                        <button
                            onClick={() => setActiveTab('forms')}
                            className={`homebrew-modal__tab ${activeTab === 'forms' ? 'homebrew-modal__tab--active' : ''}`}
                        >
                            Forms
                        </button>
                        <button
                            onClick={() => setActiveTab('statuses')}
                            className={`homebrew-modal__tab ${activeTab === 'statuses' ? 'homebrew-modal__tab--active' : ''}`}
                        >
                            Statuses
                        </button>
                        <button
                            onClick={() => setActiveTab('fieldEffects')}
                            className={`homebrew-modal__tab ${activeTab === 'fieldEffects' ? 'homebrew-modal__tab--active' : ''}`}
                        >
                            Weather & Field
                        </button>
                    </div>
                </div>

                <div className="homebrew-modal__body">
                    {activeTab === 'types' && <HomebrewTypes />}
                    {activeTab === 'abilities' && <HomebrewAbilities />}
                    {activeTab === 'moves' && <HomebrewMoves />}
                    {activeTab === 'pokemon' && <HomebrewPokemon />}
                    {activeTab === 'items' && <HomebrewItems />}
                    {activeTab === 'forms' && <HomebrewForms />}
                    {activeTab === 'statuses' && <HomebrewStatuses />}
                    {activeTab === 'fieldEffects' && <HomebrewFieldEffects />}
                </div>

                <div
                    className="homebrew-modal__footer"
                    style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}
                >
                    {importError && (
                        <div role="alert" className="homebrew-modal__import-error">
                            <span className="homebrew-modal__import-error-text">
                                <AlertTriangle size={14} /> {importError}
                            </span>
                            <button
                                type="button"
                                onClick={() => setImportError(null)}
                                aria-label="Dismiss import error"
                                className="homebrew-modal__import-error-dismiss"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    <HomebrewStorageTracker />

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px'
                        }}
                    >
                        <span
                            className="text-subtext"
                            style={{
                                color: needsBackup ? 'var(--semantic-danger)' : 'var(--text-muted)',
                                fontWeight: needsBackup ? 'bold' : 'normal',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.8rem'
                            }}
                        >
                            {needsBackup ? (
                                <>
                                    <AlertTriangle size={14} /> Unexported changes! Please backup your work.
                                </>
                            ) : (
                                'Changes save automatically to your browser.'
                            )}
                        </span>

                        <div className="homebrew-modal__footer-actions" style={{ flexShrink: 0 }}>
                            {canEdit && (
                                <button
                                    onClick={handleBroadcastSync}
                                    className="action-button action-button--secondary homebrew-modal__footer-btn"
                                >
                                    <Radio size={16} /> {role === 'GM' ? 'Sync to Players' : 'Share with Table'}
                                </button>
                            )}
                            <button
                                onClick={handleExportAll}
                                className={`action-button ${needsBackup ? 'action-button--red' : 'action-button--dark'} homebrew-modal__footer-btn`}
                            >
                                <Save size={16} /> Backup All{needsBackup ? '*' : ''}
                            </button>
                            {canEdit && (
                                <>
                                    <button
                                        onClick={() => fileRef.current?.click()}
                                        className="action-button action-button--dark homebrew-modal__footer-btn"
                                        title="Import or Restore Homebrew from JSON backup"
                                    >
                                        <FolderOpen size={16} /> Restore / Import All
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileRef}
                                        onChange={handleImportAll}
                                        className="homebrew-file-input"
                                        accept=".json"
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {importAllData && (
                <HomebrewImportConfirmModal
                    data={importAllData}
                    onCancel={() => setImportAllData(null)}
                    onMerge={(data) => {
                        mergeAllHomebrewData(
                            data.types,
                            data.abs,
                            data.moves,
                            data.mons,
                            data.items,
                            data.forms,
                            data.statuses,
                            false,
                            data.fieldEffects
                        );
                        setImportAllData(null);
                    }}
                    onOverwrite={(data) => {
                        overwriteAllHomebrewData(
                            data.types,
                            data.abs,
                            data.moves,
                            data.mons,
                            data.items,
                            data.forms,
                            data.statuses,
                            data.fieldEffects
                        );
                        setImportAllData(null);
                    }}
                />
            )}
        </div>
    );
}
