import { Megaphone, XCircle } from 'lucide-react';
import { broadcastInfo } from '../../../utils/diceRoller';
import { TagPillList } from '../../ui/TagPillList';
import { extractTagsFromText } from './tagBuilder/tagBuilderLogic';
import { KNOWN_ITEMS } from '../../../data/constants';
import './ItemInfoModal.css';

interface ItemInfoModalProps {
    infoModal: { title: string; desc: string };
    onClose: () => void;
}

export function ItemInfoModal({ infoModal, onClose }: ItemInfoModalProps) {
    const knownItem = KNOWN_ITEMS.find((k) => k.name.toLowerCase() === (infoModal.title || '').trim().toLowerCase());
    const rawTags = extractTagsFromText(infoModal.desc || '');
    const tags = rawTags.length > 0 ? rawTags : knownItem?.tags ? extractTagsFromText(knownItem.tags) : [];
    const cleanDesc = (infoModal.desc || '').replace(/\[[^\]]+\]/g, '').trim();

    return (
        <div className="item-info__overlay">
            <div className="item-info__content">
                <h3 className="item-info__title text-title-primary">{infoModal.title}</h3>
                {cleanDesc && (
                    <p
                        className="item-info__desc text-subtext"
                        style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}
                    >
                        {cleanDesc}
                    </p>
                )}
                {tags.length > 0 && (
                    <div style={{ marginTop: '10px', marginBottom: '6px' }}>
                        <TagPillList tags={tags} readOnly />
                    </div>
                )}
                <div className="item-info__actions">
                    <button className="action-button action-button--dark item-info__btn-close" onClick={onClose}>
                        <XCircle size={16} /> Close
                    </button>
                    <button
                        className="action-button action-button--theme item-info__btn-broadcast"
                        onClick={() => {
                            const tagStr = tags.map((t) => t.tag).join(' ');
                            const fullText = tagStr
                                ? `${cleanDesc || infoModal.desc}\n\n${tagStr}`.trim()
                                : cleanDesc || infoModal.desc || 'No description provided.';
                            broadcastInfo(infoModal.title, fullText);
                            onClose();
                        }}
                    >
                        <Megaphone size={16} /> Broadcast
                    </button>
                </div>
            </div>
        </div>
    );
}
