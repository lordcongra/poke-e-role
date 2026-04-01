import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { fetchAbilityData } from '../../utils/api';
import { CollapsingSection } from '../ui/CollapsingSection';
import { IdentityGrid } from './IdentityGrid';
import { IdentityControls } from './IdentityControls';
import { HomebrewModal } from '../homebrew/HomebrewModal';
import { GeneratorModal } from '../modals/GeneratorModal';
import { TrackerSettingsModal } from '../modals/TrackerSettingsModal';
import { RulesModal } from '../modals/RulesModal';
import './IdentityHeader.css';

export function IdentityHeader() {
    const identityStore = useCharacterStore((state) => state.identity) || {};
    const [isDark, setIsDark] = useState(false);

    const [modalConfig, setModalConfig] = useState<{ title: string; content: string | ReactNode } | null>(null);
    const [showHomebrewModal, setShowHomebrewModal] = useState(false);
    const [showGeneratorModal, setShowGeneratorModal] = useState(false);
    const [showTrackerSettings, setShowTrackerSettings] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('pokerole-theme');
        if (savedTheme === 'dark') {
            setIsDark(true);
        }
    }, []);

    const toggleTheme = () => {
        const newIsDark = !isDark;
        setIsDark(newIsDark);
        if (newIsDark) {
            document.body.classList.add('dark-mode');
            document.body.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('pokerole-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.body.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('pokerole-theme', 'light');
        }
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

    return (
        <CollapsingSection title="CHARACTER IDENTITY" className="sheet-panel identity-header">
            <IdentityGrid onOpenGenerator={() => setShowGeneratorModal(true)} onOpenAbility={openAbilityModal} />

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
