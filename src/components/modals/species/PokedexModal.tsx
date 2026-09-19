import { Book, X, Megaphone, XCircle } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { broadcastInfo } from '../../utils/diceRoller';
import './PokedexModal.css';

interface PokedexModalProps {
    onClose: () => void;
}

export function PokedexModal({ onClose }: PokedexModalProps) {
    const identity = useCharacterStore((state) => state.identity);

    const handleBroadcast = () => {
        const desc = `Species: ${identity.species || '???'}\nDex No: ${identity.dexId || '???'}\nCategory: ${identity.dexCategory || '???'}\nHeight: ${identity.height || '???'}\nWeight: ${identity.weight || '???'}\n\n${identity.dexDescription || 'No description available.'}`;
        broadcastInfo(`Pokédex: ${identity.species || 'Unknown'}`, desc);
        onClose();
    };

    return (
        <div className="pokedex-modal__overlay">
            <div className="pokedex-modal__content">
                <div className="pokedex-modal__header">
                    <h3 className="pokedex-modal__title modal-title-with-icon text-title-primary">
                        <Book size={20} /> Pokédex Data
                    </h3>
                    <button onClick={onClose} className="pokedex-modal__close-btn text-subtext" title="Close">
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="pokedex-modal__body">
                    <div className="pokedex-modal__row">
                        <span className="text-label">Species:</span>
                        <span className="text-label" style={{ color: 'var(--text-main)' }}>
                            {identity.species || '???'}
                        </span>
                    </div>
                    <div className="pokedex-modal__row">
                        <span className="text-label">Dex No:</span>
                        <span className="text-label" style={{ color: 'var(--text-main)' }}>
                            {identity.dexId || '???'}
                        </span>
                    </div>
                    <div className="pokedex-modal__row">
                        <span className="text-label">Category:</span>
                        <span className="text-label" style={{ color: 'var(--text-main)' }}>
                            {identity.dexCategory || '???'}
                        </span>
                    </div>
                    <div className="pokedex-modal__row">
                        <span className="text-label">Height:</span>
                        <span className="text-label" style={{ color: 'var(--text-main)' }}>
                            {identity.height || '???'}
                        </span>
                    </div>
                    <div className="pokedex-modal__row">
                        <span className="text-label">Weight:</span>
                        <span className="text-label" style={{ color: 'var(--text-main)' }}>
                            {identity.weight || '???'}
                        </span>
                    </div>

                    <div
                        className="pokedex-modal__desc-box text-subtext"
                        style={{ fontStyle: 'italic', color: 'var(--text-main)' }}
                    >
                        {identity.dexDescription || 'No description available.'}
                    </div>
                </div>

                <div className="pokedex-modal__actions">
                    <button className="action-button action-button--dark pokedex-modal__btn" onClick={onClose}>
                        <XCircle size={16} /> Close
                    </button>
                    <button className="action-button action-button--theme pokedex-modal__btn" onClick={handleBroadcast}>
                        <Megaphone size={16} /> Broadcast
                    </button>
                </div>
            </div>
        </div>
    );
}
