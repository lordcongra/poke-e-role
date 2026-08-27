import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const REPO_CACHE_DIR = path.join(DATA_DIR, '.upstream-repo');
const UPSTREAM_DIR = path.join(DATA_DIR, 'upstream');

const UPSTREAM_REPO_URL = 'https://github.com/Pokerole-Software-Development/Pokerole-Data.git';

export async function syncUpstream() {
    console.log('🔄 Syncing upstream Pokerole dataset (v3.0)...');

    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    try {
        if (!fs.existsSync(REPO_CACHE_DIR)) {
            console.log('📦 Initializing sparse upstream repository clone...');
            execSync(`git clone --depth 1 --filter=blob:none --sparse ${UPSTREAM_REPO_URL} "${REPO_CACHE_DIR}"`, {
                stdio: 'pipe'
            });
            execSync(`git -C "${REPO_CACHE_DIR}" sparse-checkout set v3.0`, {
                stdio: 'pipe'
            });
        } else {
            console.log('📡 Fetching latest upstream updates from GitHub...');
            try {
                execSync(`git -C "${REPO_CACHE_DIR}" pull --depth 1`, {
                    stdio: 'pipe'
                });
            } catch (err) {
                console.warn('⚠️ git pull failed, re-fetching latest commit...', err.message);
                execSync(`git -C "${REPO_CACHE_DIR}" fetch --depth 1 origin master`, { stdio: 'pipe' });
                execSync(`git -C "${REPO_CACHE_DIR}" reset --hard origin/master`, { stdio: 'pipe' });
            }
        }

        // Get latest commit info
        const commitInfo = execSync(`git -C "${REPO_CACHE_DIR}" log -1 --format="%h - %s (%ci)"`, {
            encoding: 'utf-8'
        }).trim();

        console.log(`📌 Upstream version: ${commitInfo}`);

        // Source v3.0 directory inside sparse clone
        const sourceV3Dir = path.join(REPO_CACHE_DIR, 'v3.0');
        if (!fs.existsSync(sourceV3Dir)) {
            throw new Error(`v3.0 directory not found at ${sourceV3Dir}`);
        }

        // Copy directories from v3.0 to data/upstream
        if (!fs.existsSync(UPSTREAM_DIR)) {
            fs.mkdirSync(UPSTREAM_DIR, { recursive: true });
        }

        const categories = ['Abilities', 'Items', 'Moves', 'Natures', 'Pokedex'];
        for (const cat of categories) {
            const srcCatDir = path.join(sourceV3Dir, cat);
            const destCatDir = path.join(UPSTREAM_DIR, cat);

            if (fs.existsSync(srcCatDir)) {
                fs.cpSync(srcCatDir, destCatDir, { recursive: true });
                const count = fs.readdirSync(destCatDir).length;
                console.log(`  ✓ Synced ${cat}: ${count} files`);
            }
        }

        // Save sync metadata
        fs.writeFileSync(
            path.join(DATA_DIR, 'upstream-metadata.json'),
            JSON.stringify(
                {
                    repo: UPSTREAM_REPO_URL,
                    branch: 'master',
                    path: 'v3.0',
                    lastSync: new Date().toISOString(),
                    commit: commitInfo
                },
                null,
                2
            )
        );

        console.log('✅ Upstream sync complete!');
    } catch (error) {
        console.error('❌ Failed to sync upstream:', error.message);
        throw error;
    }
}

// Run directly if invoked from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    syncUpstream();
}
