import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { fetchNatureData } from '../../../utils/api';
import { broadcastInfo } from '../../../utils/diceRoller';

interface NatureInfoModalProps {
    isOpen: boolean;
    nature: string;
    onClose: () => void;
}

const ICON_SHADOW = 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.8)) drop-shadow(0 1px 4px rgba(0, 0, 0, 0.6))';

export function NatureInfoModal({ isOpen, nature, onClose }: NatureInfoModalProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        if (!nature || nature === '-- Select --') {
            setTitle('Nature');
            setContent('No nature selected.');
            return;
        }

        setTitle(`Nature: ${nature}`);
        setContent('Loading...');
        setIsLoading(true);

        fetchNatureData(nature)
            .then((data) => {
                if (!data) {
                    setContent('Could not load nature data.');
                    return;
                }

                const lines: string[] = [];
                const safeData = data as Record<string, unknown>;
                const keywords = safeData.Keywords || safeData.keywords;
                const desc = safeData.Description || safeData.description;
                const confidence = safeData.Confidence || safeData.confidence;
                const statUp = safeData['Stat Up'] || safeData['stat up'] || safeData.StatUp;
                const statDown = safeData['Stat Down'] || safeData['stat down'] || safeData.StatDown;

                if (keywords) lines.push(`Keywords: ${keywords}`);
                if (confidence) lines.push(`Confidence: ${confidence}`);
                if (statUp) lines.push(`Stat Up: ${statUp}`);
                if (statDown) lines.push(`Stat Down: ${statDown}`);
                if (desc) lines.push(String(desc));

                if (lines.length === 0) lines.push(JSON.stringify(data, null, 2));
                setContent(lines.join('\n\n'));
            })
            .catch(() => {
                setContent('Could not load nature data.');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [isOpen, nature]);

    if (!isOpen) return null;

    const handleBroadcast = () => {
        if (content && !isLoading) {
            broadcastInfo(title, content);
            onClose();
        }
    };

    return (
        <div className="identity-header__modal-overlay identity-header__modal-overlay--high-z">
            <div className="identity-header__modal-content identity-header__modal-content--large">
                <h3 className="identity-header__modal-title identity-header__modal-title--large text-title-primary">
                    {title}
                </h3>
                <hr className="identity-header__modal-divider" />
                <div className="identity-header__modal-text identity-header__modal-text--pre-wrap text-subtext">
                    {content}
                </div>
                <div className="identity-header__modal-actions">
                    <button
                        type="button"
                        className="action-button action-button--dark identity-header__modal-btn"
                        onClick={onClose}
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--secondary identity-header__modal-btn"
                        onClick={handleBroadcast}
                        disabled={isLoading}
                    >
                        <Radio size={16} style={{ filter: ICON_SHADOW }} /> Broadcast
                    </button>
                </div>
            </div>
        </div>
    );
}
