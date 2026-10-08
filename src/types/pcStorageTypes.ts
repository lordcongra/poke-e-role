import type { Item } from '@owlbear-rodeo/sdk';

export interface AttachmentBundle {
    item: Item;
    relativeOffset: { x: number; y: number };
    relativeRotation: number;
    relativeScale: { x: number; y: number };
}

export interface PcPokemonSummary {
    entityId: string;
    name: string;
    species: string;
    rank: string;
    type1: string;
    type2?: string;
    hp: number;
    maxHp: number;
    will: number;
    maxWill: number;
    tokenImageUrl?: string;
    shiny?: boolean;
    heldItem?: string;
    isOnMap?: boolean;
    mapTokenId?: string;
    attachedItems?: AttachmentBundle[];
    savedTokenItem?: Item;
    fullMetadata?: Record<string, unknown>;
    trainerId?: string;
    campaignId?: string;
    lastModified?: number;
}

export interface TrainerRoster {
    id: string;
    name: string;
    avatarUrl?: string;
    party: (string | null)[]; // 6 slots, each storing entityId or null
    boxes?: PcBox[]; // Private PC boxes for this trainer
    isLinked?: boolean;
    mapTokenId?: string;
    savedTokenItem?: Item;
    fullMetadata?: Record<string, unknown>;
    playerId?: string; // Owlbear Rodeo player ID who owns this trainer
    playerName?: string; // Owlbear Rodeo player name who owns this trainer
    profileType?: 'trainer' | 'storage';
}

export interface PcBox {
    id: string;
    name: string;
    themeColor?: string;
    wallpaper?: string;
    slots: (string | null)[]; // 30 slots (5 rows x 6 columns)
}

export interface CampaignProfile {
    id: string;
    name: string;
    activeTrainerId: string;
    activeTrainerByPlayer?: Record<string, string>; // Maps player ID to their active trainer profile
    trainers: Record<string, TrainerRoster>;
    trainerOrder?: string[]; // Custom display order of trainer IDs
    boxes: PcBox[];
    teamParty?: (string | null)[]; // Active Team party for PMD / no-trainer campaigns
    teamStorageName?: string;
    lastSynced?: number;
    isPrivate?: boolean;
    isRoomActive?: boolean;
}

export interface PcStorageData {
    activeCampaignId: string;
    campaigns: Record<string, CampaignProfile>;
    pokemonSummaries: Record<string, PcPokemonSummary>;
    version: number;
}

export interface PcSlice {
    isInitialized: boolean;
    pcData: PcStorageData;
    activeBoxIndex: number;
    selectedPcSlot: { type: 'party' | 'box'; index: number } | null;
    isPcModalOpen: boolean;

    initPcStorage: () => Promise<void>;
    setActiveBoxIndex: (index: number) => void;
    setSelectedPcSlot: (slot: { type: 'party' | 'box'; index: number } | null) => void;
    openPcModal: () => void;
    closePcModal: () => void;
    setPartySlot: (trainerId: string, slotIndex: number, entityId: string | null) => void;
    setBoxSlot: (boxIndex: number, slotIndex: number, entityId: string | null) => void;
    swapPcSlots: (
        from: { type: 'party' | 'box'; index: number; boxIndex?: number },
        to: { type: 'party' | 'box'; index: number; boxIndex?: number }
    ) => void;
    movePokemonToParty: (entityId: string, trainerId?: string) => boolean;
    depositPokemonToBox: (entityId: string, boxIndex?: number, trainerId?: string) => boolean;
    addBox: (name?: string) => void;
    deleteBox: (boxIndex: number) => void;
    renameBox: (boxIndex: number, name: string) => void;
    setBoxTheme: (boxIndex: number, color: string, wallpaper?: string) => void;
    switchTrainer: (trainerId: string) => void;
    addTrainer: (
        name: string,
        options?: {
            existingCharacterId?: string;
            isLinked?: boolean;
            profileType?: 'trainer' | 'storage';
            playerId?: string;
            playerName?: string;
        }
    ) => void;
    deleteTrainer: (trainerId: string, options?: { deletePc?: boolean; deleteBelt?: boolean }) => boolean;
    renameTrainer: (trainerId: string, newName: string) => void;
    reorderTrainers: (campaignId: string, trainerOrder: string[]) => void;
    switchCampaign: (campaignId: string) => void;
    addCampaign: (name: string, options?: { isPrivate?: boolean; isRoomActive?: boolean }) => void;
    editCampaign: (campaignId: string, updates: { name?: string; isPrivate?: boolean; isRoomActive?: boolean }) => void;
    deleteCampaign: (campaignId: string) => boolean;
    updatePokemonSummary: (summary: PcPokemonSummary) => void;
    updateTrainerProfile: (trainerId: string, updates: Partial<TrainerRoster>) => void;
    deletePokemonFromPc: (entityId: string, options?: { wasUnlinked?: boolean; pokemonName?: string }) => void;
}

export type PcImportDuplicateMode = 'duplicate-fresh' | 'transfer-ownership' | 'update-existing';
