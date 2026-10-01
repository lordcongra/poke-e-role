import React, { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { PcBox, CampaignProfile, PcPokemonSummary, TrainerRoster } from '../../../types/pcStorageTypes';
import { CloudUpload, X, RefreshCw, Download } from 'lucide-react';
import { downloadPcBackupJson } from '../../../utils/pc/pcJsonBackupOps';
import { isBackupScene, setSceneBackupStatus } from '../../../utils/pc/pcBackupSceneSync';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { PcBackupTargetSelector, type PcBackupTargetMode } from './PcBackupTargetSelector';
import { PcJsonExportOptions } from './PcJsonExportOptions';
import { PcBackupSceneOptions } from './PcBackupSceneOptions';
import { PcBackupItemPreview } from './PcBackupItemPreview';
import './PcCloudExportModal.css';

interface PcCloudExportModalProps {
    box: PcBox;
    campaign: CampaignProfile;
    pokemonSummaries: Record<string, PcPokemonSummary>;
    partySlots?: (string | null)[];
    trainer?: TrainerRoster;
    allBoxes?: PcBox[];
    boxTheme?: string;
    onConfirm: (
        customSceneName: string,
        includeParty: boolean,
        includeTrainer: boolean,
        targetMode: 'activeScene' | 'cloud',
        backupAllBoxes: boolean
    ) => void;
    onClose: () => void;
}

export const PcCloudExportModal: React.FC<PcCloudExportModalProps> = ({
    box,
    campaign,
    pokemonSummaries,
    partySlots = [],
    trainer,
    allBoxes = [],
    boxTheme,
    onConfirm,
    onClose
}) => {
    const pcData = useCharacterStore((s) => s.pcData);
    const isObr = OBR.isAvailable;

    const defaultName = `PKR [${campaign.name}]${trainer ? ' - ' + trainer.name : ''} - ${allBoxes.length > 1 ? 'All PC Boxes' : box.name}`;
    const [sceneName, setSceneName] = useState(defaultName);
    const [targetMode, setTargetMode] = useState<PcBackupTargetMode>(isObr ? 'cloud' : 'json');
    const [includeParty, setIncludeParty] = useState(true);
    const [includeTrainer, setIncludeTrainer] = useState(true);
    const [backupAllBoxes, setBackupAllBoxes] = useState(true);
    const [isCurrentSceneBackup, setIsCurrentSceneBackup] = useState<boolean>(false);

    // JSON Granular Selection States
    const [jsonScope, setJsonScope] = useState<'all' | 'custom'>('all');
    const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([campaign.id]);
    const [selectedTrainerIds, setSelectedTrainerIds] = useState<string[]>(Object.keys(campaign.trainers || {}));
    const [selectedBoxIndices, setSelectedBoxIndices] = useState<number[]>((campaign.boxes || []).map((_, i) => i));

    useEffect(() => {
        if (isObr) {
            isBackupScene()
                .then(setIsCurrentSceneBackup)
                .catch(() => {});
        }
    }, [isObr]);

    // Scene Token Resolution
    const boxesToScan = backupAllBoxes && allBoxes && allBoxes.length > 0 ? allBoxes : [box];
    const storedEntityIds = new Set<string>();
    for (const b of boxesToScan) {
        for (const s of b.slots || []) {
            if (s) storedEntityIds.add(s);
        }
    }
    const storedPokemon = Array.from(storedEntityIds)
        .map((id) => pokemonSummaries[id])
        .filter(Boolean);

    const partyPokemon = partySlots
        .filter((id): id is string => Boolean(id))
        .map((id) => pokemonSummaries[id])
        .filter(Boolean);

    const scenePokemon = includeParty ? Array.from(new Set([...storedPokemon, ...partyPokemon])) : storedPokemon;

    // Granular JSON Item Resolution
    const getJsonItems = (): PcPokemonSummary[] => {
        if (jsonScope === 'all') {
            return Object.values(pcData.pokemonSummaries);
        }
        const ids = new Set<string>();
        for (const cId of selectedCampaignIds) {
            const camp = pcData.campaigns[cId];
            if (!camp) continue;
            for (const [tId, tr] of Object.entries(camp.trainers)) {
                if (selectedTrainerIds.includes(tId)) {
                    for (const s of tr.party || []) {
                        if (s) ids.add(s);
                    }
                    if (Array.isArray(tr.boxes)) {
                        tr.boxes.forEach((b, idx) => {
                            if (selectedBoxIndices.includes(idx)) {
                                for (const s of b.slots || []) {
                                    if (s) ids.add(s);
                                }
                            }
                        });
                    }
                }
            }
            camp.boxes.forEach((b, idx) => {
                if (selectedBoxIndices.includes(idx)) {
                    for (const s of b.slots || []) {
                        if (s) ids.add(s);
                    }
                }
            });
        }
        return Array.from(ids)
            .map((id) => pcData.pokemonSummaries[id])
            .filter(Boolean);
    };

    const previewItems = targetMode === 'json' ? getJsonItems() : scenePokemon;

    const handleExecuteExport = () => {
        if (targetMode === 'json') {
            downloadPcBackupJson(pcData, {
                scope: jsonScope,
                campaignIds: selectedCampaignIds,
                trainerIds: jsonScope === 'custom' ? selectedTrainerIds : undefined,
                boxIndices: jsonScope === 'custom' ? selectedBoxIndices : undefined
            });
            if (isObr) {
                OBR.notification.show('Downloaded PC backup JSON to your computer!', 'SUCCESS');
            }
            onClose();
        } else {
            onConfirm(sceneName.trim() || defaultName, includeParty, includeTrainer, targetMode, backupAllBoxes);
        }
    };

    const themeStyles = boxTheme
        ? ({
              '--box-theme': boxTheme,
              '--primary': boxTheme,
              '--panel-bg': `color-mix(in srgb, ${boxTheme} 12%, var(--base-panel-dark, #1e1e1e))`,
              '--panel-alt': `color-mix(in srgb, ${boxTheme} 18%, var(--base-panel-alt-dark, #2a2a2a))`,
              '--border': `color-mix(in srgb, ${boxTheme} 35%, var(--base-border-dark, #383838))`
          } as React.CSSProperties)
        : undefined;

    return (
        <div className="modal-backdrop pc-cloud-modal-backdrop" style={themeStyles} onClick={onClose}>
            <div className="modal-container pc-cloud-modal" style={themeStyles} onClick={(e) => e.stopPropagation()}>
                <header className="modal-header pc-cloud-modal__header">
                    <div className="pc-cloud-modal__title-group">
                        <CloudUpload size={20} className="pc-cloud-modal__icon" />
                        <div>
                            <h3 className="modal-title text-title-primary">
                                {isObr ? 'Backup Pokémon Storage' : 'JSON Backup & Export'}
                            </h3>
                            <p className="text-subtext">
                                {isObr
                                    ? 'Export to an Owlbear Cloud Scene or save an offline JSON backup'
                                    : 'Save or import offline JSON backup files of your PC storage'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="action-button action-button--ghost pc-deposit-modal__close-btn"
                        onClick={onClose}
                        aria-label="Close"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="pc-cloud-modal__body">
                    {/* Destination Mode Selector */}
                    <PcBackupTargetSelector targetMode={targetMode} onSelectMode={setTargetMode} />

                    {/* Mode Specific Controls */}
                    {targetMode === 'json' ? (
                        <PcJsonExportOptions
                            pcData={pcData}
                            activeCampaign={campaign}
                            trainer={trainer}
                            scope={jsonScope}
                            setScope={setJsonScope}
                            selectedCampaignIds={selectedCampaignIds}
                            setSelectedCampaignIds={setSelectedCampaignIds}
                            selectedTrainerIds={selectedTrainerIds}
                            setSelectedTrainerIds={setSelectedTrainerIds}
                            selectedBoxIndices={selectedBoxIndices}
                            setSelectedBoxIndices={setSelectedBoxIndices}
                        />
                    ) : (
                        <PcBackupSceneOptions
                            targetMode={targetMode}
                            sceneName={sceneName}
                            setSceneName={setSceneName}
                            includeTrainer={includeTrainer}
                            setIncludeTrainer={setIncludeTrainer}
                            includeParty={includeParty}
                            setIncludeParty={setIncludeParty}
                            backupAllBoxes={backupAllBoxes}
                            setBackupAllBoxes={setBackupAllBoxes}
                            trainer={trainer}
                            partyCount={partyPokemon.length}
                            storedCount={storedPokemon.length}
                            allBoxesCount={allBoxes.length}
                            isCurrentSceneBackup={isCurrentSceneBackup}
                            onToggleSceneBackup={async () => {
                                const next = !isCurrentSceneBackup;
                                await setSceneBackupStatus(next);
                                setIsCurrentSceneBackup(next);
                                if (isObr) {
                                    OBR.notification.show(
                                        next
                                            ? 'Current scene marked as Backup Scene (cleanup protected).'
                                            : 'Current scene unmarked as Backup Scene.',
                                        'INFO'
                                    );
                                }
                            }}
                        />
                    )}

                    {/* Item Preview */}
                    <PcBackupItemPreview
                        trainerName={trainer?.name}
                        includeTrainer={
                            targetMode === 'json'
                                ? jsonScope === 'all' || selectedTrainerIds.length > 0
                                : includeTrainer
                        }
                        items={previewItems}
                    />
                </div>

                <footer
                    className="modal-footer pc-cloud-modal__footer"
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <button type="button" className="action-button action-button--dark" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="button" className="action-button action-button--theme" onClick={handleExecuteExport}>
                        {targetMode === 'activeScene' ? (
                            <>
                                <RefreshCw size={14} /> Update Open Scene
                            </>
                        ) : targetMode === 'cloud' ? (
                            <>
                                <CloudUpload size={14} /> Save to Owlbear Cloud
                            </>
                        ) : (
                            <>
                                <Download size={14} /> Download JSON Backup
                            </>
                        )}
                    </button>
                </footer>
            </div>
        </div>
    );
};
