import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { HomebrewTypes } from './HomebrewTypes';
import { HomebrewAbilities } from './HomebrewAbilities';
import { HomebrewMoves } from './HomebrewMoves';
import { HomebrewPokemon } from './HomebrewPokemon';
import { HomebrewItems } from './HomebrewItems';
import { HomebrewForms } from './HomebrewForms';
import { HomebrewStatuses } from './HomebrewStatuses';
import type {
    CustomType,
    CustomAbility,
    CustomMove,
    CustomPokemon,
    CustomItem,
    CustomForm,
    CustomStatus
} from '../../store/storeTypes';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { downloadJson } from '../../utils/fileSystemHelpers';
import { Hammer, X, HardDrive, AlertTriangle, Radio, Save, FolderOpen } from 'lucide-react';
import './Homebrew.css';

// --- STORAGE TRACKER HELPER ---
const getStorageUsage = () => {
    let key = 'pkr_homebrew_offline';
    try {
        if (OBR.isAvailable && OBR.room && OBR.room.id) {
            key = `pkr_homebrew_${OBR.room.id}`;
        }
        const data = localStorage.getItem(key);
        if (!data) return { mb: 0, percent: 0 };

        // JavaScript strings are UTF-16, so 2 bytes per character
        const bytes = data.length * 2;
        const megabytes = bytes / (1024 * 1024);
        const percent = Math.min(100, Math.max(0, (megabytes / 5) * 100)); // Browsers cap at ~5MB

        return { mb: Number(megabytes.toFixed(2)), percent };
    } catch (e) {
        console.warn('[HomebrewModal] Failed to calculate storage usage:', e);
        return { mb: 0, percent: 0 };
    }
};
// -----------------------------

