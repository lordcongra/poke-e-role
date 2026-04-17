import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
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
        highPower: { power_4: [], power_5: [], power_6: [], power_7: [], power_8: [], power_10: [], variable: [] }
    },
    items: {}
};

console.log('🚀 Generating Index & Reorganizing Files...');

// --- WEIGHT CALCULATION HELPERS ---
function getMoveWeight(move, power) {
    const rawCategory = String(move.Category || '').toLowerCase();
    if (rawCategory.includes('status') || rawCategory.includes('support')) return 50; // Uncommon
    if (power <= 1) return 100; // Common
    if (power === 2) return 50; // Uncommon
    if (power === 3) return 20; // Rare
    if (power >= 4) return 5; // Very Rare
    return 20; // Default Rare
}

function getItemWeight(item, category) {
    const name = (item.Name || '').toLowerCase();
    if (name.includes('masterball') || name.includes('rare candy')) return 1;
    if (category === 'MegaStone' || category === 'ZCrystal') return 5;

    const priceStr = String(item.TrainerPrice || '').toLowerCase();
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

// Helper to recursively get all JSON files
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function (file) {
        if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
            arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
        } else if (file.endsWith('.json')) {
            arrayOfFiles.push(path.join(dirPath, file));
        }
    });
    return arrayOfFiles;
}

// --- 1. PROCESS POKEDEX ---
if (fs.existsSync(POKEDEX_DIR)) {
    const files = getAllFiles(POKEDEX_DIR);
    files.forEach((filePath) => {
        try {
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(rawData);
            const fileName = path.basename(filePath);
            const cleanName = (data.Name || fileName.replace('.json', '')).toLowerCase();
            datasetIndex.pokemon[cleanName] = {
                name: data.Name || fileName.replace('.json', ''),
                path: `/dataset/pokedex/${fileName}`
            };
        } catch (e) {}
    });
    console.log('✅ Pokedex indexed!');
}

// --- 2. PROCESS ABILITIES ---
if (fs.existsSync(ABILITIES_DIR)) {
    const files = getAllFiles(ABILITIES_DIR);
    files.forEach((filePath) => {
        try {
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(rawData);
            const fileName = path.basename(filePath);
            const cleanName = (data.Name || fileName.replace('.json', '')).toLowerCase();
            datasetIndex.abilities[cleanName] = {
                name: data.Name || fileName.replace('.json', ''),
                path: `/dataset/abilities/${fileName}`
            };
        } catch (e) {}
    });
    console.log('✅ Abilities indexed!');
}

// --- 3. PROCESS NATURES ---
if (fs.existsSync(NATURES_DIR)) {
    const files = getAllFiles(NATURES_DIR);
    files.forEach((filePath) => {
        try {
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(rawData);
            const fileName = path.basename(filePath);
            const cleanName = (data.Name || fileName.replace('.json', '')).toLowerCase();
            datasetIndex.natures[cleanName] = {
                name: data.Name || fileName.replace('.json', ''),
                path: `/dataset/natures/${fileName}`
            };
        } catch (e) {}
    });
    console.log('✅ Natures indexed!');
}

// --- 4. PROCESS & REORGANIZE MOVES ---
if (fs.existsSync(MOVES_DIR)) {
    const moveFiles = getAllFiles(MOVES_DIR);
    moveFiles.forEach((filePath) => {
        try {
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const move = JSON.parse(rawData);
            const fileName = path.basename(filePath);

            const powerNum = Number(move.Power) || 0;
            const rawCategory = String(move.Category || '').toLowerCase();
            const dmg1 = String(move.Damage1 || '').toLowerCase();

            let targetSubfolder = '';
            let indexRef = null;

            // STRICT DATA-DRIVEN CATEGORIZATION
            if (rawCategory.includes('status') || rawCategory.includes('support') || rawCategory.includes('sup')) {
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

            // PHYSICALLY REORGANIZE THE FILE IF IN WRONG FOLDER
            const targetDir = path.join(MOVES_DIR, ...targetSubfolder.split('/'));
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const newFilePath = path.join(targetDir, fileName);
            if (filePath !== newFilePath) {
                fs.renameSync(filePath, newFilePath);
                console.log(`📦 Moved ${fileName} to ${targetSubfolder}`);
            }

            // ADD TO INDEX
            if (indexRef) {
                indexRef.push({
                    name: move.Name,
                    type: move.Type,
                    path: `/dataset/moves/${targetSubfolder}/${fileName}`,
                    weight: getMoveWeight(move, powerNum)
                });
            }
        } catch (error) {
            console.error(`❌ Error processing move ${filePath}:`, error.message);
        }
    });
    console.log('✅ Moves indexed and reorganized!');
}

// --- 5. PROCESS ITEMS ---
if (fs.existsSync(ITEMS_DIR)) {
    const itemFiles = getAllFiles(ITEMS_DIR);
    itemFiles.forEach((filePath) => {
        try {
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const item = JSON.parse(rawData);
            const fileName = path.basename(filePath);

            let pocket = (item.Pocket || 'Uncategorized').replace(/[^a-zA-Z0-9_-]/g, '');
            let category = (item.Category || 'Misc').replace(/[^a-zA-Z0-9_-]/g, '');
            if (pocket === 'HeldItems' && category === 'Misc') category = 'BattleItem';

            if (!datasetIndex.items[pocket]) datasetIndex.items[pocket] = {};
            if (!datasetIndex.items[pocket][category]) datasetIndex.items[pocket][category] = [];

            datasetIndex.items[pocket][category].push({
                name: item.Name,
                path: `/dataset/items/${pocket}/${category}/${fileName}`,
                pmd: item.PMD || false,
                weight: getItemWeight(item, category)
            });
        } catch (error) {
            console.error(`❌ Error processing item ${filePath}:`, error.message);
        }
    });
    console.log('✅ Items indexed!');
}

// --- 6. WRITE INDEX FILE ---
fs.writeFileSync(path.join(DATASET_DIR, 'index.json'), JSON.stringify(datasetIndex, null, 2));
console.log('🎉 Index Build Complete!');
