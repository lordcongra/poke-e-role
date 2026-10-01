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
    trainers: Record<string, TrainerRoster>;
    boxes: PcBox[];
    lastSynced?: number;
}

export interface PcStorageData {
    activeCampaignId: string;
    campaigns: Record<string, CampaignProfile>;
    pokemonSummaries: Record<string, PcPokemonSummary>;
    version: number;
}

export interface SheetFieldDiff {
    id: string;
    category: 'stats' | 'moves' | 'items' | 'passives' | 'identity';
    label: string;
    gmValue: string | number | boolean;
    playerValue: string | number | boolean;
    accepted: boolean;
}

export interface SheetReviewPayload {
    entityId: string;
    pokemonName: string;
    playerName: string;
    diffs: SheetFieldDiff[];
}

export interface PcSlice {
    pcData: PcStorageData;
    activeBoxIndex: number;
    selectedPcSlot: { type: 'party' | 'box'; index: number } | null;
    isPcModalOpen: boolean;
    pendingReview: SheetReviewPayload | null;
    isReviewModalOpen: boolean;

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
    movePokemonToParty: (entityId: string) => boolean;
    depositPokemonToBox: (entityId: string, boxIndex?: number) => boolean;
    addBox: (name?: string) => void;
    deleteBox: (boxIndex: number) => void;
    renameBox: (boxIndex: number, name: string) => void;
    setBoxTheme: (boxIndex: number, color: string, wallpaper?: string) => void;
    switchTrainer: (trainerId: string) => void;
    addTrainer: (name: string) => void;
    switchCampaign: (campaignId: string) => void;
    addCampaign: (name: string) => void;
    updatePokemonSummary: (summary: PcPokemonSummary) => void;
    updateTrainerProfile: (trainerId: string, updates: Partial<TrainerRoster>) => void;
    deletePokemonFromPc: (entityId: string) => void;
    openReviewModal: (payload: SheetReviewPayload) => void;
    closeReviewModal: () => void;
    applyReviewDiffs: (entityId: string, diffs: SheetFieldDiff[]) => void;
}
