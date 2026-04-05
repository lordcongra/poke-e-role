import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths based on your workspace structure
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The script lives in /scripts, so we go up one level to reach the root
const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT_DIR, 'Pokerole-Data', 'v3.0');
const TARGET_DIR = path.join(ROOT_DIR, 'public', 'dataset');

// Create directories safely
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Clean and prepare target directories
if (fs.existsSync(TARGET_DIR)) {
    fs.rmSync(TARGET_DIR, { recursive: true, force: true });
}
ensureDir(TARGET_DIR);

const movesTargetDir = path.join(TARGET_DIR, 'moves');
const itemsTargetDir = path.join(TARGET_DIR, 'items');

const datasetIndex = {
    moves: {
        support: [],
        basic: { power_1: [], power_2: [], power_3: [] },
        highPower: { power_4: [], power_5: [], power_6: [], power_7: [], power_8: [], power_10: [], variable: [] }
    },
    items: {}
};

console.log('🚀 Starting Dataset Build...');

// --- 1. PROCESS MOVES ---
const movesSourceDir = path.join(SOURCE_DIR, 'Moves');
if (fs.existsSync(movesSourceDir)) {
    const moveFiles = fs.readdirSync(movesSourceDir).filter((f) => f.endsWith('.json'));

    moveFiles.forEach((file) => {
        try {
            const rawData = fs.readFileSync(path.join(movesSourceDir, file), 'utf-8');
            const move = JSON.parse(rawData);

            // Skip Z-Moves, Max Moves, and Struggles
            if (move.Attributes?.ZMove || move.Attributes?.MaxMove || move.Name.includes('Struggle')) return;

            let categoryPath = '';
            let indexRef = null;

            // Categorize Logic
            if (move.Category === 'Support' || move.Power === 0) {
                categoryPath = 'support';
                indexRef = datasetIndex.moves.support;
            } else if (typeof move.Power === 'string' || isNaN(move.Power)) {
                // FIXED: Variable moves now go into highPower/variable
                categoryPath = 'highPower/variable';
                if (!datasetIndex.moves.highPower.variable) datasetIndex.moves.highPower.variable = [];
                indexRef = datasetIndex.moves.highPower.variable;
            } else {
                const powerNum = Number(move.Power);
                if (powerNum <= 3) {
                    categoryPath = `basic/power_${powerNum}`;
                    if (!datasetIndex.moves.basic[`power_${powerNum}`])
                        datasetIndex.moves.basic[`power_${powerNum}`] = [];
                    indexRef = datasetIndex.moves.basic[`power_${powerNum}`];
                } else {
                    categoryPath = `highPower/power_${powerNum}`;
                    if (!datasetIndex.moves.highPower[`power_${powerNum}`])
                        datasetIndex.moves.highPower[`power_${powerNum}`] = [];
                    indexRef = datasetIndex.moves.highPower[`power_${powerNum}`];
                }
            }

            // Copy File
            const finalDestDir = path.join(movesTargetDir, categoryPath);
            ensureDir(finalDestDir);
            fs.copyFileSync(path.join(movesSourceDir, file), path.join(finalDestDir, file));

            // Add to Index
            indexRef.push({
                name: move.Name,
                type: move.Type,
                path: `/dataset/moves/${categoryPath}/${file}`
            });
        } catch (error) {
            console.error(`❌ Error processing move ${file}:`, error.message);
        }
    });
    console.log('✅ Moves categorized and copied!');
} else {
    console.warn('⚠️ Moves source directory not found. Skipping.');
}

// --- 2. PROCESS ITEMS ---
const itemsSourceDir = path.join(SOURCE_DIR, 'Items');
if (fs.existsSync(itemsSourceDir)) {
    const itemFiles = fs.readdirSync(itemsSourceDir).filter((f) => f.endsWith('.json'));

    itemFiles.forEach((file) => {
        try {
            const rawData = fs.readFileSync(path.join(itemsSourceDir, file), 'utf-8');
            const item = JSON.parse(rawData);

            // Clean strings to be URL/folder safe
            let pocket = (item.Pocket || 'Uncategorized').replace(/[^a-zA-Z0-9_-]/g, '');
            let category = (item.Category || 'Misc').replace(/[^a-zA-Z0-9_-]/g, '');

            // FIXED: Manual overrides for edge cases
            if (pocket === 'HeldItems' && category === 'Misc') {
                category = 'BattleItem';
            }

            const finalDestDir = path.join(itemsTargetDir, pocket, category);
            ensureDir(finalDestDir);

            // Initialize nested index map if missing
            if (!datasetIndex.items[pocket]) datasetIndex.items[pocket] = {};
            if (!datasetIndex.items[pocket][category]) datasetIndex.items[pocket][category] = [];

            // Copy File
            fs.copyFileSync(path.join(itemsSourceDir, file), path.join(finalDestDir, file));

            // Add to Index
            datasetIndex.items[pocket][category].push({
                name: item.Name,
                path: `/dataset/items/${pocket}/${category}/${file}`,
                pmd: item.PMD || false
            });
        } catch (error) {
            console.error(`❌ Error processing item ${file}:`, error.message);
        }
    });
    console.log('✅ Items categorized and copied!');
} else {
    console.warn('⚠️ Items source directory not found. Skipping.');
}

// --- 3. WRITE INDEX FILE ---
fs.writeFileSync(path.join(TARGET_DIR, 'index.json'), JSON.stringify(datasetIndex, null, 2));
console.log('✅ Generated /public/dataset/index.json');
console.log('🎉 Dataset Build Complete!');
