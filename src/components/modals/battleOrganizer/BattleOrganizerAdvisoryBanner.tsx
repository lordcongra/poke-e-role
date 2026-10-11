import React, { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';

interface BattleOrganizerAdvisoryBannerProps {
    onWheel?: (e: React.WheelEvent) => void;
}

export function BattleOrganizerAdvisoryBanner({ onWheel }: BattleOrganizerAdvisoryBannerProps) {
    const [showObrAdvisory, setShowObrAdvisory] = useState(() => {
        if (isStandaloneMode) return false;
        try {
            return localStorage.getItem('pkr_bo_advisory_dismissed') !== 'true';
        } catch {
            return true;
        }
    });

    if (isStandaloneMode || !showObrAdvisory) return null;

    const handleDismissAdvisory = () => {
        setShowObrAdvisory(false);
        try {
            localStorage.setItem('pkr_bo_advisory_dismissed', 'true');
        } catch (e) {
            console.warn('[BattleOrganizerModal] Failed to persist advisory dismissal:', e);
        }
    };

    return (
        <div className="bo-advisory-banner" onWheel={onWheel}>
            <div className="bo-advisory-banner__content text-subtext">
                <span className="bo-advisory-banner__icon">
                    <Lightbulb size={16} color="#f59e0b" />
                </span>
                <span>
                    <strong>Optimal Dual-Screen GM Setup:</strong> For the best experience without modal
                    occlusion on your battle map or 3D dice, open your Owlbear Rodeo room link in a{' '}
                    <strong>Private / Incognito window</strong> as a guest, grant that guest{' '}
                    <strong>GM permissions</strong>, and manage the Battle Organizer there.{' '}
                    <em>
                        (Do not duplicate your tab on the same logged-in account, as Owlbear Rodeo rate-limits
                        duplicate sessions and will crash).
                    </em>
                </span>
            </div>
            <button
                type="button"
                className="bo-advisory-banner__close"
                onClick={handleDismissAdvisory}
                title="Dismiss tip"
                aria-label="Dismiss tip"
            >
                <X size={14} />
            </button>
        </div>
    );
}
