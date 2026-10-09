import React, { useState } from 'react';
import { Box, Users } from 'lucide-react';

interface PcStorageMobileTabsProps {
    activeTab: 'party' | 'box';
    onSelectTab: (tab: 'party' | 'box') => void;
    boxName: string;
    partyCount: number;
    isPmdMode: boolean;
    onTabDrop?: (e: React.DragEvent, tab: 'party' | 'box') => void;
}

export const PcStorageMobileTabs: React.FC<PcStorageMobileTabsProps> = ({
    activeTab,
    onSelectTab,
    boxName,
    partyCount,
    isPmdMode,
    onTabDrop
}) => {
    const [dragOverTab, setDragOverTab] = useState<'party' | 'box' | null>(null);

    const handleDragOver = (e: React.DragEvent, tab: 'party' | 'box') => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverTab !== tab) {
            setDragOverTab(tab);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverTab(null);
        }
    };

    const handleDrop = (e: React.DragEvent, tab: 'party' | 'box') => {
        e.preventDefault();
        setDragOverTab(null);
        onTabDrop?.(e, tab);
    };

    return (
        <div className="pc-modal__mobile-tabs" role="tablist" aria-label="PC Storage View Selection">
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'party'}
                className={`pc-modal__mobile-tab ${activeTab === 'party' ? 'pc-modal__mobile-tab--active' : ''} ${dragOverTab === 'party' ? 'pc-modal__mobile-tab--drag-over' : ''}`}
                onClick={() => onSelectTab('party')}
                onDragOver={(e) => handleDragOver(e, 'party')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'party')}
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
                className={`pc-modal__mobile-tab ${activeTab === 'box' ? 'pc-modal__mobile-tab--active' : ''} ${dragOverTab === 'box' ? 'pc-modal__mobile-tab--drag-over' : ''}`}
                onClick={() => onSelectTab('box')}
                onDragOver={(e) => handleDragOver(e, 'box')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'box')}
            >
                <Box size={14} />
                <span>Box: {boxName}</span>
            </button>
        </div>
    );
};
