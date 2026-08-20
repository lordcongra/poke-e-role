import { isStandaloneMode } from '../../utils/storageAdapter';
import { IdentityToggles } from './IdentityToggles';

interface IdentityControlsProps {
    onOpenTrackerSettings: () => void;
}

export function IdentityControls({ onOpenTrackerSettings }: IdentityControlsProps) {
    return (
        <div className="identity-header__actions">
            {!isStandaloneMode && <IdentityToggles onOpenTrackerSettings={onOpenTrackerSettings} />}
        </div>
    );
}
