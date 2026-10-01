import React from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { CloudUpload, RefreshCw, Download, AlertTriangle } from 'lucide-react';

export type PcBackupTargetMode = 'activeScene' | 'cloud' | 'json';

interface PcBackupTargetSelectorProps {
    targetMode: PcBackupTargetMode;
    onSelectMode: (mode: PcBackupTargetMode) => void;
}

export const PcBackupTargetSelector: React.FC<PcBackupTargetSelectorProps> = ({ targetMode, onSelectMode }) => {
    const isObr = OBR.isAvailable;

    return (
        <div className="pc-cloud-modal__field">
            <label className="text-label">Backup Target</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {isObr && (
                    <>
                        <button
                            type="button"
                            className={`action-button ${targetMode === 'cloud' ? 'action-button--theme' : 'action-button--dark'}`}
                            style={{ flex: '1 1 140px', padding: '8px 10px', fontSize: '0.8rem' }}
                            onClick={() => onSelectMode('cloud')}
                        >
                            <CloudUpload size={14} /> Cloud Scene Asset
                        </button>
                        <button
                            type="button"
                            className={`action-button ${targetMode === 'activeScene' ? 'action-button--theme' : 'action-button--dark'}`}
                            style={{ flex: '1 1 140px', padding: '8px 10px', fontSize: '0.8rem' }}
                            onClick={() => onSelectMode('activeScene')}
                        >
                            <RefreshCw size={14} /> Update Open Scene
                        </button>
                    </>
                )}
                <button
                    type="button"
                    className={`action-button ${targetMode === 'json' ? 'action-button--theme' : 'action-button--dark'}`}
                    style={{ flex: '1 1 140px', padding: '8px 10px', fontSize: '0.8rem' }}
                    onClick={() => onSelectMode('json')}
                >
                    <Download size={14} /> Download JSON File
                </button>
            </div>

            <div
                style={{
                    marginTop: '6px',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.28)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                {targetMode === 'cloud' && (
                    <div className="text-subtext" style={{ lineHeight: '1.45' }}>
                        <strong style={{ color: 'var(--text-main, #fff)' }}>Owlbear Cloud Asset:</strong> Saves a
                        brand-new, dedicated Scene into your Owlbear Rodeo Cloud Asset Library. When opened in Owlbear,
                        this scene serves as a storage warehouse map with all tokens spaced out.
                    </div>
                )}
                {targetMode === 'activeScene' && (
                    <div className="text-subtext" style={{ lineHeight: '1.45' }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '4px',
                                color: '#f59e0b'
                            }}
                        >
                            <AlertTriangle size={14} />
                            <strong>Overwrites / Arranges on Current Map:</strong>
                        </div>
                        Lays out all tokens directly on your open Owlbear Rodeo map in a 300px grid and marks the scene
                        as a storage backup map. <em>Do not use this on active battle maps where you are playing!</em>
                    </div>
                )}
                {targetMode === 'json' && (
                    <div className="text-subtext" style={{ lineHeight: '1.45' }}>
                        <strong style={{ color: 'var(--text-main, #fff)' }}>Offline JSON File:</strong> Downloads a
                        lightweight, portable <code>.json</code> file to your computer. Perfect for safety backups,
                        cross-device transfers, and standalone play.
                    </div>
                )}
            </div>
        </div>
    );
};
