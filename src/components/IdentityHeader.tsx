import { useState, useEffect, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';
import type { Rank } from '../store/storeTypes';
import {
    fetchPokemonData,
    fetchAbilityData,
    loadGithubTree,
    ALL_ABILITIES,
    SPECIES_URLS,
    fetchMoveData
} from '../utils/api';
import { HomebrewModal } from './HomebrewModal';
import { GeneratorModal } from './GeneratorModal';
import { TrackerSettingsModal } from './TrackerSettingsModal';
import { RulesModal } from './RulesModal';
import { SpeciesChangeModal } from './SpeciesChangeModal';
import { saveToOwlbear } from '../utils/obr';
import { POKEMON_TYPES, TYPE_COLORS, NATURES, AGES } from '../data/constants';

const RANKS: Rank[] = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master', 'Champion'];

const TooltipIcon = ({ onClick }: { onClick: () => void }) => (
    <span
        onClick={onClick}
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#555',
            color: 'white',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            fontSize: '11px',
            cursor: 'pointer',
            marginLeft: '6px',
            fontWeight: 'bold'
        }}
    >
        ?
    </span>
);

export function IdentityHeader() {
    const id = useCharacterStore((state) => state.identity) || {};
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const setMode = useCharacterStore((state) => state.setMode);
    const toggleForm = useCharacterStore((state) => state.toggleForm);

    const refreshSpeciesData = useCharacterStore((state) => state.refreshSpeciesData);

    const customInfo = useCharacterStore((state) => state.customInfo);
    const addCustomInfo = useCharacterStore((state) => state.addCustomInfo);
    const updateCustomInfo = useCharacterStore((state) => state.updateCustomInfo);
    const removeCustomInfo = useCharacterStore((state) => state.removeCustomInfo);

    const role = useCharacterStore((state) => state.role);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const roomCustomAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const roomCustomPokemon = useCharacterStore((state) => state.roomCustomPokemon);

    const filteredTypes = roomCustomTypes.filter((t) => role === 'GM' || !t.gmOnly);
    const filteredAbilities = roomCustomAbilities.filter((a) => role === 'GM' || !a.gmOnly);
    const filteredPokemon = roomCustomPokemon.filter((p) => role === 'GM' || !p.gmOnly);

    const allTypes = [...POKEMON_TYPES, ...filteredTypes.map((t) => t.name)];
    const allTypeColors = { ...TYPE_COLORS, ...Object.fromEntries(filteredTypes.map((t) => [t.name, t.color])) };

    const access = id.homebrewAccess || 'Full';
    const canViewHomebrew = role === 'GM' || access !== 'None';

    const [isFetching, setIsFetching] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [allAbilitiesList, setAllAbilitiesList] = useState<string[]>([]);
    const [speciesList, setSpeciesList] = useState<string[]>([]);
    const [isDark, setIsDark] = useState(false);

    const [modalConfig, setModalConfig] = useState<{ title: string; content: string | React.ReactNode } | null>(null);
    const [showHomebrewModal, setShowHomebrewModal] = useState(false);
    const [showGeneratorModal, setShowGeneratorModal] = useState(false);
    const [showTrackerSettings, setShowTrackerSettings] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);

    const [deleteCustomInfoId, setDeleteCustomInfoId] = useState<string | null>(null);
    const [pendingSpeciesData, setPendingSpeciesData] = useState<Record<string, unknown> | null>(null);
    const [importData, setImportData] = useState<Record<string, unknown> | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const savedTheme = localStorage.getItem('pokerole-theme');
        if (savedTheme === 'dark') {
            setIsDark(true);
            document.body.classList.add('dark-mode');
            document.body.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        loadGithubTree()
            .then(() => {
                setAllAbilitiesList([...ALL_ABILITIES]);
                const formattedSpecies = Object.keys(SPECIES_URLS).map((s) =>
                    s
                        .split('-')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join('-')
                );
                setSpeciesList(formattedSpecies.sort());
            })
            .catch((err) => console.error('Failed to load GitHub tree:', err));
    }, []);

    const toggleTheme = () => {
        const newIsDark = !isDark;
        setIsDark(newIsDark);
        if (newIsDark) {
            document.body.classList.add('dark-mode');
            document.body.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('pokerole-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.body.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('pokerole-theme', 'light');
        }
    };

    const handleFetch = async () => {
        if (!id.species || id.mode === 'Trainer') return;
        setIsFetching(true);
        try {
            const data = await fetchPokemonData(id.species);
            if (data) {
                const store = useCharacterStore.getState();
                const hasSkills = Object.values(store.skills).some((sk) => sk.base > 0 || sk.buff > 0);
                const hasMoves = store.moves.length > 0;

                if (hasSkills || hasMoves) {
                    setPendingSpeciesData(data as Record<string, unknown>);
                } else {
                    store.applySpeciesData(data as Record<string, unknown>, true, true);
                }
            }
        } catch (err) {
            console.error('Fetch failed:', err);
        } finally {
            setIsFetching(false);
        }
    };

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await loadGithubTree();
            const store = useCharacterStore.getState();

            for (const move of store.moves) {
                if (move.name) {
                    const data = await fetchMoveData(move.name);
                    if (data) store.applyMoveData(move.id, data as Record<string, unknown>);
                }
            }

            if (id.species && id.mode === 'Pokémon') {
                const data = await fetchPokemonData(id.species);
                if (data) refreshSpeciesData(data as Record<string, unknown>);
            }

            if (id.ability) {
                const abilityData = await fetchAbilityData(id.ability);
                if (abilityData && (abilityData.Description || abilityData.Effect)) {
                    console.log('Ability data validated.');
                }
            }
        } catch (e) {
            console.error('Refresh failed', e);
        } finally {
            setTimeout(() => setIsRefreshing(false), 1500);
        }
    };

    const handleExport = () => {
        const state = useCharacterStore.getState();
        const exportData = {
            identity: state.identity,
            health: state.health,
            will: state.will,
            derived: state.derived,
            extras: state.extras,
            stats: state.stats,
            socials: state.socials,
            skills: state.skills,
            moves: state.moves,
            skillChecks: state.skillChecks,
            inventory: state.inventory,
            notes: state.notes,
            customInfo: state.customInfo,
            tp: state.tp,
            currency: state.currency,
            statuses: state.statuses,
            effects: state.effects,
            trackers: state.trackers
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const name = id.nickname || id.species || 'character';
        a.href = url;
        a.download = `${name.replace(/\s+/g, '_')}_pokerole.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target?.result as string);
                setImportData(imported);
            } catch (err) {
                if (OBR.isAvailable) OBR.notification.show('Invalid JSON file.', 'ERROR');
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const confirmImport = () => {
        if (!importData) return;
        const store = useCharacterStore.getState();
        if (importData['moves-data'] !== undefined) {
            store.loadFromOwlbear(importData);
            saveToOwlbear(importData);
        } else {
            useCharacterStore.setState(importData);
        }
        setImportData(null);
    };

    const openAbilityModal = async () => {
        if (!id.ability) {
            setModalConfig({ title: 'Ability', content: 'No ability selected.' });
            return;
        }
        setModalConfig({ title: 'Ability', content: 'Loading...' });
        const data = await fetchAbilityData(id.ability);

        if (data && (data.Description || data.Effect)) {
            const content = [data.Description, data.Effect].filter(Boolean).join('\n\n');
            setModalConfig({ title: id.ability, content });
        } else setModalConfig({ title: 'Ability', content: 'Could not load ability data.' });
    };

    const uniqueSpecies = Array.from(new Set([...speciesList, ...filteredPokemon.map((p) => p.Name)]));
    const uniqueAbilities = Array.from(
        new Set([...(id.availableAbilities || []), ...allAbilitiesList, ...filteredAbilities.map((ab) => ab.name)])
    );

    return (
        <div
            className="sheet-panel"
            style={{ marginBottom: '15px', background: 'var(--panel-bg)', paddingBottom: '0' }}
        >
            <div className="sheet-panel__header" style={{ textAlign: 'left', paddingLeft: '10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        type="button"
                        className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        ▼
                    </button>
                    CHARACTER IDENTITY
                </span>
            </div>

            {!isCollapsed && (
                <div className="panel-content-wrapper">
                    <div className="identity-grid" style={{ padding: '10px' }}>
                        <div className="identity-grid__row">
                            <span className="identity-grid__label">Nickname</span>
                            <input
                                type="text"
                                className="identity-grid__input"
                                value={id.nickname || ''}
                                onChange={(e) => setIdentity('nickname', e.target.value)}
                            />
                        </div>

                        <div className="identity-grid__row">
                            <span className="identity-grid__label">
                                {id.mode === 'Trainer' ? 'Concept' : 'Species'}
                            </span>
                            <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '4px' }}>
                                <input
                                    type="text"
                                    list="species-datalist"
                                    className="identity-grid__input"
                                    style={{ flex: 1, minWidth: 0 }}
                                    placeholder={id.mode === 'Trainer' ? 'e.g. Bug Catcher' : 'e.g. Aron'}
                                    value={id.species || ''}
                                    onChange={(e) => setIdentity('species', e.target.value)}
                                    onBlur={handleFetch}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleFetch();
                                    }}
                                />
                                <datalist id="species-datalist">
                                    {uniqueSpecies.map((s) => (
                                        <option key={s} value={s} />
                                    ))}
                                </datalist>
                                {isFetching && <span style={{ fontSize: '0.8rem' }}>⏳</span>}

                                {id.mode === 'Pokémon' && (
                                    <>
                                        <button
                                            type="button"
                                            className="action-button action-button--dark"
                                            style={{
                                                padding: '2px 6px',
                                                fontSize: '0.8rem',
                                                borderRadius: '4px',
                                                margin: '0 2px'
                                            }}
                                            onClick={() => {
                                                if (!id.species) {
                                                    if (OBR.isAvailable)
                                                        OBR.notification.show(
                                                            '⚠️ Please select a Species first!',
                                                            'WARNING'
                                                        );
                                                    return;
                                                }
                                                setShowGeneratorModal(true);
                                            }}
                                            title="Auto-Build Pokémon"
                                        >
                                            🎲
                                        </button>
                                        <button
                                            type="button"
                                            className="action-button action-button--dark"
                                            style={{
                                                padding: '2px 6px',
                                                fontSize: '0.8rem',
                                                borderRadius: '4px',
                                                background: id.isAltForm ? '#00695C' : '#555',
                                                borderColor: id.isAltForm ? '#00695C' : '#555'
                                            }}
                                            onClick={toggleForm}
                                            title={
                                                id.isAltForm ? 'Swap to Base Form' : 'Swap to Alt Form / Mega Evolution'
                                            }
                                        >
                                            🧬
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="identity-grid__row">
                            <span className="identity-grid__label">Nature</span>
                            <select
                                className="identity-grid__select"
                                value={id.nature || ''}
                                onChange={(e) => setIdentity('nature', e.target.value)}
                            >
                                {NATURES.map((n) => (
                                    <option key={n} value={n}>
                                        {n || '-- Select --'}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="identity-grid__row">
                            <span className="identity-grid__label">Rank</span>
                            <select
                                className="identity-grid__select"
                                value={id.rank || 'Starter'}
                                onChange={(e) => setIdentity('rank', e.target.value as Rank)}
                            >
                                {RANKS.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="identity-grid__row">
                            <span className="identity-grid__label">Typing</span>
                            <div style={{ display: 'flex', width: '100%', gap: '4px' }}>
                                <select
                                    className="identity-grid__select"
                                    style={{
                                        flex: 1,
                                        background: allTypeColors[id.type1] || 'var(--panel-alt)',
                                        color: id.type1 ? 'white' : 'inherit',
                                        fontWeight: 'bold'
                                    }}
                                    value={id.type1 || ''}
                                    onChange={(e) => setIdentity('type1', e.target.value)}
                                >
                                    {allTypes.map((t) => (
                                        <option key={`t1-${t}`} value={t}>
                                            {t || '--'}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    className="identity-grid__select"
                                    style={{
                                        flex: 1,
                                        background: allTypeColors[id.type2] || 'var(--panel-alt)',
                                        color: id.type2 && id.type2 !== 'None' ? 'white' : 'inherit',
                                        fontWeight: 'bold'
                                    }}
                                    value={id.type2 || ''}
                                    onChange={(e) => setIdentity('type2', e.target.value)}
                                >
                                    {allTypes.map((t) => (
                                        <option key={`t2-${t}`} value={t}>
                                            {t || '--'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="identity-grid__row">
                            <span className="identity-grid__label">
                                Ability <TooltipIcon onClick={openAbilityModal} />
                            </span>
                            <input
                                type="text"
                                list="ability-datalist"
                                className="identity-grid__input"
                                value={id.ability || ''}
                                onChange={(e) => setIdentity('ability', e.target.value)}
                                placeholder="Type or select..."
                            />
                            <datalist id="ability-datalist">
                                {uniqueAbilities.map((ab) => (
                                    <option key={ab} value={ab} />
                                ))}
                            </datalist>
                        </div>

                        <div className="identity-grid__row">
                            <span className="identity-grid__label identity-grid__label--blue">Mode</span>
                            <select
                                className="identity-grid__select"
                                value={id.mode || 'Pokémon'}
                                onChange={(e) => setMode(e.target.value as 'Pokémon' | 'Trainer')}
                            >
                                <option value="Pokémon">Pokémon</option>
                                <option value="Trainer">Trainer</option>
                            </select>
                        </div>

                        <div className="identity-grid__row" style={{ padding: '2px 0 2px 4px' }}>
                            <span className="identity-grid__label identity-grid__label--blue">Age</span>
                            <select
                                className="identity-grid__select"
                                value={id.age || '--'}
                                onChange={(e) => setIdentity('age', e.target.value)}
                                style={{ flex: 0.6, minWidth: 0, padding: '2px' }}
                            >
                                {AGES.map((a) => (
                                    <option key={a} value={a}>
                                        {a}
                                    </option>
                                ))}
                            </select>
                            <span
                                className="identity-grid__label identity-grid__label--blue"
                                style={{ marginLeft: '4px' }}
                            >
                                Gender
                            </span>
                            <input
                                type="text"
                                className="identity-grid__input"
                                value={id.gender || ''}
                                onChange={(e) => setIdentity('gender', e.target.value)}
                                style={{ flex: 1, minWidth: 0, padding: '2px 4px' }}
                                placeholder="..."
                            />
                        </div>

                        <div className="identity-grid__row">
                            <span className="identity-grid__label identity-grid__label--green">Combat</span>
                            <input
                                type="text"
                                className="identity-grid__input"
                                value={id.combat || ''}
                                onChange={(e) => setIdentity('combat', e.target.value)}
                            />
                        </div>
                        <div className="identity-grid__row">
                            <span className="identity-grid__label identity-grid__label--green">Social</span>
                            <input
                                type="text"
                                className="identity-grid__input"
                                value={id.social || ''}
                                onChange={(e) => setIdentity('social', e.target.value)}
                            />
                        </div>
                        <div className="identity-grid__row">
                            <span className="identity-grid__label identity-grid__label--green">Hand</span>
                            <input
                                type="text"
                                className="identity-grid__input"
                                value={id.hand || ''}
                                onChange={(e) => setIdentity('hand', e.target.value)}
                            />
                        </div>
                        <div className="identity-grid__row">
                            <span className="identity-grid__label">Rolls</span>
                            <select
                                className="identity-grid__select"
                                value={id.rolls || 'Public (Everyone)'}
                                onChange={(e) => setIdentity('rolls', e.target.value)}
                            >
                                <option>Public (Everyone)</option>
                                <option>Private (GM)</option>
                            </select>
                        </div>

                        {customInfo.map((info) => (
                            <div
                                key={info.id}
                                className="identity-grid__row"
                                style={{
                                    display: 'flex',
                                    gap: '6px',
                                    background: 'var(--row-odd)',
                                    border: '1px solid var(--border)',
                                    padding: '2px 4px',
                                    borderRadius: '4px'
                                }}
                            >
                                <input
                                    type="text"
                                    value={info.label}
                                    onChange={(e) => updateCustomInfo(info.id, 'label', e.target.value)}
                                    placeholder="Label"
                                    style={{
                                        width: '70px',
                                        border: 'none',
                                        background: 'transparent',
                                        outline: 'none',
                                        fontWeight: 'bold',
                                        color: 'var(--text-muted)'
                                    }}
                                />
                                <input
                                    type="text"
                                    value={info.value}
                                    onChange={(e) => updateCustomInfo(info.id, 'value', e.target.value)}
                                    placeholder="Value"
                                    style={{
                                        flex: 1,
                                        border: 'none',
                                        background: 'transparent',
                                        outline: 'none',
                                        color: 'var(--text-main)',
                                        minWidth: 0
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setDeleteCustomInfoId(info.id)}
                                    className="action-button action-button--red"
                                    style={{ padding: '0 6px', height: '22px', flexShrink: 0 }}
                                >
                                    X
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '0 10px 10px 10px' }}>
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="action-button action-button--dark"
                            style={{ flex: '1 1 25%', minWidth: '100px', fontSize: '0.85rem' }}
                            title="Refresh Data"
                        >
                            {isRefreshing ? '⏳ Refreshing...' : '↻ Refresh'}
                        </button>

                        {canViewHomebrew && (
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                style={{
                                    flex: '1 1 25%',
                                    minWidth: '100px',
                                    background: '#00695C',
                                    borderColor: '#00695C',
                                    fontSize: '0.85rem'
                                }}
                                onClick={() => setShowHomebrewModal(true)}
                            >
                                🛠️ Homebrew
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={addCustomInfo}
                            className="action-button"
                            style={{
                                flex: '1 1 25%',
                                minWidth: '100px',
                                background: '#1976D2',
                                color: 'white',
                                fontSize: '0.85rem'
                            }}
                            title="Add Custom Field"
                        >
                            ➕ Custom Field
                        </button>

                        <button
                            type="button"
                            onClick={handleExport}
                            className="action-button action-button--dark"
                            style={{ flex: '1 1 5%', minWidth: '35px', fontSize: '0.85rem' }}
                            title="Export Character (Download)"
                        >
                            💾
                        </button>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="action-button action-button--dark"
                            style={{ flex: '1 1 5%', minWidth: '35px', fontSize: '0.85rem' }}
                            title="Import Character (Upload)"
                        >
                            📂
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImport}
                            style={{ display: 'none' }}
                            accept=".json"
                        />

                        <button
                            type="button"
                            className="action-button action-button--dark"
                            style={{ flex: '1 1 5%', minWidth: '35px', fontSize: '0.85rem' }}
                            onClick={toggleTheme}
                            title="Toggle Dark Mode"
                        >
                            {isDark ? '☀️' : '🌙'}
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', padding: '0 10px 10px 10px' }}>
                        <div
                            style={{
                                flex: 1,
                                background: '#1976d2',
                                border: '1px solid rgba(0,0,0,0.2)',
                                padding: '4px',
                                borderRadius: '4px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <label
                                style={{
                                    flex: 1,
                                    height: '100%',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textShadow: '1px 1px 1px rgba(0,0,0,0.5)'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={id.showTrackers ?? true}
                                    onChange={(e) => setIdentity('showTrackers', e.target.checked)}
                                    style={{ cursor: 'pointer', marginRight: '4px' }}
                                />{' '}
                                ⭕ Trackers
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowTrackerSettings(true)}
                                className="action-button"
                                style={{
                                    margin: 0,
                                    padding: '2px 4px',
                                    fontSize: '0.7rem',
                                    background: 'rgba(0,0,0,0.2)',
                                    color: 'white',
                                    border: 'none'
                                }}
                            >
                                ⚙️
                            </button>
                        </div>

                        {role === 'GM' && (
                            <div
                                style={{
                                    flex: 1,
                                    background: '#E65100',
                                    border: '1px solid rgba(0,0,0,0.2)',
                                    padding: '4px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setShowRulesModal(true)}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        textShadow: '1px 1px 1px rgba(0,0,0,0.5)'
                                    }}
                                >
                                    📜 Rules
                                </button>
                            </div>
                        )}

                        <div
                            style={{
                                display: role === 'GM' ? 'block' : 'none',
                                flex: 1,
                                background: 'var(--primary)',
                                border: '1px solid rgba(0,0,0,0.2)',
                                padding: '4px',
                                borderRadius: '4px',
                                textAlign: 'center'
                            }}
                        >
                            <label
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textShadow: '1px 1px 1px rgba(0,0,0,0.5)'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={id.isNPC}
                                    onChange={(e) => setIdentity('isNPC', e.target.checked)}
                                    style={{ cursor: 'pointer', marginRight: '4px' }}
                                />{' '}
                                🔒 NPC
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {showHomebrewModal && <HomebrewModal onClose={() => setShowHomebrewModal(false)} />}
            {showGeneratorModal && <GeneratorModal onClose={() => setShowGeneratorModal(false)} />}
            {showTrackerSettings && <TrackerSettingsModal onClose={() => setShowTrackerSettings(false)} />}
            {showRulesModal && <RulesModal onClose={() => setShowRulesModal(false)} />}

            {importData && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        zIndex: 1200,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <div
                        style={{
                            background: 'var(--panel-bg)',
                            padding: '20px',
                            borderRadius: '6px',
                            maxWidth: '300px',
                            width: '90%',
                            border: '2px solid #C62828',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                            textAlign: 'center'
                        }}
                    >
                        <h3 style={{ color: '#C62828', marginTop: 0, fontSize: '1.1rem' }}>⚠️ Confirm Import</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '20px' }}>
                            Import character data? This will completely overwrite the current token.
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                style={{ flex: 1, padding: '6px' }}
                                onClick={() => setImportData(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red"
                                style={{ flex: 1, padding: '6px' }}
                                onClick={confirmImport}
                            >
                                Import
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pendingSpeciesData && (
                <SpeciesChangeModal
                    pendingSpeciesData={pendingSpeciesData}
                    onClose={() => setPendingSpeciesData(null)}
                />
            )}

            {modalConfig && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        zIndex: 1300,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <div
                        style={{
                            background: 'var(--panel-bg)',
                            padding: '20px',
                            borderRadius: '6px',
                            maxWidth: '400px',
                            width: '90%',
                            border: '2px solid #C62828',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                        }}
                    >
                        <h3 style={{ color: '#C62828', textAlign: 'center', marginTop: 0, fontSize: '1.2rem' }}>
                            {modalConfig.title}
                        </h3>
                        <hr style={{ borderTop: '1px solid var(--border)', marginBottom: '15px' }} />
                        <div
                            style={{
                                color: 'var(--text-main)',
                                fontSize: '0.95rem',
                                whiteSpace: 'pre-wrap',
                                marginBottom: '20px',
                                lineHeight: '1.4'
                            }}
                        >
                            {modalConfig.content}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <button
                                className="action-button action-button--dark"
                                style={{ width: '100%', padding: '8px', fontSize: '1rem', fontWeight: 'bold' }}
                                onClick={() => setModalConfig(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteCustomInfoId && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        zIndex: 1200,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <div
                        style={{
                            background: 'var(--panel-bg)',
                            padding: '20px',
                            borderRadius: '6px',
                            maxWidth: '300px',
                            width: '90%',
                            border: '2px solid #C62828',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                            textAlign: 'center'
                        }}
                    >
                        <h3 style={{ color: '#C62828', marginTop: 0, fontSize: '1.1rem' }}>⚠️ Confirm Deletion</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '20px' }}>
                            Are you sure you want to delete this Custom Field?
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                style={{ flex: 1, padding: '6px' }}
                                onClick={() => setDeleteCustomInfoId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red"
                                style={{ flex: 1, padding: '6px' }}
                                onClick={() => {
                                    removeCustomInfo(deleteCustomInfoId);
                                    setDeleteCustomInfoId(null);
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
