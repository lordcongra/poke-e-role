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
                    <h3 className="pokedex-modal__title">📖 Pokédex Data</h3>
                    <button onClick={onClose} className="pokedex-modal__close-btn" title="Close">
                        X
                    </button>
                </div>

                <div className="pokedex-modal__body">
                    <div className="pokedex-modal__row">
                        <span className="pokedex-modal__label">Species:</span>
                        <span className="pokedex-modal__value">{identity.species || '???'}</span>
                    </div>
                    <div className="pokedex-modal__row">
                        <span className="pokedex-modal__label">Dex No:</span>
                        <span className="pokedex-modal__value">{identity.dexId || '???'}</span>
                    </div>
                    <div className="pokedex-modal__row">
                        <span className="pokedex-modal__label">Category:</span>
                        <span className="pokedex-modal__value">{identity.dexCategory || '???'}</span>
                    </div>
                    <div className="pokedex-modal__row">
                        <span className="pokedex-modal__label">Height:</span>
                        <span className="pokedex-modal__value">{identity.height || '???'}</span>
                    </div>
                    <div className="pokedex-modal__row">
                        <span className="pokedex-modal__label">Weight:</span>
                        <span className="pokedex-modal__value">{identity.weight || '???'}</span>
                    </div>

                    <div className="pokedex-modal__desc-box">
                        {identity.dexDescription || 'No description available.'}
                    </div>
                </div>

                <div className="pokedex-modal__actions">
                    <button className="action-button action-button--dark pokedex-modal__btn" onClick={onClose}>
                        Close
                    </button>
                    <button
                        className="action-button pokedex-modal__btn"
                        style={{ backgroundColor: '#1565c0', borderColor: '#1565c0', color: 'white' }}
                        onClick={handleBroadcast}
                    >
                        📢 Broadcast
                    </button>
                </div>
            </div>
        </div>
    );
}
