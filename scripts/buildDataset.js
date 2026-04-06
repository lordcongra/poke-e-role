import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const DATASET_DIR = path.join(ROOT_DIR, 'public', 'dataset');
const MOVES_DIR = path.join(DATASET_DIR, 'moves');
const ITEMS_DIR = path.join(DATASET_DIR, 'items');

const datasetIndex = {
    moves: {
        support: [],
        basic: { power_1: [], power_2: [], power_3: [] },
        highPower: { power_4: [], power_5: [], power_6: [], power_7: [], power_8: [], power_10: [], variable: [] }
    },
    items: {}
};

console.log('🚀 Generating Index from existing files...');

// --- WEIGHT CALCULATION HELPERS ---
function getMoveWeight(move, power) {
    if (move.Category === 'Status') return 50; // Uncommon
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

// --- 1. PROCESS MOVES ---
if (fs.existsSync(MOVES_DIR)) {
    const moveFiles = getAllFiles(MOVES_DIR);
    moveFiles.forEach((filePath) => {
        try {
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const move = JSON.parse(rawData);
            const fileName = path.basename(filePath);

            const relativePath = path.relative(MOVES_DIR, filePath).replace(/\\/g, '/');
            const categoryParts = relativePath.split('/');
            categoryParts.pop();
            const categoryPath = categoryParts.join('/');

            let indexRef = null;
            if (categoryPath === 'support') indexRef = datasetIndex.moves.support;
            else if (categoryPath === 'highPower/variable') {
                if (!datasetIndex.moves.highPower.variable) datasetIndex.moves.highPower.variable = [];
                indexRef = datasetIndex.moves.highPower.variable;
            } else if (categoryPath.startsWith('basic/')) {
                const pow = categoryPath.split('/')[1];
                if (!datasetIndex.moves.basic[pow]) datasetIndex.moves.basic[pow] = [];
                indexRef = datasetIndex.moves.basic[pow];
            } else if (categoryPath.startsWith('highPower/')) {
                const pow = categoryPath.split('/')[1];
                if (!datasetIndex.moves.highPower[pow]) datasetIndex.moves.highPower[pow] = [];
                indexRef = datasetIndex.moves.highPower[pow];
            }

            if (indexRef) {
                indexRef.push({
                    name: move.Name,
                    type: move.Type,
                    path: `/dataset/moves/${categoryPath}/${fileName}`,
                    weight: getMoveWeight(move, Number(move.Power) || 0)
                });
            }
        } catch (error) {
            console.error(`❌ Error processing move ${filePath}:`, error.message);
        }
    });
    console.log('✅ Moves indexed!');
}

// --- 2. PROCESS ITEMS ---
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

// --- 3. WRITE INDEX FILE ---
fs.writeFileSync(path.join(DATASET_DIR, 'index.json'), JSON.stringify(datasetIndex, null, 2));
console.log('🎉 Index Build Complete!');
