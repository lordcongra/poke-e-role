import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncUpstream } from './syncUpstream.js';
import { extractOverrides } from './extractOverrides.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPSTREAM_DIR = path.join(DATA_DIR, 'upstream');
const OVERRIDES_DIR = path.join(DATA_DIR, 'overrides');
const DATASET_DIR = path.join(ROOT_DIR, 'public', 'dataset');

const MOVES_DIR = path.join(DATASET_DIR, 'moves');
const ITEMS_DIR = path.join(DATASET_DIR, 'items');
const POKEDEX_DIR = path.join(DATASET_DIR, 'pokedex');
const ABILITIES_DIR = path.join(DATASET_DIR, 'abilities');
const NATURES_DIR = path.join(DATASET_DIR, 'natures');

const datasetIndex = {
    pokemon: {},
    abilities: {},
    natures: {},
    moves: {
        support: [],
        basic: { power_1: [], power_2: [], power_3: [] },
        highPower: { power_4: [], power_5: [], power_6: [], power_7: [], power_8: [], power_10: [], variable: [] },
        zMoves: [],
        maxMoves: []
    },
    items: {}
};

// Helper: Safely write JSON only if content has changed (avoids unnecessary disk I/O)
function safeWriteJson(destPath, data) {
    const content = JSON.stringify(data, null, 4);
    if (fs.existsSync(destPath)) {
        try {
            const existing = fs.readFileSync(destPath, 'utf-8');
            if (existing === content) {
                return false;
            }
        } catch {
            // Read failure, proceed to overwrite
        }
    }
    fs.writeFileSync(destPath, content);
    return true;
}

// Helper: Recursively get all JSON files in a directory
function getAllFiles(dirPath, arrayOfFiles = []) {
    if (!fs.existsSync(dirPath)) return arrayOfFiles;
    const files = fs.readdirSync(dirPath);
    files.forEach(function (file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, arrayOfFiles);
        } else if (file.endsWith('.json') && file !== 'index.json') {
            arrayOfFiles.push(fullPath);
        }
    });
    return arrayOfFiles;
}

// Helper: Load ignored files list
function getIgnoredFiles(category) {
    const ignoredConfigPath = path.join(OVERRIDES_DIR, 'ignored.json');
    if (!fs.existsSync(ignoredConfigPath)) return new Set();
    try {
        const config = JSON.parse(fs.readFileSync(ignoredConfigPath, 'utf-8'));
        const list = config[category] || [];
        return new Set(list.map((f) => f.toLowerCase()));
    } catch {
        return new Set();
    }
}

// Helper: Load base files and overlay overrides
function loadMergedDataset(upstreamFolder, overrideFolder) {
    const upstreamPath = path.join(UPSTREAM_DIR, upstreamFolder);
    const overridePath = path.join(OVERRIDES_DIR, overrideFolder);
    const ignoredSet = getIgnoredFiles(overrideFolder);

    const merged = new Map(); // key: filename, value: { data, isOverride }

    // 1. Load upstream base files
    if (fs.existsSync(upstreamPath)) {
        const files = getAllFiles(upstreamPath);
        for (const file of files) {
            const fileName = path.basename(file);
            if (ignoredSet.has(fileName.toLowerCase())) {
                continue; // Skip ignored/deleted upstream files
            }
            try {
                const raw = fs.readFileSync(file, 'utf-8');
                merged.set(fileName, { data: JSON.parse(raw), isOverride: false });
            } catch (err) {
                console.error(`❌ Error reading upstream file ${file}:`, err.message);
            }
        }
    }

    // 2. Overlay custom overrides
    let overrideCount = 0;
    if (fs.existsSync(overridePath)) {
        const files = getAllFiles(overridePath);
        for (const file of files) {
            const fileName = path.basename(file);
            if (fileName === 'ignored.json') continue;
            if (ignoredSet.has(fileName.toLowerCase())) continue;

            try {
                const raw = fs.readFileSync(file, 'utf-8');
                const data = JSON.parse(raw);
                if (data.deleted === true || data._deleted === true) {
                    // Explicit deletion via override file
                    merged.delete(fileName);
                } else {
                    merged.set(fileName, { data, isOverride: true });
                    overrideCount++;
                }
            } catch (err) {
                console.error(`❌ Error reading override file ${file}:`, err.message);
            }
        }
    }

    return { entries: Array.from(merged.entries()), overrideCount };
}

// --- WEIGHT CALCULATION HELPERS ---
function getMoveWeight(move, power) {
    const rawCategory = String(move.Category || move.category || '').toLowerCase();
    if (rawCategory.includes('status') || rawCategory.includes('support')) return 50; // Uncommon
    if (power <= 1) return 100; // Common
    if (power === 2) return 50; // Uncommon
    if (power === 3) return 20; // Rare
    if (power >= 4) return 5; // Very Rare
    return 20; // Default Rare
}

