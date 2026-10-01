import React from 'react';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';

interface PcBackupItemPreviewProps {
    trainerName?: string;
    includeTrainer?: boolean;
    items: PcPokemonSummary[];
}

export const PcBackupItemPreview: React.FC<PcBackupItemPreviewProps> = ({ trainerName, includeTrainer, items }) => {
    const totalCount = items.length + (trainerName && includeTrainer ? 1 : 0);

    return (
        <div className="pc-cloud-modal__preview">
            <span className="text-label">Included in Backup ({totalCount} items):</span>
            <div className="pc-cloud-modal__tag-list" style={{ maxHeight: '110px', overflowY: 'auto' }}>
                {trainerName && includeTrainer && (
                    <span
                        className="pc-cloud-modal__pkmn-tag text-subtext"
                        style={{
                            borderColor: 'var(--primary, #3b82f6)',
                            color: 'var(--primary, #3b82f6)'
                        }}
                    >
                        ★ Trainer: {trainerName}
                    </span>
                )}
                {items.map((p) => (
                    <span key={p.entityId} className="pc-cloud-modal__pkmn-tag text-subtext">
                        {p.name || p.species} ({p.species})
                    </span>
                ))}
            </div>
        </div>
    );
};