export function HomebrewModal({ onClose }: { onClose: () => void }) {
    const role = useCharacterStore((state) => state.role);
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = isStandaloneMode || role === 'GM' || access === 'Full';

    const [activeTab, setActiveTab] = useState<
        'types' | 'abilities' | 'moves' | 'pokemon' | 'items' | 'forms' | 'statuses'
    >('types');
    const overwriteAllHomebrewData = useCharacterStore((state) => state.overwriteAllHomebrewData);
    const mergeAllHomebrewData = useCharacterStore((state) => state.mergeAllHomebrewData);

    const needsBackup = useCharacterStore((state) => state.needsBackup);
    const markHomebrewBackedUp = useCharacterStore((state) => state.markHomebrewBackedUp);

    const fileRef = useRef<HTMLInputElement>(null);
    const [importAllData, setImportAllData] = useState<{
        types: CustomType[];
        abs: CustomAbility[];
        moves: CustomMove[];
        mons: CustomPokemon[];
        items: CustomItem[];
        forms: CustomForm[];
        statuses: CustomStatus[];
    } | null>(null);

    // Dynamic Storage State
    const storageUsage = getStorageUsage();

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
            customStatuses: state.roomCustomStatuses
        };
        downloadJson(exportData, 'pokerole_homebrew_backup.json');

        markHomebrewBackedUp();
    };

    const handleImportAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target?.result as string);
                if (
                    imported &&
                    typeof imported === 'object' &&
                    (imported.customTypes ||
                        imported.customAbilities ||
                        imported.customMoves ||
                        imported.customPokemon ||
                        imported.customItems ||
                        imported.customForms ||
                        imported.customStatuses)
                ) {
                    setImportAllData({
                        types: imported.customTypes || [],
                        abs: imported.customAbilities || [],
                        moves: imported.customMoves || [],
                        mons: imported.customPokemon || [],
                        items: imported.customItems || [],
                        forms: imported.customForms || [],
                        statuses: imported.customStatuses || []
                    });
                } else {
                    if (OBR.isAvailable) OBR.notification.show('Invalid Homebrew Backup file.', 'ERROR');
                }
            } catch (err) {
                console.error('[HomebrewModal] Failed to parse homebrew backup JSON:', err);
                if (OBR.isAvailable) OBR.notification.show('Failed to parse JSON.', 'ERROR');
            }
            if (fileRef.current) fileRef.current.value = '';
        };
        reader.readAsText(file);
    };

    // Determine Storage Bar Color using our semantic variables
    let progressColor = 'var(--primary)';
    if (storageUsage.percent > 90) progressColor = 'var(--semantic-danger)';
    else if (storageUsage.percent > 70) progressColor = 'var(--secondary)';

    return (
        <div className="homebrew-modal__overlay">
            <div className="homebrew-modal__content">
                <div className="homebrew-modal__header">
                    <div className="homebrew-modal__title-row">
                        <h3
                            className="homebrew-modal__title text-theme-header"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Hammer size={20} /> Homebrew Workshop
                        </h3>
                        <button onClick={onClose} className="homebrew-modal__close-btn text-theme-header">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="homebrew-modal__tabs" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
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
                </div>

                <div
                    className="homebrew-modal__footer"
                    style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-end',
                            gap: '10px'
                        }}
                    >
                        {/* --- NEW STORAGE TRACKER --- */}
                        <div
                            className="homebrew-modal__storage-tracker"
                            title="Web browsers limit local domain storage to ~5MB. If you exceed this, you must export your data to clear space!"
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                flex: 1
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '0.8rem',
                                    color: 'var(--text-muted)'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <HardDrive size={14} /> Storage Limit
                                </span>
                                <span>{storageUsage.mb}MB / 5.0MB</span>
                            </div>
                            <div
                                style={{
                                    width: '100%',
                                    height: '8px',
                                    backgroundColor: 'var(--border)',
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}
                            >
                                <div
                                    style={{
                                        height: '100%',
                                        width: `${storageUsage.percent}%`,
                                        backgroundColor: progressColor,
                                        transition: 'width 0.3s ease, background-color 0.3s ease'
                                    }}
                                />
                            </div>
                        </div>
                        {/* --------------------------- */}

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

                    <span
                        className="text-subtext"
                        style={{
                            color: needsBackup ? 'var(--semantic-danger)' : 'var(--text-muted)',
                            fontWeight: needsBackup ? 'bold' : 'normal',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            textAlign: 'center'
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
                </div>
            </div>

            {importAllData && (
                <div className="homebrew-import__overlay">
                    <div className="homebrew-import__content">
                        <h3
                            className="homebrew-import__title text-title-primary"
                            style={{
                                color: 'var(--semantic-danger)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <AlertTriangle size={20} /> Confirm Restore
                        </h3>
                        <p className="homebrew-import__text text-subtext">
                            How would you like to import this data? <b>Overwrite</b> will delete all existing Workshop
                            items. <b>Add / Merge</b> will safely combine them, updating any items with matching names.
                        </p>
                        <div className="homebrew-import__actions">
                            <button
                                onClick={() => setImportAllData(null)}
                                className="action-button action-button--dark homebrew-import__btn"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    mergeAllHomebrewData(
                                        importAllData.types,
                                        importAllData.abs,
                                        importAllData.moves,
                                        importAllData.mons,
                                        importAllData.items,
                                        importAllData.forms,
                                        importAllData.statuses
                                    );
                                    setImportAllData(null);
                                }}
                                className="action-button action-button--secondary homebrew-import__btn"
                            >
                                Add / Merge
                            </button>
                            <button
                                onClick={() => {
                                    overwriteAllHomebrewData(
                                        importAllData.types,
                                        importAllData.abs,
                                        importAllData.moves,
                                        importAllData.mons,
                                        importAllData.items,
                                        importAllData.forms,
                                        importAllData.statuses
                                    );
                                    setImportAllData(null);
                                }}
                                className="action-button action-button--red homebrew-import__btn"
                            >
                                Overwrite
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
