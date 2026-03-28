// src/components/IdentityHeader.tsx
import { useState, useEffect } from 'react';
import { useCharacterStore, type Rank } from '../store/useCharacterStore';
import { fetchPokemonData, fetchAbilityData, loadGithubTree, ALL_ABILITIES, SPECIES_URLS } from '../utils/api';

const RANKS: Rank[] = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master', 'Champion'];
const POKEMON_TYPES = ['', 'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];
const TYPE_COLORS: Record<string, string> = { 'Normal': '#A8A878', 'Fire': '#F08030', 'Water': '#6890F0', 'Electric': '#F8D030', 'Grass': '#78C850', 'Ice': '#98D8D8', 'Fighting': '#C03028', 'Poison': '#A040A0', 'Ground': '#E0C068', 'Flying': '#A890F0', 'Psychic': '#F85888', 'Bug': '#A8B820', 'Rock': '#B8A038', 'Ghost': '#705898', 'Dragon': '#7038F8', 'Dark': '#705848', 'Steel': '#B8B8D0', 'Fairy': '#EE99AC' };

const NATURES = ["", "Hardy", "Lonely", "Brave", "Adamant", "Naughty", "Bold", "Docile", "Relaxed", "Impish", "Lax", "Timid", "Hasty", "Serious", "Jolly", "Naive", "Modest", "Mild", "Quiet", "Bashful", "Rash", "Calm", "Gentle", "Sassy", "Careful", "Quirky"];
const AGES = ["Child", "Teen", "Adult", "Elder"];

// Tooltip helper component for the cute grey '?' circle
const TooltipIcon = ({ onClick }: { onClick: () => void }) => (
    <span onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#555', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '11px', cursor: 'pointer', marginLeft: '6px', fontWeight: 'bold' }}>?</span>
);

export function IdentityHeader() {
    const id = useCharacterStore(state => state.identity) || {};
    const setIdentity = useCharacterStore(state => state.setIdentity);
    const applySpeciesData = useCharacterStore(state => state.applySpeciesData);
    
    const [isFetching, setIsFetching] = useState(false);
    const [allAbilitiesList, setAllAbilitiesList] = useState<string[]>([]);
    const [speciesList, setSpeciesList] = useState<string[]>([]);
    const [isDark, setIsDark] = useState(false);

    // NEW: Modal State
    const [modalConfig, setModalConfig] = useState<{title: string, content: string | React.ReactNode} | null>(null);

    useEffect(() => { 
        loadGithubTree().then(() => { 
            setAllAbilitiesList([...ALL_ABILITIES]); 
            const formattedSpecies = Object.keys(SPECIES_URLS).map(s => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-'));
            setSpeciesList(formattedSpecies.sort());
        }).catch(err => console.error("Failed to load GitHub tree:", err)); 
    }, []);

    const toggleTheme = () => {
        const newIsDark = !isDark;
        setIsDark(newIsDark);
        if (newIsDark) {
            document.body.classList.add('dark-mode'); document.body.setAttribute('data-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode'); document.body.setAttribute('data-theme', 'light');
        }
    };

    const handleFetch = async () => {
        if (!id.species) return;
        setIsFetching(true);
        try { 
            const data = await fetchPokemonData(id.species); 
            if (data) applySpeciesData(data); 
        } catch (err) { console.error("Fetch failed:", err); } 
        finally { setIsFetching(false); }
    };

    // Modal Handlers
    const openRulesetModal = () => setModalConfig({ title: "Ruleset Settings", content: "Determines how HP and Spec. Defense are calculated. (Global Room Setting)" });
    const openPainModal = () => setModalConfig({ title: "Pain Penalties", content: "Automatically applies -1 or -2 success penalties to rolls when at low HP. (Global Room Setting)" });
    
    const openAbilityModal = async () => {
        if (!id.ability) {
            setModalConfig({ title: "Ability", content: "No ability selected." });
            return;
        }
        setModalConfig({ title: "Ability", content: "Loading..." }); // Show loading state briefly
        const data = await fetchAbilityData(id.ability);
        if (data && data.Description) {
            setModalConfig({ title: id.ability, content: data.Description + (data.Effect ? `\n\n${data.Effect}` : '') });
        } else {
            setModalConfig({ title: "Ability", content: "Could not load ability data." });
        }
    };

    return (
        <div className="sheet-panel" style={{ marginBottom: '15px', background: 'var(--panel-bg)', paddingBottom: '0' }}>
            <div className="sheet-panel__header" style={{ textAlign: 'left', paddingLeft: '10px' }}>▼ CHARACTER IDENTITY</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px' }}>
                
                {/* ROW 1 */}
                <div className="flex-layout--row-center" style={{ gap: '6px' }}><span className="identity-grid__label" style={{ width: '80px' }}>Nickname</span><input type="text" className="identity-grid__input" style={{ flex: 1 }} value={id.nickname || ''} onChange={(e) => setIdentity('nickname', e.target.value)} /></div>
                <div className="flex-layout--row-center" style={{ gap: '6px' }}>
                    <span className="identity-grid__label" style={{ width: '80px' }}>Species</span>
                    <div style={{ display: 'flex', flex: 1, gap: '4px' }}>
                        <input type="text" list="species-datalist" className="identity-grid__input" style={{ flex: 1 }} placeholder="e.g. Aron" value={id.species || ''} onChange={(e) => setIdentity('species', e.target.value)} />
                        <datalist id="species-datalist">{speciesList.map(s => <option key={s} value={s} />)}</datalist>
                        <button className={`action-button ${isFetching ? 'action-button--disabled' : 'action-button--dark'}`} style={{ padding: '0 10px' }} onClick={handleFetch} disabled={isFetching}>{isFetching ? '...' : 'Fetch'}</button>
                    </div>
                </div>

                {/* ROW 2 */}
                <div className="flex-layout--row-center" style={{ gap: '6px' }}>
                    <span className="identity-grid__label" style={{ width: '80px' }}>Nature</span>
                    <select className="identity-grid__select" style={{ flex: 1 }} value={id.nature || ''} onChange={(e) => setIdentity('nature', e.target.value)}>
                        {NATURES.map(n => <option key={n} value={n}>{n || '-- Select --'}</option>)}
                    </select>
                </div>
                <div className="flex-layout--row-center" style={{ gap: '6px' }}><span className="identity-grid__label" style={{ width: '80px' }}>Rank</span><select className="identity-grid__select" style={{ flex: 1, fontWeight: 'bold' }} value={id.rank || 'Starter'} onChange={(e) => setIdentity('rank', e.target.value as Rank)}>{RANKS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>

                {/* ROW 3 */}
                <div className="flex-layout--row-center" style={{ gap: '6px' }}><span className="identity-grid__label" style={{ width: '80px' }}>Typing</span>
                    <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                        <select className="identity-grid__select" style={{ flex: 1, background: TYPE_COLORS[id.type1] || 'var(--panel-alt)', color: id.type1 ? 'white' : 'inherit', fontWeight: 'bold' }} value={id.type1 || ''} onChange={(e) => setIdentity('type1', e.target.value)}>{POKEMON_TYPES.map(t => <option key={`t1-${t}`} value={t}>{t || '--'}</option>)}</select>
                        <select className="identity-grid__select" style={{ flex: 1, background: TYPE_COLORS[id.type2] || 'var(--panel-alt)', color: id.type2 ? 'white' : 'inherit', fontWeight: 'bold' }} value={id.type2 || ''} onChange={(e) => setIdentity('type2', e.target.value)}>{POKEMON_TYPES.map(t => <option key={`t2-${t}`} value={t}>{t || '--'}</option>)}</select>
                    </div>
                </div>
                <div className="flex-layout--row-center" style={{ gap: '6px' }}>
                    <span className="identity-grid__label" style={{ width: '80px' }}>Ability <TooltipIcon onClick={openAbilityModal} /></span>
                    <select className="identity-grid__select" style={{ flex: 1 }} value={id.ability || ''} onChange={(e) => setIdentity('ability', e.target.value)}>
                        <option value="">-- Select --</option>
                        {Array.isArray(id.availableAbilities) && id.availableAbilities.length > 0 && (<optgroup label="Innate Abilities">{id.availableAbilities.map(ab => <option key={`in-${ab}`} value={ab}>{ab}</option>)}</optgroup>)}
                        <optgroup label="All Abilities">{allAbilitiesList.map(ab => <option key={`all-${ab}`} value={ab}>{ab}</option>)}</optgroup>
                    </select>
                </div>

                {/* ROW 4 */}
                <div className="flex-layout--row-center" style={{ gap: '6px' }}><span className="identity-grid__label identity-grid__label--blue" style={{ width: '80px' }}>Mode</span><select className="identity-grid__select" style={{ flex: 1 }} value={id.mode || 'Pokémon'} onChange={(e) => setIdentity('mode', e.target.value)}><option>Pokémon</option><option>Trainer</option></select></div>
                <div className="flex-layout--row-center" style={{ gap: '6px' }}>
                    <span className="identity-grid__label identity-grid__label--blue" style={{ width: '80px' }}>Age</span>
                    <input type="text" list="age-datalist" className="identity-grid__input" style={{ flex: 1 }} value={id.age || ''} onChange={(e) => setIdentity('age', e.target.value)} />
                    <datalist id="age-datalist">{AGES.map(a => <option key={a} value={a} />)}</datalist>
                </div>

                {/* ROW 5 */}
                <div className="flex-layout--row-center" style={{ gap: '6px' }}>
                    <span className="identity-grid__label identity-grid__label--blue" style={{ width: '80px' }}>Ruleset <TooltipIcon onClick={openRulesetModal} /></span>
                    <select className="identity-grid__select" style={{ flex: 1 }} value={id.ruleset || 'VIT = DEF/HP, INS = SPD'} onChange={(e) => setIdentity('ruleset', e.target.value)}>
                        <option value="VIT = DEF/HP, INS = SPD">VIT = DEF/HP, INS = SPD</option>
                        <option value="VIT = DEF/SPD/HP">VIT = DEF/SPD/HP</option>
                        <option value="VIT = DEF, INS = SPD; either VIT/INS used for HP">VIT = DEF, INS = SPD; either VIT/INS used for HP</option>
                    </select>
                </div>
                <div className="flex-layout--row-center" style={{ gap: '6px' }}>
                    <span className="identity-grid__label" style={{ width: '80px', background: '#F44336', color: 'white', border: 'none' }}>Pain <TooltipIcon onClick={openPainModal} /></span>
                    <select className="identity-grid__select" style={{ flex: 1 }} value={id.pain || 'Disabled'} onChange={(e) => setIdentity('pain', e.target.value)}><option>Disabled</option><option>Enabled</option></select>
                </div>

                {/* ROW 6 & 7 omitted for brevity - no changes needed there from last step! */}
                {/* Just keeping them here to ensure full file compilation */}
                <div className="flex-layout--row-center" style={{ gap: '6px' }}>
                    <span className="identity-grid__label" style={{ width: '80px', background: 'transparent', color: '#4CAF50', border: '1px solid #4CAF50' }}>Combat</span>
                    <input type="text" className="identity-grid__input" style={{ flex: 1 }} value={id.combat || ''} onChange={(e) => setIdentity('combat', e.target.value)} />
                </div>
                <div className="flex-layout--row-center" style={{ gap: '6px' }}>
                    <span className="identity-grid__label" style={{ width: '80px', background: 'transparent', color: '#4CAF50', border: '1px solid #4CAF50' }}>Social</span>
                    <input type="text" className="identity-grid__input" style={{ flex: 1 }} value={id.social || ''} onChange={(e) => setIdentity('social', e.target.value)} />
                </div>
                <div className="flex-layout--row-center" style={{ gap: '6px' }}>
                    <span className="identity-grid__label" style={{ width: '80px', background: 'transparent', color: '#4CAF50', border: '1px solid #4CAF50' }}>Hand</span>
                    <input type="text" className="identity-grid__input" style={{ flex: 1 }} value={id.hand || ''} onChange={(e) => setIdentity('hand', e.target.value)} />
                </div>
                <div className="flex-layout--row-center" style={{ gap: '6px' }}>
                    <span className="identity-grid__label" style={{ width: '80px' }}>Rolls</span>
                    <select className="identity-grid__select" style={{ flex: 1 }} value={id.rolls || 'Public (Everyone)'} onChange={(e) => setIdentity('rolls', e.target.value)}><option>Public (Everyone)</option><option>Private (GM)</option></select>
                </div>

            </div>

            {/* --- TOOLBAR --- */}
            <div style={{ display: 'flex', gap: '4px', padding: '0 10px 10px 10px' }}>
                <button className="action-button action-button--dark" style={{ flex: 1 }}>↻ Refresh</button>
                <button className="action-button" style={{ flex: 2, background: '#1976D2', color: 'white' }}>+ Custom Field</button>
                <button className="action-button action-button--dark" style={{ flex: 1 }}>💾</button>
                <button className="action-button action-button--dark" style={{ flex: 1 }}>📂</button>
                <button className="action-button action-button--dark" style={{ flex: 1 }} onClick={toggleTheme}>{isDark ? '☀️' : '🌙'}</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', borderTop: '1px solid var(--border)', padding: '6px', background: 'var(--panel-alt)', borderBottomLeftRadius: '6px', borderBottomRightRadius: '6px' }}>
                <input type="checkbox" defaultChecked />
                <span style={{ color: '#F44336', fontWeight: 'bold', fontSize: '0.85rem' }}>O Trackers</span>
                <span style={{ cursor: 'pointer' }}>⚙️</span>
            </div>

            {/* --- MODAL POPUP --- */}
            {modalConfig && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'var(--panel-bg)', padding: '20px', borderRadius: '6px', maxWidth: '400px', width: '90%', border: '2px solid #C62828', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ color: '#C62828', textAlign: 'center', marginTop: 0, fontSize: '1.2rem' }}>{modalConfig.title}</h3>
                        <hr style={{ borderTop: '1px solid var(--border)', marginBottom: '15px' }} />
                        <div style={{ color: 'var(--text-main)', fontSize: '0.95rem', whiteSpace: 'pre-wrap', marginBottom: '20px', lineHeight: '1.4' }}>
                            {modalConfig.content}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <button className="action-button action-button--dark" style={{ width: '100%', padding: '8px', fontSize: '1rem', fontWeight: 'bold' }} onClick={() => setModalConfig(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}