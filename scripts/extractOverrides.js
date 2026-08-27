import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const DATASET_DIR = path.join(ROOT_DIR, 'public', 'dataset');
const UPSTREAM_DIR = path.join(ROOT_DIR, 'data', 'upstream');
const OVERRIDES_DIR = path.join(ROOT_DIR, 'data', 'overrides');

function getAllJsonFiles(dirPath, arrayOfFiles = []) {
    if (!fs.existsSync(dirPath)) return arrayOfFiles;
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllJsonFiles(fullPath, arrayOfFiles);
        } else if (file.endsWith('.json') && file !== 'index.json') {
            arrayOfFiles.push(fullPath);
        }
    });
    return arrayOfFiles;
}

// Deep comparison of two JSON objects ignoring formatting/key ordering differences
function isDeepEqual(obj1, obj2) {
    if (obj1 === obj2) return true;
    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
        return false;
    }
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return false;
    for (const key of keys1) {
        if (!keys2.includes(key) || !isDeepEqual(obj1[key], obj2[key])) {
            return false;
        }
    }
    return true;
}

export function extractOverrides() {
    console.log('🔍 Scanning local dataset for custom errata & overrides...');

    if (!fs.existsSync(OVERRIDES_DIR)) {
        fs.mkdirSync(OVERRIDES_DIR, { recursive: true });
    }

    const categories = [
        { name: 'moves', localDir: path.join(DATASET_DIR, 'moves'), upstreamDir: path.join(UPSTREAM_DIR, 'Moves') },
        { name: 'items', localDir: path.join(DATASET_DIR, 'items'), upstreamDir: path.join(UPSTREAM_DIR, 'Items') },
        {
            name: 'pokedex',
            localDir: path.join(DATASET_DIR, 'pokedex'),
            upstreamDir: path.join(UPSTREAM_DIR, 'Pokedex')
        },
        {
            name: 'abilities',
            localDir: path.join(DATASET_DIR, 'abilities'),
            upstreamDir: path.join(UPSTREAM_DIR, 'Abilities')
        },
        {
            name: 'natures',
            localDir: path.join(DATASET_DIR, 'natures'),
            upstreamDir: path.join(UPSTREAM_DIR, 'Natures')
        }
    ];

    let extractedCount = 0;
    const extractedList = [];

    for (const cat of categories) {
        const localFiles = getAllJsonFiles(cat.localDir);
        const catOverrideDir = path.join(OVERRIDES_DIR, cat.name);

        for (const localFilePath of localFiles) {
            const fileName = path.basename(localFilePath);
            const upstreamFilePath = path.join(cat.upstreamDir, fileName);

            let isCustom = false;
            let reason = '';

            if (!fs.existsSync(upstreamFilePath)) {
                isCustom = true;
                reason = 'New custom file (not in upstream)';
            } else {
                try {
                    const localData = JSON.parse(fs.readFileSync(localFilePath, 'utf-8'));
                    const upstreamData = JSON.parse(fs.readFileSync(upstreamFilePath, 'utf-8'));

                    if (!isDeepEqual(localData, upstreamData)) {
                        isCustom = true;
                        reason = 'Modified/errata content differs from upstream';
                    }
                } catch (e) {
                    console.error(`Error parsing file for comparison: ${localFilePath}`, e.message);
                }
            }

            if (isCustom) {
                if (!fs.existsSync(catOverrideDir)) {
                    fs.mkdirSync(catOverrideDir, { recursive: true });
                }
                const destPath = path.join(catOverrideDir, fileName);
                fs.copyFileSync(localFilePath, destPath);
                extractedCount++;
                extractedList.push({ category: cat.name, file: fileName, reason });
                console.log(`  ✨ Extracted override [${cat.name}]: ${fileName} (${reason})`);
            }
        }
    }

    console.log(`\n🎉 Extraction Complete! Found and preserved ${extractedCount} override(s) in "data/overrides/".`);
    return extractedList;
}

// Run directly if invoked from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    extractOverrides();
}
