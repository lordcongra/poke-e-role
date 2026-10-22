import { Award, X, ExternalLink, BookOpen, Ghost, Compass, Wrench } from 'lucide-react';
import { DiscordIcon } from '../../ui/DiscordIcon';
import { DRAKE_RANGERS_DOC_URL, DRAKE_HELD_ITEMS_DOC_URL, DRAKE_WEAPONS_DOC_URL } from '../../../data/gmScreenData';
import './GmScreenCreditsModal.css';

interface GmScreenCreditsModalProps {
    onClose: () => void;
}

export function GmScreenCreditsModal({ onClose }: GmScreenCreditsModalProps) {
    return (
        <div className="gm-credits-modal__overlay" onClick={onClose}>
            <div className="gm-credits-modal__content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="gm-credits-modal__header">
                    <div className="gm-credits-modal__header-left">
                        <Award size={20} color="var(--primary)" />
                        <h3 className="gm-credits-modal__title text-title-primary">
                            GM Screen Credits & Acknowledgments
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="gm-credits-modal__close-btn"
                        title="Close Credits"
                        aria-label="Close Credits"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Subtitle / Intro */}
                <div className="gm-credits-modal__intro text-subtext">
                    Special thanks and heartfelt credit to the amazing authors, supplement designers, and community
                    contributors whose work powers this digital GM Screen and Rules Cheat Sheet.
                </div>

                {/* Body / List of credits */}
                <div className="gm-credits-modal__body">
                    {/* 1. Little Glee Monster */}
                    <div className="gm-credits-card">
                        <div className="gm-credits-card__header">
                            <div className="gm-credits-card__badge-icon gm-credits-card__badge-icon--primary">
                                <Ghost size={16} />
                            </div>
                            <div className="gm-credits-card__title-group">
                                <h4 className="text-label gm-credits-card__name">Little Glee Monster</h4>
                                <span className="gm-credits-card__role text-subtext">
                                    Creator of Pokérole & Sole Developer of Pokérole 3.0
                                </span>
                            </div>
                        </div>
                        <p className="gm-credits-card__desc text-subtext">
                            The creator of the Pokérole tabletop roleplaying system and the sole developer behind the
                            3.0 Corebook that this entire autosheet is built for (originally co-created with the
                            Pokérole Project team). The official 3.0 Corebook PDF contains the complete system rules,
                            moves, abilities, and Pokédex and is freely available in the{' '}
                            <strong>#pokerole-corebook</strong> channel on the Pokérole Discord.
                        </p>
                    </div>

                    {/* 2. Willowlark */}
                    <div className="gm-credits-card">
                        <div className="gm-credits-card__header">
                            <div className="gm-credits-card__badge-icon gm-credits-card__badge-icon--secondary">
                                <BookOpen size={16} />
                            </div>
                            <div className="gm-credits-card__title-group">
                                <h4 className="text-label gm-credits-card__name">Willowlark</h4>
                                <span className="gm-credits-card__role text-subtext">Lead Reference Compiler</span>
                            </div>
                        </div>
                        <p className="gm-credits-card__desc text-subtext">
                            Compiled, organized, and authored the comprehensive Pokérole 3.0 GM Reference & Cheat Sheet.
                            Their incredible work forms the backbone of the core combat tables, difficulty benchmarks,
                            attribute scaling, will points, cover & healing, rank summaries, maneuvers, weather, and
                            catching rules in this sheet.
                        </p>
                    </div>

                    {/* 3. Prof. Drake */}
                    <div className="gm-credits-card">
                        <div className="gm-credits-card__header">
                            <div className="gm-credits-card__badge-icon gm-credits-card__badge-icon--accent">
                                <Compass size={16} />
                            </div>
                            <div className="gm-credits-card__title-group">
                                <h4 className="text-label gm-credits-card__name">Prof. Drake</h4>
                                <span className="gm-credits-card__role text-subtext">
                                    Supplement Author & Homebrew Creator
                                </span>
                            </div>
                        </div>
                        <p className="gm-credits-card__desc text-subtext">
                            Author of the Pokémon Rangers supplement for Pokérole (Capture Stylers, Disposition Meters,
                            ranger loop maneuvers, dangerous encounter buffs, wild assists, and partner bonds). Also
                            created the Upgradeable Struggle Weapons progression system and extensive Held Item Homebrew
                            catalog.
                        </p>
                        <div className="gm-credits-card__links">
                            <a
                                href={DRAKE_RANGERS_DOC_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="action-button action-button--dark gm-credits-card__link"
                            >
                                <ExternalLink size={12} /> Rangers Supplement (Google Doc)
                            </a>
                            <a
                                href={DRAKE_WEAPONS_DOC_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="action-button action-button--dark gm-credits-card__link"
                            >
                                <ExternalLink size={12} /> Weapon Progression (Google Doc)
                            </a>
                            <a
                                href={DRAKE_HELD_ITEMS_DOC_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="action-button action-button--dark gm-credits-card__link"
                            >
                                <ExternalLink size={12} /> Held Item Compendium (Google Doc)
                            </a>
                        </div>
                    </div>

                    {/* 4. Congra */}
                    <div className="gm-credits-card">
                        <div className="gm-credits-card__header">
                            <div className="gm-credits-card__badge-icon gm-credits-card__badge-icon--theme">
                                <Wrench size={16} />
                            </div>
                            <div className="gm-credits-card__title-group">
                                <h4 className="text-label gm-credits-card__name">Congra</h4>
                                <span className="gm-credits-card__role text-subtext">
                                    Autosheet & Digital GM Screen Developer
                                </span>
                            </div>
                        </div>
                        <p className="gm-credits-card__desc text-subtext">
                            Adapted and enhanced the reference compilation for the digital Autosheet. Built the
                            interactive GM screen modal, weighted multi-field search engine, Pokémon lookup tool,
                            Owlbear Rodeo table broadcasts, Discord markdown copiers, deep linking, and PMD Mystery
                            Dungeon campaign systems (bag weights, food, and weapon models).
                        </p>
                    </div>
                </div>

                {/* Footer callout */}
                <div className="gm-credits-modal__footer">
                    <div className="gm-credits-modal__footer-text text-subtext">
                        Questions, rule corrections, or suggestions?
                    </div>
                    <a
                        href="https://discord.gg/B9VcfYwWCJ"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="action-button action-button--theme gm-credits-modal__discord-btn"
                        title="Join the Pokérole Discord"
                    >
                        <DiscordIcon size={14} /> Join Pokérole Discord (@congra)
                    </a>
                </div>
            </div>
        </div>
    );
}
