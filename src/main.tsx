import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import App from './App.tsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { initMobileDragDrop } from './utils/pc/pcDragDropUtils';
import OBR from '@owlbear-rodeo/sdk';

if (typeof window !== 'undefined') {
    (window as unknown as { OBR: typeof OBR }).OBR = OBR;
}

initMobileDragDrop();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </StrictMode>
);
