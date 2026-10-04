import React from 'react';
import { Sparkles, Layers, Upload } from 'lucide-react';

interface PcImportCloudSectionProps {
    currentBoxName?: string;
    isProcessing: boolean;
    onImportCloud: () => Promise<void>;
    onScanOpenScene: () => Promise<void>;
}

export const PcImportCloudSection: React.FC<PcImportCloudSectionProps> = ({
    currentBoxName = 'Current Box',
    isProcessing,
    onImportCloud,
    onScanOpenScene
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="pc-import-card">
                <div className="pc-import-card__header">
                    <Sparkles size={16} />
                    <span>Option A: Import from Owlbear Cloud Scene Asset</span>
                </div>
                <p className="pc-import-card__desc">
                    Pulls Pokémon from a previously exported Owlbear Rodeo Scene Asset file (.json) saved to your
                    Owlbear asset library and loads them into &quot;{currentBoxName}&quot;.
                </p>
                <button
                    type="button"
                    className="action-button action-button--theme"
                    onClick={onImportCloud}
                    disabled={isProcessing}
                >
                    <Upload size={14} /> Select Cloud Scene Asset...
                </button>
            </div>

            <div className="pc-import-card">
                <div className="pc-import-card__header">
                    <Layers size={16} />
                    <span>Option B: Scan Open Backup Scene</span>
                </div>
                <p className="pc-import-card__desc">
                    Navigate to your dedicated Owlbear Rodeo backup scene where your Pokémon tokens are placed. Once in
                    the scene, click below to scan and sync all tokens into your PC storage.
                </p>
                <button
                    type="button"
                    className="action-button action-button--dark"
                    onClick={onScanOpenScene}
                    disabled={isProcessing}
                >
                    <Layers size={14} /> Scan & Sync Open Scene Tokens
                </button>
            </div>
        </div>
    );
};
