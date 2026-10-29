import React from 'react';
import { Puzzle, Share2, Copy, Check, ExternalLink } from 'lucide-react';
import { EXTENSION_MANIFEST_URL, CAR_MANIFEST_URL, BAG_IT_MANIFEST_URL, EMBERS_URL } from './platformGuideConstants';

interface PlatformGuideOwlbearTabProps {
    copiedUrl: string | null;
    onCopy: (url: string) => void;
}

export const PlatformGuideOwlbearTab: React.FC<PlatformGuideOwlbearTabProps> = ({ copiedUrl, onCopy }) => {
    return (
        <>
            <div className="platform-guide-modal__card">
                <h4 className="platform-guide-modal__card-title">
                    <Puzzle size={16} color="var(--primary)" /> Step 1: Install Extension in Owlbear Rodeo
                </h4>
                <p className="platform-guide-modal__card-desc">
                    Copy the official extension manifest URL below and add it to your Owlbear Rodeo room extension
                    manager.
                </p>
                <div className="platform-guide-modal__code-box">
                    <span className="platform-guide-modal__code-text">{EXTENSION_MANIFEST_URL}</span>
                    <button
                        type="button"
                        className="action-button action-button--theme platform-guide-modal__copy-btn"
                        onClick={() => onCopy(EXTENSION_MANIFEST_URL)}
                    >
                        {copiedUrl === EXTENSION_MANIFEST_URL ? (
                            <>
                                <Check size={14} /> Copied!
                            </>
                        ) : (
                            <>
                                <Copy size={14} /> Copy URL
                            </>
                        )}
                    </button>
                </div>
                <ol className="platform-guide-modal__step-list">
                    <li>Open your Owlbear Rodeo room (or create a new game room).</li>
                    <li>
                        Open the <strong>Extensions</strong> dock menu (puzzle piece icon) and select{' '}
                        <strong>+ Add Extension</strong>.
                    </li>
                    <li>Paste the copied manifest URL and confirm installation.</li>
                    <li>
                        Click the <strong>Pokérole 3.0 Sheet</strong> icon in your action dock to open the floating
                        window.
                    </li>
                </ol>
            </div>

            <div className="platform-guide-modal__card">
                <h4 className="platform-guide-modal__card-title">
                    <Share2 size={16} color="var(--primary)" /> Step 2: Token Binding & Canvas Trackers
                </h4>
                <p className="platform-guide-modal__card-desc">
                    In Owlbear Rodeo, character sheets attach directly to VTT map tokens located on the{' '}
                    <strong>Character</strong> layer.
                </p>
                <ul className="platform-guide-modal__step-list">
                    <li>
                        <strong>Select Any Token:</strong> Clicking a character token instantly loads its attributes,
                        moves, and HP/Will pools into the sheet.
                    </li>
                    <li>
                        <strong>Canvas HUD Badges:</strong> HP bars, Will bars, and Defense badges hover directly above
                        your tokens on the map, updating in real-time as damage and actions resolve.
                    </li>
                    <li>
                        <strong>PC Deployment:</strong> Summon stored Pokémon directly from PC Storage onto the scene
                        with <em>Auto-Place</em> or <em>Click to Place</em>, and recall them back to storage when combat
                        ends.
                    </li>
                </ul>
            </div>

            <div className="platform-guide-modal__card">
                <h4 className="platform-guide-modal__card-title">
                    <Puzzle size={16} color="var(--primary)" /> Step 3: Recommended Companion Plugins
                </h4>
                <p className="platform-guide-modal__card-desc">
                    Enhance your virtual tabletop experience with companion plugins:
                </p>
                <div className="platform-guide-modal__plugin-item">
                    <div className="platform-guide-modal__plugin-header">
                        <span className="platform-guide-modal__plugin-title">
                            Custom Action Rolls (CAR) - 3D Dice Engine
                        </span>
                        <div className="platform-guide-modal__plugin-actions">
                            <button
                                type="button"
                                className="action-button action-button--theme platform-guide-modal__copy-btn"
                                onClick={() => onCopy(CAR_MANIFEST_URL)}
                            >
                                {copiedUrl === CAR_MANIFEST_URL ? (
                                    <>
                                        <Check size={14} /> Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={14} /> Copy Manifest
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    <p className="platform-guide-modal__plugin-desc">
                        Spawns interactive 3D dice on the canvas with custom Pokérole roll logs and exploding dice
                        support. (Alternatively, enable <strong>Pure Roll Log</strong> in Room Rules for instant
                        zero-plugin calculations).
                    </p>
                </div>
                <div className="platform-guide-modal__plugin-item">
                    <div className="platform-guide-modal__plugin-header">
                        <span className="platform-guide-modal__plugin-title">Bag It! - Visual Tabletop Inventory</span>
                        <div className="platform-guide-modal__plugin-actions">
                            <button
                                type="button"
                                className="action-button action-button--theme platform-guide-modal__copy-btn"
                                onClick={() => onCopy(BAG_IT_MANIFEST_URL)}
                            >
                                {copiedUrl === BAG_IT_MANIFEST_URL ? (
                                    <>
                                        <Check size={14} /> Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={14} /> Copy Manifest
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    <p className="platform-guide-modal__plugin-desc">
                        A visual tabletop inventory system for placing, sorting, and trading physical items, bags, and
                        loot directly on the map canvas.
                    </p>
                </div>
                <div className="platform-guide-modal__plugin-item">
                    <div className="platform-guide-modal__plugin-header">
                        <span className="platform-guide-modal__plugin-title">Embers - Spell & Attack Animations</span>
                        <div className="platform-guide-modal__plugin-actions">
                            <button
                                type="button"
                                className="action-button action-button--theme platform-guide-modal__copy-btn"
                                onClick={() => onCopy(EMBERS_URL)}
                            >
                                {copiedUrl === EMBERS_URL ? (
                                    <>
                                        <Check size={14} /> Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={14} /> Copy Link
                                    </>
                                )}
                            </button>
                            <a
                                href={EMBERS_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="action-button action-button--theme platform-guide-modal__copy-btn platform-guide-modal__copy-btn--icon"
                                title="Open Embers Extension in Owlbear Store"
                                aria-label="Open Embers Extension in Owlbear Store"
                                style={{ textDecoration: 'none' }}
                            >
                                <ExternalLink size={13} />
                            </a>
                        </div>
                    </div>
                    <p className="platform-guide-modal__plugin-desc">
                        An amazing extension for setting up animated attack, aura, and spell visual effects directly on
                        the tabletop map.
                    </p>
                </div>
            </div>
        </>
    );
};
