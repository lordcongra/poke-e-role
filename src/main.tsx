import { StrictMode, lazy, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import './style.css';
import App from './App.tsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { initMobileDragDrop } from './utils/pc/pcDragDropUtils';
import OBR from '@owlbear-rodeo/sdk';

const RollLog = lazy(() => import('./roll-log.tsx').then((m) => ({ default: m.RollLog })));
const InitiativeTracker = lazy(() =>
    import('./components/initiative/InitiativeTracker').then((m) => ({ default: m.InitiativeTracker }))
);
const BattleOrganizerApp = lazy(() =>
    import('./battle-organizer.tsx').then((m) => ({ default: m.BattleOrganizerApp }))
);

interface WindowWithReactRoot extends Window {
    __REACT_ROOT__?: Root;
    OBR?: typeof OBR;
}

if (typeof window !== 'undefined') {
    (window as WindowWithReactRoot).OBR = OBR;
}

initMobileDragDrop();

const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

function renderRootContent() {
    if (pathname.includes('roll-log.html')) {
        return (
            <Suspense fallback={null}>
                <RollLog />
            </Suspense>
        );
    }
    if (pathname.includes('initiative-tracker.html')) {
        return (
            <Suspense fallback={null}>
                <InitiativeTracker />
            </Suspense>
        );
    }
    if (pathname.includes('battle-organizer.html')) {
        return (
            <Suspense fallback={null}>
                <BattleOrganizerApp />
            </Suspense>
        );
    }
    return <App />;
}

const container = document.getElementById('root')!;
const win = window as WindowWithReactRoot;

if (!win.__REACT_ROOT__) {
    win.__REACT_ROOT__ = createRoot(container);
}

win.__REACT_ROOT__.render(
    <StrictMode>
        <ErrorBoundary>{renderRootContent()}</ErrorBoundary>
    </StrictMode>
);
