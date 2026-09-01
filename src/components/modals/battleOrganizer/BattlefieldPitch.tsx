import type { BattlefieldSideHighlight } from '../../../types/battleOrganizerTypes';

interface BattlefieldPitchProps {
    highlightedSide: BattlefieldSideHighlight;
    onHighlightChange: (side: BattlefieldSideHighlight) => void;
    playerTargets: number | string;
    foeTargets: number | string;
    onPlayerTargetsChange: (val: string) => void;
    onFoeTargetsChange: (val: string) => void;
}

export function BattlefieldPitch({
    highlightedSide,
    onHighlightChange,
    playerTargets,
    foeTargets,
    onPlayerTargetsChange,
    onFoeTargetsChange
}: BattlefieldPitchProps) {
    return (
        <div className="bo-pitch-wrapper">
            {/* Battlefield Side Selector Buttons */}
            <div className="bo-pitch-selector-row">
                <button
                    type="button"
                    className={`bo-pitch-badge ${highlightedSide === 'all' ? 'bo-pitch-badge--active' : ''}`}
                    onClick={() => onHighlightChange('all')}
                    title="Highlight and focus the whole battlefield"
                >
                    Full Field
                </button>
                <button
                    type="button"
                    className={`bo-pitch-badge bo-pitch-badge--player ${highlightedSide === 'player' ? 'bo-pitch-badge--active' : ''}`}
                    onClick={() => onHighlightChange('player')}
                    title="Highlight and focus Player's Side"
                >
                    Player Side
                </button>
                <button
                    type="button"
                    className={`bo-pitch-badge bo-pitch-badge--foe ${highlightedSide === 'foe' ? 'bo-pitch-badge--active' : ''}`}
                    onClick={() => onHighlightChange('foe')}
                    title="Highlight and focus Foe's Side"
                >
                    Foe Side
                </button>
            </div>

            {/* Stadium Pitch SVG */}
            <div
                className={`bo-pitch-container bo-pitch-container--${highlightedSide}`}
                title="Click Left (Green) for Player Side, Right (Red) for Foe Side, or Center for Full Field"
            >
                <svg
                    viewBox="0 0 160 110"
                    className="bo-pitch-svg"
                    role="img"
                    aria-label="Pokémon Stadium Battlefield Pitch"
                >
                    {/* Background stadium shape */}
                    <defs>
                        <clipPath id="pitch-clip">
                            <rect x="5" y="5" width="150" height="100" rx="18" ry="18" />
                        </clipPath>
                    </defs>

                    <g clipPath="url(#pitch-clip)">
                        {/* Player Side (Left Green) */}
                        <rect
                            x="5"
                            y="5"
                            width="75"
                            height="100"
                            className={`bo-pitch-half bo-pitch-half--player ${highlightedSide === 'player' || highlightedSide === 'all' ? 'bo-pitch-half--highlight' : ''}`}
                            onClick={() => onHighlightChange(highlightedSide === 'player' ? 'all' : 'player')}
                        />

                        {/* Foe Side (Right Red) */}
                        <rect
                            x="80"
                            y="5"
                            width="75"
                            height="100"
                            className={`bo-pitch-half bo-pitch-half--foe ${highlightedSide === 'foe' || highlightedSide === 'all' ? 'bo-pitch-half--highlight' : ''}`}
                            onClick={() => onHighlightChange(highlightedSide === 'foe' ? 'all' : 'foe')}
                        />

                        {/* Pitch Markings */}
                        {/* Player Goal / Box */}
                        <rect
                            x="5"
                            y="35"
                            width="20"
                            height="40"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeOpacity="0.85"
                            pointerEvents="none"
                        />
                        {/* Foe Goal / Box */}
                        <rect
                            x="135"
                            y="35"
                            width="20"
                            height="40"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeOpacity="0.85"
                            pointerEvents="none"
                        />

                        {/* Center Dividing Line */}
                        <line
                            x1="80"
                            y1="5"
                            x2="80"
                            y2="105"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeOpacity="0.9"
                            pointerEvents="none"
                        />

                        {/* Center Pokéball Graphic (Clicking resets to Full Field) */}
                        <circle
                            cx="80"
                            cy="55"
                            r="18"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeOpacity="0.9"
                            onClick={() => onHighlightChange('all')}
                            style={{ cursor: 'pointer' }}
                        />
                        <circle
                            cx="80"
                            cy="55"
                            r="10"
                            fill="#ffffff"
                            fillOpacity="0.95"
                            stroke="#333333"
                            strokeWidth="1.5"
                            onClick={() => onHighlightChange('all')}
                            style={{ cursor: 'pointer' }}
                        />
                        <circle
                            cx="80"
                            cy="55"
                            r="4.5"
                            fill="#333333"
                            onClick={() => onHighlightChange('all')}
                            style={{ cursor: 'pointer' }}
                        />
                        <line
                            x1="62"
                            y1="55"
                            x2="98"
                            y2="55"
                            stroke="#333333"
                            strokeWidth="1.5"
                            pointerEvents="none"
                        />
                    </g>

                    {/* Outer Border */}
                    <rect
                        x="5"
                        y="5"
                        width="150"
                        height="100"
                        rx="18"
                        ry="18"
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="2"
                        pointerEvents="none"
                    />
                </svg>
            </div>

            {/* Number of Targets Section */}
            <div className="bo-pitch-targets">
                <span className="bo-pitch-targets-label text-label">Number of Targets</span>
                <div className="bo-pitch-targets-inputs">
                    <input
                        type="text"
                        className="bo-pitch-target-input bo-pitch-target-input--player text-value-highlight"
                        value={playerTargets}
                        onChange={(e) => onPlayerTargetsChange(e.target.value)}
                        placeholder="Player"
                        title="Player side targets count"
                        aria-label="Player side targets"
                    />
                    <input
                        type="text"
                        className="bo-pitch-target-input bo-pitch-target-input--foe text-value-highlight"
                        value={foeTargets}
                        onChange={(e) => onFoeTargetsChange(e.target.value)}
                        placeholder="Foe"
                        title="Foe side targets count"
                        aria-label="Foe side targets"
                    />
                </div>
            </div>
        </div>
    );
}
