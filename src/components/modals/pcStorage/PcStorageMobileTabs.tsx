import React from 'react';
import { Box, Users } from 'lucide-react';

interface PcStorageMobileTabsProps {
    activeTab: 'party' | 'box';
    onSelectTab: (tab: 'party' | 'box') => void;
    boxName: string;
    partyCount: number;
    isPmdMode: boolean;
}

export const PcStorageMobileTabs: React.FC<PcStorageMobileTabsProps> = ({
    activeTab,
    onSelectTab,
    boxName,
    partyCount,
    isPmdMode
}) => {
    return (
        <div className="pc-modal__mobile-tabs" role="tablist" aria-label="PC Storage View Selection">
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'party'}
                className={`pc-modal__mobile-tab ${activeTab === 'party' ? 'pc-modal__mobile-tab--active' : ''}`}
                onClick={() => onSelectTab('party')}
            >
                <Users size={14} />
                <span>
                    {isPmdMode ? 'Team' : 'Party'} ({partyCount}/6)
                </span>
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'box'}
                className={`pc-modal__mobile-tab ${activeTab === 'box' ? 'pc-modal__mobile-tab--active' : ''}`}
                onClick={() => onSelectTab('box')}
            >
                <Box size={14} />
                <span>Box: {boxName}</span>
            </button>
        </div>
    );
};
