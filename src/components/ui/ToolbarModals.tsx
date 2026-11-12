import React, { lazy, Suspense } from 'react';
import { RulesModal } from '../modals/settings/RulesModal';
import { ChangelogModal } from '../modals/settings/ChangelogModal';
import { InitiativeSettingsModal } from '../modals/trackers/InitiativeSettingsModal';
import { PrintSettingsModal } from '../modals/settings/PrintSettingsModal';
import { ThemeSettingsModal } from '../modals/settings/ThemeSettingsModal';
import { AccessibilityModal } from '../modals/settings/AccessibilityModal';
import { BattleOrganizerModal } from '../modals/battleOrganizer/BattleOrganizerModal';
import { BattleOrganizerSettingsModal } from '../modals/battleOrganizer/BattleOrganizerSettingsModal';
import { BugReportModal, PlatformGuideModal } from '../modals/settings';
import { PcStorageModal } from '../modals/pcStorage/PcStorageModal';

const HomebrewModal = lazy(() => import('../homebrew/HomebrewModal').then((m) => ({ default: m.HomebrewModal })));
const ItemGeneratorModal = lazy(() =>
    import('../modals/itemGenerator').then((m) => ({ default: m.ItemGeneratorModal }))
);
const GeneratorModal = lazy(() =>
    import('../modals/pokemonGenerator').then((m) => ({ default: m.GeneratorModal }))
);
const TrainerGeneratorModal = lazy(() =>
    import('../modals/trainerGenerator').then((m) => ({ default: m.TrainerGeneratorModal }))
);
const GmScreenModal = lazy(() =>
    import('../modals/gmScreen/GmScreenModal').then((m) => ({ default: m.GmScreenModal }))
);
const PrintBattleOrganizer = lazy(() =>
    import('../print/PrintBattleOrganizer').then((m) => ({ default: m.PrintBattleOrganizer }))
);

export type ActiveModal =
    | 'homebrew'
    | 'rules'
    | 'loot'
    | 'changelog'
    | 'init'
    | 'generator'
    | 'trainer-generator'
    | 'print'
    | 'theme'
    | 'accessibility'
    | 'gm-screen'
    | 'battle-organizer'
    | 'battle-organizer-settings'
    | 'bug-report'
    | 'pc'
    | 'platform-guide'
    | null;

export interface ToolbarModalsProps {
    activeModal: ActiveModal;
    onClose: () => void;
    onCloseChangelog: () => void;
    onClosePcModal: () => void;
    onPrintBattleOrganizer: () => void;
    isPrintingBattleOrganizer: boolean;
    onDonePrintingBattleOrganizer: () => void;
}

export const ToolbarModals: React.FC<ToolbarModalsProps> = ({
    activeModal,
    onClose,
    onCloseChangelog,
    onClosePcModal,
    onPrintBattleOrganizer,
    isPrintingBattleOrganizer,
    onDonePrintingBattleOrganizer
}) => {
    return (
        <Suspense fallback={null}>
            {activeModal === 'homebrew' && <HomebrewModal onClose={onClose} />}
            {activeModal === 'rules' && <RulesModal onClose={onClose} />}
            {activeModal === 'loot' && <ItemGeneratorModal onClose={onClose} />}
            {activeModal === 'generator' && <GeneratorModal onClose={onClose} />}
            {activeModal === 'trainer-generator' && <TrainerGeneratorModal onClose={onClose} />}
            {activeModal === 'changelog' && <ChangelogModal onClose={onCloseChangelog} />}
            {activeModal === 'init' && <InitiativeSettingsModal onClose={onClose} />}
            {activeModal === 'print' && <PrintSettingsModal onClose={onClose} />}
            {activeModal === 'theme' && <ThemeSettingsModal onClose={onClose} />}
            {activeModal === 'accessibility' && <AccessibilityModal onClose={onClose} />}
            {activeModal === 'gm-screen' && <GmScreenModal onClose={onClose} />}
            {activeModal === 'battle-organizer-settings' && <BattleOrganizerSettingsModal onClose={onClose} />}
            {activeModal === 'battle-organizer' && (
                <BattleOrganizerModal onClose={onClose} onPrint={onPrintBattleOrganizer} />
            )}
            {activeModal === 'bug-report' && <BugReportModal onClose={onClose} />}
            {activeModal === 'pc' && (
                <PcStorageModal
                    onClose={() => {
                        onClose();
                        onClosePcModal();
                    }}
                />
            )}
            {activeModal === 'platform-guide' && <PlatformGuideModal onClose={onClose} />}

            {isPrintingBattleOrganizer && <PrintBattleOrganizer onDone={onDonePrintingBattleOrganizer} />}
        </Suspense>
    );
};
