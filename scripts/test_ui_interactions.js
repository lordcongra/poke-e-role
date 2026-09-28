import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function getJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
    console.log('\n============================================================');
    console.log('   RUNNING HEADLESS CHROME E2E UI INTERACTION TESTS         ');
    console.log('============================================================\n');

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-ui-test-'));
    const port = 9338;

    const chrome = spawn(chromePath, [
        '--headless=new',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${tempDir}`,
        '--window-size=1400,900',
        '--disable-extensions',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        'http://localhost:5174/poke-e-role/'
    ]);

    let wsUrl = null;
    for (let i = 0; i < 20; i++) {
        await sleep(300);
        try {
            const list = await getJson(`http://127.0.0.1:${port}/json/list`);
            const pageTarget = list.find((t) => t.type === 'page');
            if (pageTarget && pageTarget.webSocketDebuggerUrl) {
                wsUrl = pageTarget.webSocketDebuggerUrl;
                break;
            }
        } catch {}
    }

    if (!wsUrl) {
        console.error('Failed to connect to Chrome on port', port);
        chrome.kill();
        process.exit(1);
    }

    const ws = new WebSocket(wsUrl);
    let id = 1;
    const pending = new Map();
    const consoleLogs = [];
    const pageErrors = [];

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && pending.has(msg.id)) {
            pending.get(msg.id)(msg.result);
            pending.delete(msg.id);
        }
        if (msg.method === 'Runtime.consoleAPICalled') {
            const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
            consoleLogs.push(`[${msg.params.type}] ${text}`);
        }
        if (msg.method === 'Runtime.exceptionThrown') {
            pageErrors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
        }
    };

    function send(method, params = {}) {
        return new Promise((resolve) => {
            const reqId = id++;
            pending.set(reqId, resolve);
            ws.send(JSON.stringify({ id: reqId, method, params }));
        });
    }

    await new Promise((r) => (ws.onopen = r));
    await send('Runtime.enable');
    await send('DOM.enable');

    await sleep(3500);

    // Step 1: Close What's New modal if present
    await send('Runtime.evaluate', {
        expression: `(() => {
            const closeBtn = document.querySelector('.whats-new-modal__close-btn, .modal-close, button[aria-label="Close"], .modal-overlay button');
            if (closeBtn) closeBtn.click();
        })()`
    });
    await sleep(500);

    // Step 2: Click 'Add Sheet' in Sidebar to hydrate active character sheet
    const addSheetResult = await send('Runtime.evaluate', {
        expression: `(() => {
            const addSheetBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add Sheet'));
            if (addSheetBtn) {
                addSheetBtn.click();
                return { success: true };
            }
            return { success: false };
        })()`,
        returnByValue: true
    });
    console.log('[Test 1] Click "Add Sheet" in Directory:', addSheetResult?.result?.value);
    await sleep(1000);

    // Step 3: Test TrackerSection - Evasion button & Evade checkbox
    const evadeTestResult = await send('Runtime.evaluate', {
        expression: `(() => {
            const evadeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().endsWith('Evade'));
            const evadeCheckbox = document.querySelector('.tracker-section__checkbox');
            const initialEvadeChecked = evadeCheckbox ? evadeCheckbox.checked : null;
            
            let clicked = false;
            if (evadeBtn) {
                evadeBtn.click();
                clicked = true;
            }
            
            return {
                foundEvadeBtn: !!evadeBtn,
                evadeBtnText: evadeBtn ? evadeBtn.innerText.trim() : null,
                initialEvadeChecked,
                clicked
            };
        })()`,
        returnByValue: true
    });
    console.log('[Test 2] Evade Interaction Check:', evadeTestResult?.result?.value);
    await sleep(600);

    // Step 4: Verify Evade was checked and Action counter incremented
    const postEvadeCheck = await send('Runtime.evaluate', {
        expression: `(() => {
            const checkboxes = Array.from(document.querySelectorAll('.tracker-section__checkbox'));
            const evadeCb = checkboxes[0];
            const actionSpinner = document.querySelector('.number-spinner input, .tracker-section__action-group input, input[type="number"]');
            return {
                evadeChecked: evadeCb ? evadeCb.checked : null,
                actionCount: actionSpinner ? actionSpinner.value : null
            };
        })()`,
        returnByValue: true
    });
    console.log('[Test 3] Post-Evade State (Evade checked & Action incremented):', postEvadeCheck?.result?.value);

    // Step 5: Test Clash Modal trigger
    const clashTestResult = await send('Runtime.evaluate', {
        expression: `(() => {
            const clashBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().endsWith('Clash'));
            if (clashBtn) {
                clashBtn.click();
                return { clicked: true, text: clashBtn.innerText.trim() };
            }
            return { clicked: false };
        })()`,
        returnByValue: true
    });
    console.log('[Test 4] Clash Button Click:', clashTestResult?.result?.value);
    await sleep(600);

    // Verify Clash Modal opened
    const clashModalResult = await send('Runtime.evaluate', {
        expression: `(() => {
            const clashModal = document.querySelector('.clash-modal__content, .clash-modal__overlay');
            const physicalBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Physical (STR)'));
            const specialBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Special (SPE)'));
            const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cancel'));
            
            const isOpen = !!clashModal;
            if (cancelBtn) cancelBtn.click(); // Close cleanly
            return {
                isOpen,
                hasPhysicalOption: !!physicalBtn,
                hasSpecialOption: !!specialBtn
            };
        })()`,
        returnByValue: true
    });
    console.log('[Test 5] Clash Modal State:', clashModalResult?.result?.value);
    await sleep(500);

    // Step 6: Test Battle Organizer Toolbar button & Modal
    const boOpenResult = await send('Runtime.evaluate', {
        expression: `(() => {
            const boBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Battle') || b.title?.includes('Battle Organizer') || b.getAttribute('aria-label')?.includes('Battle Organizer'));
            if (boBtn) {
                boBtn.click();
                return { clicked: true, text: boBtn.innerText.trim() || boBtn.title };
            }
            return { clicked: false };
        })()`,
        returnByValue: true
    });
    console.log('[Test 6] Battle Organizer Button Click:', boOpenResult?.result?.value);
    await sleep(800);

    const boModalResult = await send('Runtime.evaluate', {
        expression: `(() => {
            const boModal = document.querySelector('.battle-organizer-modal, .battle-organizer-container, .modal-container');
            const roundHeaders = Array.from(document.querySelectorAll('*')).filter(el => el.innerText?.includes('Round 1'));
            const closeBtn = document.querySelector('.battle-organizer-modal__close-btn, .modal-close, button[aria-label="Close"]');
            const isOpen = !!boModal || roundHeaders.length > 0;
            if (closeBtn) closeBtn.click();
            return { isOpen, roundFound: roundHeaders.length > 0 };
        })()`,
        returnByValue: true
    });
    console.log('[Test 7] Battle Organizer Modal State:', boModalResult?.result?.value);

    // Check for runtime errors
    console.log('\n--- Runtime Error Summary (' + pageErrors.length + ') ---');
    if (pageErrors.length === 0) {
        console.log('  ✓ ZERO runtime exceptions in browser session during combat/BO testing!');
    } else {
        pageErrors.forEach((err) => console.error('  ✕ ' + err));
    }

    ws.close();
    chrome.kill();
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}

    if (pageErrors.length > 0) {
        process.exit(1);
    }
}

run().catch(console.error);
