import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { InitiativeTracker } from './components/initiative/InitiativeTracker';
import './style.css';

// Strictly type the custom Window property for HMR to avoid 'any'
interface WindowWithReactRoot extends Window {
    __REACT_ROOT__?: Root;
}

const container = document.getElementById('root')!;
const win = window as WindowWithReactRoot;

if (!win.__REACT_ROOT__) {
    win.__REACT_ROOT__ = createRoot(container);
}

win.__REACT_ROOT__.render(
    <StrictMode>
        <InitiativeTracker />
    </StrictMode>
);
