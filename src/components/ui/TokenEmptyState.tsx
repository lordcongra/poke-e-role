import { useCharacterStore } from '../../store/useCharacterStore';
import { canViewHomebrew } from '../../utils/common/helper';
import { getAbsolutePokeballUrl } from '../../utils/generators/trainerTokenSpawner';
import { HardDrive, Wand2, Users, Layers, Hammer, ArrowLeft, MousePointerClick, Palette } from 'lucide-react';
import './TokenEmptyState.css';

interface TokenEmptyStateProps {
    isStandalone?: boolean;
    onOpenPcModal?: () => void;
}

export function TokenEmptyState({ isStandalone = false, onOpenPcModal }: TokenEmptyStateProps) {
    const role = useCharacterStore((state) => state.role);
    const gmOnlyGenerators = useCharacterStore((state) => state.identity.gmOnlyGenerators);
    const homebrewAccess = useCharacterStore((state) => state.identity.homebrewAccess) || 'Full';
    const openPcModal = useCharacterStore((state) => state.openPcModal);

    const isGm = isStandalone || role === 'GM';
    const canUseGenerators = isGm || gmOnlyGenerators === false;
    const showHomebrew = isStandalone || canViewHomebrew(role, homebrewAccess);

    const handleOpenModal = (modalName: string) => {
        window.dispatchEvent(new CustomEvent('pkr-open-modal', { detail: modalName }));
    };

    const handleOpenPc = () => {
        if (onOpenPcModal) {
            onOpenPcModal();
            return;
        }
        openPcModal();
        window.dispatchEvent(new CustomEvent('pkr-open-modal', { detail: 'pc' }));
    };

    return (
        <div className="token-empty-state">
            <div className="token-empty-state__hero">
                <div className="token-empty-state__icon-wrapper">
                    <svg className="token-empty-state__border-ring" viewBox="0 0 80 80" aria-hidden="true">
                        <circle cx="40" cy="40" r="38" className="token-empty-state__ring-circle" />
                    </svg>
                    <img src={getAbsolutePokeballUrl()} alt="Pokéball" className="token-empty-state__pokeball-img" />
                </div>
                <h2 className="token-empty-state__title text-title-primary">
                    {isStandalone ? 'No Character Selected' : 'No Pokémon Selected'}
                </h2>
                <p className="token-empty-state__subtitle text-subtext">
                    {isStandalone ? (
                        <>
                            <ArrowLeft size={16} className="token-empty-state__inline-icon" /> Select or create a
                            character in the left directory sidebar, or launch quick tools below.
                        </>
                    ) : (
                        <>
                            <MousePointerClick size={16} className="token-empty-state__inline-icon" /> Click any Pokémon
                            or Trainer token on the map to open their sheet, or access quick tools below.
                        </>
                    )}
                </p>
                <div className="token-empty-state__hero-actions">
                    <button
                        type="button"
                        className="action-button action-button--dark token-empty-state__theme-btn"
                        onClick={() => handleOpenModal('theme')}
                        title="Customize the default theme color for this overview"
                    >
                        <Palette size={14} /> Customize Theme
                    </button>
                </div>
            </div>

            <div className="token-empty-state__cards-grid">
                {/* 1. PC Storage Card */}
                <div className="token-empty-state__card token-empty-state__card--pc" onClick={handleOpenPc}>
                    <div className="token-empty-state__card-icon token-empty-state__card-icon--pc">
                        <HardDrive size={22} />
                    </div>
                    <div className="token-empty-state__card-content">
                        <div className="token-empty-state__card-header">
                            <h3 className="token-empty-state__card-title text-title-primary">Pokémon PC Storage</h3>
                        </div>
                        <p className="token-empty-state__card-desc text-subtext">
                            {isStandalone
                                ? 'Visually organize your Pokémon into storage boxes, manage active party rosters, and quickly switch between character sheets.'
                                : 'Manage stored Pokémon boxes, withdraw active party members, and backup to OBR cloud scene storage.'}
                        </p>
                        <button
                            type="button"
                            className="action-button action-button--theme token-empty-state__card-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPc();
                            }}
                        >
                            <HardDrive size={14} /> Open PC Storage
                        </button>
                    </div>
                </div>

                {/* 2. Pokémon Generator Card */}
                {canUseGenerators && (
                    <div className="token-empty-state__card" onClick={() => handleOpenModal('generator')}>
                        <div className="token-empty-state__card-icon token-empty-state__card-icon--gen">
                            <Wand2 size={22} />
                        </div>
                        <div className="token-empty-state__card-content">
                            <div className="token-empty-state__card-header">
                                <h3 className="token-empty-state__card-title text-title-primary">Pokémon Generator</h3>
                            </div>
                            <p className="token-empty-state__card-desc text-subtext">
                                {isStandalone
                                    ? 'Roll wild encounters or new party additions with randomized natures, movesets, and automated stat builds.'
                                    : 'Roll wild encounters or new party additions with randomized natures, movesets, and automatic token spawning.'}
                            </p>
                            <button
                                type="button"
                                className="action-button action-button--dark token-empty-state__card-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenModal('generator');
                                }}
                            >
                                <Wand2 size={14} /> Open Generator
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. Trainer Generator Card */}
                {canUseGenerators && (
                    <div className="token-empty-state__card" onClick={() => handleOpenModal('trainer-generator')}>
                        <div className="token-empty-state__card-icon token-empty-state__card-icon--trainer">
                            <Users size={22} />
                        </div>
                        <div className="token-empty-state__card-content">
                            <div className="token-empty-state__card-header">
                                <h3 className="token-empty-state__card-title text-title-primary">Trainer Generator</h3>
                            </div>
                            <p className="token-empty-state__card-desc text-subtext">
                                {isStandalone
                                    ? 'Generate complete Trainer characters and NPCs with distinct personalities, backgrounds, and balanced Pokémon rosters.'
                                    : 'Generate complete Trainer NPCs, personalities, and balanced Pokémon rosters with token formations.'}
                            </p>
                            <button
                                type="button"
                                className="action-button action-button--dark token-empty-state__card-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenModal('trainer-generator');
                                }}
                            >
                                <Users size={14} /> Open Trainer Generator
                            </button>
                        </div>
                    </div>
                )}

                {/* 4. Battle Organizer Card */}
                <div className="token-empty-state__card" onClick={() => handleOpenModal('battle-organizer')}>
                    <div className="token-empty-state__card-icon token-empty-state__card-icon--bo">
                        <Layers size={22} />
                    </div>
                    <div className="token-empty-state__card-content">
                        <div className="token-empty-state__card-header">
                            <h3 className="token-empty-state__card-title text-title-primary">Battle Organizer</h3>
                        </div>
                        <p className="token-empty-state__card-desc text-subtext">
                            {isStandalone
                                ? 'Track party health, round timers, initiative order, and combat conditions across your campaign encounters.'
                                : 'Track party health, round timers, initiative order, and combat conditions across the whole table.'}
                        </p>
                        <button
                            type="button"
                            className="action-button action-button--dark token-empty-state__card-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenModal('battle-organizer');
                            }}
                        >
                            <Layers size={14} /> Open Organizer
                        </button>
                    </div>
                </div>

                {/* 5. Homebrew Workshop Card */}
                {showHomebrew && (
                    <div className="token-empty-state__card" onClick={() => handleOpenModal('homebrew')}>
                        <div className="token-empty-state__card-icon token-empty-state__card-icon--homebrew">
                            <Hammer size={22} />
                        </div>
                        <div className="token-empty-state__card-content">
                            <div className="token-empty-state__card-header">
                                <h3 className="token-empty-state__card-title text-title-primary">Homebrew Workshop</h3>
                            </div>
                            <p className="token-empty-state__card-desc text-subtext">
                                Craft custom species, moves, abilities, items, and rulesets tailored specifically to
                                your campaign.
                            </p>
                            <button
                                type="button"
                                className="action-button action-button--dark token-empty-state__card-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenModal('homebrew');
                                }}
                            >
                                <Hammer size={14} /> Open Workshop
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