function getItemWeight(item, category) {
    const name = (item.Name || item.name || '').toLowerCase();
    if (name.includes('masterball') || name.includes('rare candy')) return 1;
    if (category === 'MegaStone' || category === 'ZCrystal') return 5;

    const priceStr = String(item.TrainerPrice || item.trainerPrice || '').toLowerCase();
    if (priceStr.includes('not for sale')) return 10;
    if (priceStr.includes('very rare')) return 5;
    if (priceStr.includes('rare')) return 20;
    if (priceStr.includes('uncommon')) return 50;
    if (priceStr.includes('common')) return 100;

    const priceNum = parseInt(priceStr.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(priceNum)) {
        if (priceNum <= 500) return 100; // Common
        if (priceNum <= 1500) return 50; // Uncommon
        if (priceNum <= 5000) return 20; // Rare
        return 5; // Very Rare
    }
    return 50; // Default Uncommon
}

async function build() {
    console.log('🚀 Building Pokerole Dataset (Base Upstream + Overrides)...');

    const args = process.argv.slice(2);
    const isClean = args.includes('--clean') || args.includes('--force');
    const skipExtract = args.includes('--no-extract');

    // 1. Ensure upstream data is available
    if (!fs.existsSync(UPSTREAM_DIR)) {
        console.log('📦 Upstream directory missing, syncing upstream now...');
        await syncUpstream();
    }

    // 2. Automatically extract and preserve any manual changes in public/dataset/ before rebuilding
    if (!skipExtract && fs.existsSync(DATASET_DIR)) {
        extractOverrides();
    }

    // 3. Ensure target output directories exist (or clean if --clean is explicitly passed)
    [MOVES_DIR, ITEMS_DIR, POKEDEX_DIR, ABILITIES_DIR, NATURES_DIR].forEach((dir) => {
        if (isClean && fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    // --- 1. PROCESS POKEDEX ---
    const pokedex = loadMergedDataset('Pokedex', 'pokedex');
    pokedex.entries.forEach(([fileName, { data }]) => {
        try {
            const cleanName = (data.Name || data.name || fileName.replace('.json', '')).toLowerCase();
            const destPath = path.join(POKEDEX_DIR, fileName);
            safeWriteJson(destPath, data);

            datasetIndex.pokemon[cleanName] = {
                name: data.Name || data.name || fileName.replace('.json', ''),
                path: `/dataset/pokedex/${fileName}`
            };
        } catch (error) {
            console.error(`❌ Error processing Pokedex ${fileName}:`, error.message);
        }
    });
    console.log(`✅ Pokedex built (${pokedex.entries.length} pokemon, ${pokedex.overrideCount} overrides applied)`);

    // --- 2. PROCESS ABILITIES ---
    const abilities = loadMergedDataset('Abilities', 'abilities');
    abilities.entries.forEach(([fileName, { data }]) => {
        try {
            const cleanName = (data.Name || data.name || fileName.replace('.json', '')).toLowerCase();
            const destPath = path.join(ABILITIES_DIR, fileName);
            safeWriteJson(destPath, data);

            datasetIndex.abilities[cleanName] = {
                name: data.Name || data.name || fileName.replace('.json', ''),
                path: `/dataset/abilities/${fileName}`
            };
        } catch (error) {
            console.error(`❌ Error processing Ability ${fileName}:`, error.message);
        }
    });
    console.log(
        `✅ Abilities built (${abilities.entries.length} abilities, ${abilities.overrideCount} overrides applied)`
    );

    // --- 3. PROCESS NATURES ---
    const natures = loadMergedDataset('Natures', 'natures');
    natures.entries.forEach(([fileName, { data }]) => {
        try {
            const cleanName = (data.Name || data.name || fileName.replace('.json', '')).toLowerCase();
            const destPath = path.join(NATURES_DIR, fileName);
            safeWriteJson(destPath, data);

            datasetIndex.natures[cleanName] = {
                name: data.Name || data.name || fileName.replace('.json', ''),
                path: `/dataset/natures/${fileName}`
            };
        } catch (error) {
            console.error(`❌ Error processing Nature ${fileName}:`, error.message);
        }
    });
    console.log(`✅ Natures built (${natures.entries.length} natures, ${natures.overrideCount} overrides applied)`);

    // --- 4. PROCESS & REORGANIZE MOVES ---
    const moves = loadMergedDataset('Moves', 'moves');
    moves.entries.forEach(([fileName, { data: move }]) => {
        try {
            const powerNum = Number(move.Power || move.power) || 0;
            const rawCategory = String(move.Category || move.category || '').toLowerCase();
            const dmg1 = String(move.Damage1 || move.damage1 || '').toLowerCase();
            const attrs = move.Attributes || move.attributes || {};
            const isZMove = Boolean(attrs.ZMove || attrs.zMove);
            const isMaxMove = Boolean(
                attrs.MaxMove ||
                attrs.maxMove ||
                attrs.Dynamax ||
                attrs.Gigantamax ||
                String(move.Name || '').startsWith('Max ') ||
                String(move.Name || '').startsWith('G-Max ')
            );

            let targetSubfolder = '';
            let indexRef = null;

            // STRICT DATA-DRIVEN CATEGORIZATION
            if (isZMove) {
                targetSubfolder = 'zMoves';
                indexRef = datasetIndex.moves.zMoves;
            } else if (isMaxMove) {
                targetSubfolder = 'maxMoves';
                indexRef = datasetIndex.moves.maxMoves;
            } else if (
                rawCategory.includes('status') ||
                rawCategory.includes('support') ||
                rawCategory.includes('sup')
            ) {
                targetSubfolder = 'support';
                indexRef = datasetIndex.moves.support;
            } else if (dmg1.includes('varies') || powerNum === 0) {
                targetSubfolder = 'highPower/variable';
                if (!datasetIndex.moves.highPower.variable) datasetIndex.moves.highPower.variable = [];
                indexRef = datasetIndex.moves.highPower.variable;
            } else if (powerNum >= 1 && powerNum <= 3) {
                targetSubfolder = `basic/power_${powerNum}`;
                const powKey = `power_${powerNum}`;
                if (!datasetIndex.moves.basic[powKey]) datasetIndex.moves.basic[powKey] = [];
                indexRef = datasetIndex.moves.basic[powKey];
            } else {
                targetSubfolder = `highPower/power_${powerNum}`;
                const powKey = `power_${powerNum}`;
                if (!datasetIndex.moves.highPower[powKey]) datasetIndex.moves.highPower[powKey] = [];
                indexRef = datasetIndex.moves.highPower[powKey];
            }

            // Target directory in public/dataset/moves/
            const targetDir = path.join(MOVES_DIR, ...targetSubfolder.split('/'));
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const destPath = path.join(targetDir, fileName);
            safeWriteJson(destPath, move);

            // ADD TO INDEX
            if (indexRef) {
                indexRef.push({
                    name: move.Name || move.name || fileName.replace('.json', ''),
                    type: move.Type || move.type,
                    path: `/dataset/moves/${targetSubfolder}/${fileName}`,
                    weight: getMoveWeight(move, powerNum)
                });
            }
        } catch (error) {
            console.error(`❌ Error processing move ${fileName}:`, error.message);
        }
    });

    // Sort move arrays
    const sortByName = (a, b) => a.name.localeCompare(b.name);
    datasetIndex.moves.support.sort(sortByName);
    datasetIndex.moves.zMoves.sort(sortByName);
    datasetIndex.moves.maxMoves.sort(sortByName);
    Object.keys(datasetIndex.moves.basic).forEach((k) => datasetIndex.moves.basic[k].sort(sortByName));
    Object.keys(datasetIndex.moves.highPower).forEach((k) => datasetIndex.moves.highPower[k].sort(sortByName));
    console.log(`✅ Moves built (${moves.entries.length} moves, ${moves.overrideCount} overrides applied)`);

    // --- 5. PROCESS ITEMS ---
    const items = loadMergedDataset('Items', 'items');
    items.entries.forEach(([fileName, { data: item }]) => {
        try {
            let pocket = (item.Pocket || item.pocket || 'Uncategorized').replace(/[^a-zA-Z0-9_-]/g, '');
            let category = (item.Category || item.category || 'Misc').replace(/[^a-zA-Z0-9_-]/g, '');
            if (pocket === 'HeldItems' && category === 'Misc') category = 'BattleItem';

            if (!datasetIndex.items[pocket]) datasetIndex.items[pocket] = {};
            if (!datasetIndex.items[pocket][category]) datasetIndex.items[pocket][category] = [];

            const targetDir = path.join(ITEMS_DIR, pocket, category);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const destPath = path.join(targetDir, fileName);
            safeWriteJson(destPath, item);

            datasetIndex.items[pocket][category].push({
                name: item.Name || item.name || fileName.replace('.json', ''),
                path: `/dataset/items/${pocket}/${category}/${fileName}`,
                pmd: item.PMD || item.pmd || false,
                weight: getItemWeight(item, category)
            });
        } catch (error) {
            console.error(`❌ Error processing item ${fileName}:`, error.message);
        }
    });

    // Sort item arrays
    Object.keys(datasetIndex.items).forEach((pocket) => {
        Object.keys(datasetIndex.items[pocket]).forEach((category) => {
            datasetIndex.items[pocket][category].sort(sortByName);
        });
    });
    console.log(`✅ Items built (${items.entries.length} items, ${items.overrideCount} overrides applied)`);

    // --- 6. WRITE INDEX FILE ---
    safeWriteJson(path.join(DATASET_DIR, 'index.json'), datasetIndex);
    console.log('🎉 Dataset build complete! Output written to public/dataset/');
}

// Run directly
build().catch((err) => {
    console.error('❌ Dataset build failed:', err);
    process.exit(1);
});
