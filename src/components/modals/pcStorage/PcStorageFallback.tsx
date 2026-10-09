import React from 'react';

interface PcStorageFallbackProps {
    onClose: () => void;
    onCreateCampaign: () => void;
}

export const PcStorageFallback: React.FC<PcStorageFallbackProps> = ({ onClose, onCreateCampaign }) => {
    return (
        <div className="pc-modal-backdrop" onClick={onClose}>
            <div
                className="pc-modal"
                style={{ maxWidth: 460, margin: 'auto', textAlign: 'center', padding: '32px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-title-primary" style={{ marginBottom: '12px' }}>
                    No Campaign Available
                </h2>
                <p className="text-subtext" style={{ marginBottom: '24px' }}>
                    No active PC storage campaign or box was found. You can create a campaign to start managing your
                    Pokémon and boxes.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button type="button" className="action-button --theme" onClick={onCreateCampaign}>
                        Create / Reset Campaign
                    </button>
                    <button type="button" className="action-button --dark" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
