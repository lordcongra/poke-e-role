import React from 'react';
import { PcPartyDock } from './PcPartyDock';
import { PcBoxGrid } from './PcBoxGrid';
import type { PcPokemonSummary, PcBox } from '../../../types/pcStorageTypes';

export interface PcStorageLayoutProps {
    desktopPartyLayout: 'vertical' | 'horizontal';
    onTogglePartyLayout: () => void;
    partySlots: (string | null)[];
    pokemonSummaries: Record<string, PcPokemonSummary>;
    selectedPcSlot: { type: 'party' | 'box'; index: number } | null;
    trainerName?: string;
    trainerSummary: PcPokemonSummary | null;
    isPmdMode: boolean;
    activeStorageName?: string;
    trainerAvatarUrl?: string;
    activeCharacterName: string;
    activeCharacterAvatarUrl?: string;
    canLinkActiveTrainer: boolean;
    otherLinkedTrainerName?: string;
    onSelectSlot: (target: { type: 'party' | 'box'; index: number }) => void;
    onEmptySlotClick: (target: { type: 'party' | 'box'; index: number }) => void;
    onContextMenu: (e: React.MouseEvent, isParty: boolean, index: number, id: string) => void;
    onOpenSheet: (entityId: string) => void;
    onRelease: (entityId: string) => void;
    onSendOut: (entityId: string) => void;
    onRecall: (entityId: string) => void;
    onPartyDrop: (e: React.DragEvent, index: number) => void;
    onPartyDragStart: (e: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
    onLinkActiveTrainer: () => void;
    isTrainerLinked: boolean;
    isTrainerOnMap: boolean;
    onUnlinkTrainer: () => void;
    onOpenTrainerSheet?: () => void;
    onDropTrainerToken?: () => void;
    onOrganizeFolders?: () => void;
    currentBox: PcBox;
    onOpenDepositDrawer: () => void;
    onMoveToParty: (entityId: string) => void;
    onBoxDrop: (e: React.DragEvent, index: number) => void;
    onBoxDragStart: (e: React.DragEvent, index: number) => void;
}

export const PcStorageLayout: React.FC<PcStorageLayoutProps> = ({
    desktopPartyLayout,
    onTogglePartyLayout,
    partySlots,
    pokemonSummaries,
    selectedPcSlot,
    trainerName,
    trainerSummary,
    isPmdMode,
    activeStorageName,
    trainerAvatarUrl,
    activeCharacterName,
    activeCharacterAvatarUrl,
    canLinkActiveTrainer,
    otherLinkedTrainerName,
    onSelectSlot,
    onEmptySlotClick,
    onContextMenu,
    onOpenSheet,
    onRelease,
    onSendOut,
    onRecall,
    onPartyDrop,
    onPartyDragStart,
    onDragEnd,
    onLinkActiveTrainer,
    isTrainerLinked,
    isTrainerOnMap,
    onUnlinkTrainer,
    onOpenTrainerSheet,
    onDropTrainerToken,
    onOrganizeFolders,
    currentBox,
    onOpenDepositDrawer,
    onMoveToParty,
    onBoxDrop,
    onBoxDragStart
}) => {
    return (
        <div
            className={`pc-modal__layout ${desktopPartyLayout === 'horizontal' ? 'pc-modal__layout--horizontal' : 'pc-modal__layout--vertical'}`}
        >
            <PcPartyDock
                partySlots={partySlots}
                pokemonSummaries={pokemonSummaries}
                selectedSlot={selectedPcSlot}
                trainerName={trainerName}
                trainerSummary={trainerSummary}
                isPmdMode={isPmdMode}
                activeStorageName={activeStorageName}
                trainerAvatarUrl={trainerAvatarUrl}
                activeCharacterName={activeCharacterName}
                activeCharacterAvatarUrl={activeCharacterAvatarUrl}
                canLinkActiveTrainer={canLinkActiveTrainer}
                otherLinkedTrainerName={otherLinkedTrainerName}
                partyLayout={desktopPartyLayout}
                onTogglePartyLayout={onTogglePartyLayout}
                onSelectSlot={(index) => onSelectSlot({ type: 'party', index })}
                onEmptySlotClick={(index) => onEmptySlotClick({ type: 'party', index })}
                onContextMenu={(e, index, id) => onContextMenu(e, true, index, id)}
                onOpenSheet={onOpenSheet}
                onRelease={onRelease}
                onSendOut={onSendOut}
                onRecall={onRecall}
                onDropOnSlot={onPartyDrop}
                onDragStart={onPartyDragStart}
                onDragEnd={onDragEnd}
                onLinkActiveTrainer={onLinkActiveTrainer}
                isTrainerLinked={isTrainerLinked}
                isTrainerOnMap={isTrainerOnMap}
                onUnlinkTrainer={onUnlinkTrainer}
                onOpenTrainerSheet={onOpenTrainerSheet}
                onDropTrainerToken={onDropTrainerToken}
                onOrganizeFolders={onOrganizeFolders}
            />

            <PcBoxGrid
                box={currentBox}
                pokemonSummaries={pokemonSummaries}
                selectedSlot={selectedPcSlot}
                onSelectSlot={(index) => onSelectSlot({ type: 'box', index })}
                onEmptySlotClick={(index) => onEmptySlotClick({ type: 'box', index })}
                onOpenDepositDrawer={onOpenDepositDrawer}
                onContextMenu={(e, index, id) => onContextMenu(e, false, index, id)}
                onOpenSheet={onOpenSheet}
                onMoveToParty={onMoveToParty}
                onSendOut={onSendOut}
                onRecall={onRecall}
                onDropOnSlot={onBoxDrop}
                onDragStart={onBoxDragStart}
                onDragEnd={onDragEnd}
            />
        </div>
    );
};
