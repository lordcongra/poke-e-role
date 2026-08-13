import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import App from './App.tsx';

// --- MOBILE DRAG & DROP POLYFILL ---
import { polyfill } from 'mobile-drag-drop';
import 'mobile-drag-drop/default.css';

polyfill({
    // Requires a 350ms long-press to pick up a file.
    // This ensures standard swiping still scrolls the sidebar!
    holdToDrag: 350,
    forceApply: true // <--- NEW: Forces the polyfill on desktop/DevTools for testing!
});

// Required by modern browsers to allow the polyfill to stop the page from scrolling while dragging
window.addEventListener('touchmove', () => {}, { passive: false });
// -----------------------------------

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
