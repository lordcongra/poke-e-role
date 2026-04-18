import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { fetchAbilityData, fetchNatureData } from '../../utils/api';
import { CollapsingSection } from '../ui/CollapsingSection';
import { IdentityGrid } from './IdentityGrid';
import { IdentityControls } from './IdentityControls';
import { HomebrewModal } from '../homebrew/HomebrewModal';
import { GeneratorModal } from '../modals/GeneratorModal';
import { TrackerSettingsModal } from '../modals/TrackerSettingsModal';
import { RulesModal } from '../modals/RulesModal';
import { ChangelogModal } from '../modals/ChangelogModal';
import { CURRENT_VERSION } from '../../data/changelog';
import './IdentityHeader.css';

export function IdentityHeader() {
    const identityStore = useCharacterStore((state) => state.identity) || {};
    const [isDark, setIsDark] = useState(false);

    const [modalConfig, setModalConfig] = useState<{ title: string; content: string | ReactNode } | null>(null);
    const [showHomebrewModal, setShowHomebrewModal] = useState(false);
    const [showGeneratorModal, setShowGeneratorModal] = useState(false);
    const [showTrackerSettings, setShowTrackerSettings] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);

    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem('pokerole-theme');
            if (savedTheme === 'dark') {
                setIsDark(true);
                document.body.classList.add('dark-mode');
                document.body.setAttribute('data-theme', 'dark');
                document.documentElement.setAttribute('data-theme', 'dark');
            }

            const seenVersion = localStorage.getItem('pkr_changelog_seen');
            if (seenVersion !== CURRENT_VERSION) {
                setShowChangelog(true);
            }
        } catch (e) {
            console.warn('Could not access localStorage', e);
        }
    }, []);

    const toggleTheme = () => {
        const newIsDark = !isDark;
        setIsDark(newIsDark);

        const themeValue = newIsDark ? 'dark' : 'light';

        if (newIsDark) {
            document.body.classList.add('dark-mode');
            document.body.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.body.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
        }

        try {
            localStorage.setItem('pokerole-theme', themeValue);
        } catch (e) {}

        // Tell any other open windows (like the Roll Log) to update their themes!
        if (OBR.isAvailable) {
            OBR.broadcast.sendMessage('pokerole-pmd-extension/theme-sync', themeValue, { destination: 'LOCAL' });
        }
    };

    const handleCloseChangelog = () => {
        try {
            localStorage.setItem('pkr_changelog_seen', CURRENT_VERSION);
        } catch (e) {}
        setShowChangelog(false);
    };

    const openAbilityModal = async () => {
        if (!identityStore.ability) {
            setModalConfig({ title: 'Ability', content: 'No ability selected.' });
            return;
        }
        setModalConfig({ title: 'Ability', content: 'Loading...' });
        const data = await fetchAbilityData(identityStore.ability);

        if (data && (data.Description || data.Effect)) {
            const content = [data.Description, data.Effect].filter(Boolean).join('\n\n');
            setModalConfig({ title: identityStore.ability, content });
        } else {
            setModalConfig({ title: 'Ability', content: 'Could not load ability data.' });
        }
    };

    const openNatureModal = async () => {
        if (!identityStore.nature || identityStore.nature === '-- Select --') {
            setModalConfig({ title: 'Nature', content: 'No nature selected.' });
            return;
        }
        setModalConfig({ title: 'Nature', content: 'Loading...' });
        const data = await fetchNatureData(identityStore.nature);

        if (data) {
            const content = [];

            // Safely extract properties regardless of casing
            const safeData = data as Record<string, unknown>;
            const keywords = safeData.Keywords || safeData.keywords;
            const desc = safeData.Description || safeData.description;
            const confidence = safeData.Confidence || safeData.confidence;
            const statUp = safeData['Stat Up'] || safeData['stat up'] || safeData.StatUp;
            const statDown = safeData['Stat Down'] || safeData['stat down'] || safeData.StatDown;

            if (keywords) content.push(`Keywords: ${keywords}`);
            if (confidence) content.push(`Confidence: ${confidence}`);
            if (statUp) content.push(`Stat Up: ${statUp}`);
            if (statDown) content.push(`Stat Down: ${statDown}`);
            if (desc) content.push(String(desc));

            // If we couldn't find any standard keys, just dump the raw JSON to the screen so it's never blank!
            if (content.length === 0) content.push(JSON.stringify(data, null, 2));

            setModalConfig({ title: `Nature: ${identityStore.nature}`, content: content.join('\n\n') });
        } else {
            setModalConfig({ title: 'Nature', content: 'Could not load nature data.' });
        }
    };

    const headerElements = (
        <button
            type="button"
            className="action-button action-button--dark identity-header__changelog-btn"
            onClick={() => setShowChangelog(true)}
            title="View Update Log"
        >
            📢 What's New
        </button>
    );

    return (
        <CollapsingSection
            title="CHARACTER IDENTITY"
            headerElements={headerElements}
            className="sheet-panel identity-header"
        >
            <IdentityGrid
                onOpenGenerator={() => setShowGeneratorModal(true)}
                onOpenAbility={openAbilityModal}
                onOpenNature={openNatureModal}
            />

            <IdentityControls
                onOpenHomebrew={() => setShowHomebrewModal(true)}
                onOpenTrackerSettings={() => setShowTrackerSettings(true)}
                onOpenRules={() => setShowRulesModal(true)}
                isDark={isDark}
                toggleTheme={toggleTheme}
            />

            {showHomebrewModal && <HomebrewModal onClose={() => setShowHomebrewModal(false)} />}
            {showGeneratorModal && <GeneratorModal onClose={() => setShowGeneratorModal(false)} />}
            {showTrackerSettings && <TrackerSettingsModal onClose={() => setShowTrackerSettings(false)} />}
            {showRulesModal && <RulesModal onClose={() => setShowRulesModal(false)} />}
            {showChangelog && <ChangelogModal onClose={handleCloseChangelog} />}

            {modalConfig && (
                <div className="identity-header__modal-overlay identity-header__modal-overlay--high-z">
                    <div className="identity-header__modal-content identity-header__modal-content--large">
                        <h3 className="identity-header__modal-title identity-header__modal-title--large">
                            {modalConfig.title}
                        </h3>
                        <hr className="identity-header__modal-divider" />
                        <div className="identity-header__modal-text identity-header__modal-text--pre-wrap">
                            {modalConfig.content}
                        </div>
                        <div>
                            <button
                                className="action-button action-button--dark identity-header__modal-close-btn"
                                onClick={() => setModalConfig(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </CollapsingSection>
    );
}
