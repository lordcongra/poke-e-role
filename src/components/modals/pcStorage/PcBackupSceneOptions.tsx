import React from 'react';
import type { TrainerRoster } from '../../../types/pcStorageTypes';
import { Shield, ShieldCheck } from 'lucide-react';

interface PcBackupSceneOptionsProps {
    targetMode: 'activeScene' | 'cloud';
    sceneName: string;
    setSceneName: (name: string) => void;
    includeTrainer: boolean;
    setIncludeTrainer: (inc: boolean) => void;
    includeParty: boolean;
    setIncludeParty: (inc: boolean) => void;
    backupAllBoxes: boolean;
    setBackupAllBoxes: (all: boolean) => void;
    trainer?: TrainerRoster;
    partyCount: number;
    storedCount: number;
    allBoxesCount: number;
    isCurrentSceneBackup: boolean;
    onToggleSceneBackup: () => void;
}

export const PcBackupSceneOptions: React.FC<PcBackupSceneOptionsProps> = ({
    targetMode,
    sceneName,
    setSceneName,
    includeTrainer,
    setIncludeTrainer,
    includeParty,
    setIncludeParty,
    backupAllBoxes,
    setBackupAllBoxes,
    trainer,
    partyCount,
    storedCount,
    allBoxesCount,
    isCurrentSceneBackup,
    onToggleSceneBackup
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {targetMode === 'activeScene' && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        background: 'rgba(0, 0, 0, 0.25)',
                        borderRadius: '6px',
                        gap: '8px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isCurrentSceneBackup ? (
                            <ShieldCheck size={16} color="var(--semantic-success, #4caf50)" />
                        ) : (
                            <Shield size={16} color="var(--text-muted, #888)" />
                        )}
                        <span className="text-subtext" style={{ fontSize: '0.78rem' }}>
                            Current Scene:{' '}
                            {isCurrentSceneBackup ? (
                                <strong style={{ color: 'var(--semantic-success, #4caf50)' }}>
                                    Protected Backup Scene (Cleanup disabled)
                                </strong>
                            ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Normal Map</span>
                            )}
                        </span>
                    </div>
                    <button
                        type="button"
                        className={`action-button ${isCurrentSceneBackup ? 'action-button--dark' : 'action-button--theme'}`}
                        style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                        onClick={onToggleSceneBackup}
                    >
                        {isCurrentSceneBackup ? 'Unmark Backup' : 'Mark as Backup Scene'}
                    </button>
                </div>
            )}

            {targetMode === 'cloud' && (
                <div className="pc-cloud-modal__field">
                    <label className="text-label">Scene Asset Name</label>
                    <input
                        type="text"
                        className="pc-cloud-modal__input text-label"
                        value={sceneName}
                        onChange={(e) => setSceneName(e.target.value)}
                        placeholder="e.g. PKR [Kanto] - All PC Boxes"
                    />
                    <span className="text-subtext">
                        Prefixed with <code>PKR</code> so it is auto-discovered by the Cloud Import picker.
                    </span>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {trainer && (
                    <label
                        className="text-subtext"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            background: 'rgba(0, 0, 0, 0.25)',
                            borderRadius: '6px'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={includeTrainer}
                            onChange={(e) => setIncludeTrainer(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                        />
                        <span>
                            Include Trainer <strong>{trainer.name}</strong> at the head of the backup grid
                        </span>
                    </label>
                )}

                {partyCount > 0 && (
                    <label
                        className="text-subtext"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            background: 'rgba(0, 0, 0, 0.25)',
                            borderRadius: '6px'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={includeParty}
                            onChange={(e) => setIncludeParty(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                        />
                        <span>
                            Also include active Trainer Belt (<strong>{partyCount} Pokémon</strong>) in backup
                        </span>
                    </label>
                )}

                {allBoxesCount > 1 && (
                    <label
                        className="text-subtext"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            background: 'rgba(0, 0, 0, 0.25)',
                            borderRadius: '6px'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={backupAllBoxes}
                            onChange={(e) => setBackupAllBoxes(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                        />
                        <span>
                            Backup <strong>All {allBoxesCount} PC Boxes</strong>
                            {trainer ? ` for ${trainer.name}` : ''} ({storedCount} stored Pokémon)
                        </span>
                    </label>
                )}
            </div>
        </div>
    );
};
