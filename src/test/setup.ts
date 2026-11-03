import { vi } from 'vitest';

// 1. Polyfill window, parent, and postMessage
if (typeof window !== 'undefined') {
    if (!window.parent) {
        (window as unknown as { parent: unknown }).parent = window;
    }
    if (!window.parent.postMessage) {
        window.parent.postMessage = vi.fn();
    }
    if (!window.postMessage) {
        window.postMessage = vi.fn();
    }
    // In Owlbear Rodeo VTT, the extension runs inside an iframe (window.self !== window.top)
    (window as unknown as { top: unknown }).top = { isIframeParent: true };
}

// 2. Polyfill in-memory localStorage
const createLocalStorageMock = () => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, val: string) => {
            store[key] = String(val);
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
        get length() {
            return Object.keys(store).length;
        }
    };
};

const mockLocalStorage = createLocalStorageMock();
Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true
});
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true
    });
}

// 3. Polyfill / Mock for @owlbear-rodeo/sdk
class MockImageBuilder {
    private item: Record<string, unknown>;
    constructor(image: unknown, grid: unknown) {
        this.item = {
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'IMAGE',
            name: '',
            image,
            grid,
            position: { x: 0, y: 0 },
            rotation: 0,
            scale: { x: 1, y: 1 },
            layer: 'CHARACTER',
            metadata: {},
            visible: true,
            locked: false
        };
        const proxy: any = new Proxy(this, {
            get(target: any, prop: string) {
                if (prop in target) {
                    const val = target[prop];
                    if (typeof val === 'function') {
                        return (...args: any[]) => {
                            const res = val.apply(target, args);
                            return res === target ? proxy : res;
                        };
                    }
                    return val;
                }
                return (val: any) => {
                    target.item[prop] = val;
                    return proxy;
                };
            }
        });
        return proxy;
    }
    id(val: string) {
        this.item.id = val;
        return this;
    }
    name(val: string) {
        this.item.name = val;
        return this;
    }
    position(val: unknown) {
        this.item.position = val;
        return this;
    }
    layer(val: unknown) {
        this.item.layer = val;
        return this;
    }
    metadata(val: unknown) {
        this.item.metadata = { ...(this.item.metadata as Record<string, unknown>), ...(val as Record<string, unknown>) };
        return this;
    }
    rotation(val: number) {
        this.item.rotation = val;
        return this;
    }
    scale(val: unknown) {
        this.item.scale = val;
        return this;
    }
    visible(val: boolean) {
        this.item.visible = val;
        return this;
    }
    locked(val: boolean) {
        this.item.locked = val;
        return this;
    }
    attachedTo(val: string) {
        this.item.attachedTo = val;
        return this;
    }
    disableAttachmentBehavior(val: unknown) {
        this.item.disableAttachmentBehavior = val;
        return this;
    }
    build() {
        return { ...this.item };
    }
}

class MockGenericBuilder {
    private item: Record<string, unknown>;
    constructor(type: string) {
        this.item = {
            id: `${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type,
            name: '',
            position: { x: 0, y: 0 },
            layer: 'DRAWING',
            metadata: {},
            style: {},
            text: { style: {}, plainText: '' }
        };
        const proxy: any = new Proxy(this, {
            get(target: any, prop: string) {
                if (prop in target) {
                    const val = target[prop];
                    if (typeof val === 'function') {
                        return (...args: any[]) => {
                            const res = val.apply(target, args);
                            return res === target ? proxy : res;
                        };
                    }
                    return val;
                }
                return (val: any) => {
                    target.item[prop] = val;
                    return proxy;
                };
            }
        });
        return proxy;
    }
    id(val: string) {
        this.item.id = val;
        return this;
    }
    name(val: string) {
        this.item.name = val;
        return this;
    }
    position(val: unknown) {
        this.item.position = val;
        return this;
    }
    layer(val: unknown) {
        this.item.layer = val;
        return this;
    }
    metadata(val: unknown) {
        this.item.metadata = { ...(this.item.metadata as Record<string, unknown>), ...(val as Record<string, unknown>) };
        return this;
    }
    build() {
        return { ...this.item };
    }
}

vi.mock('@owlbear-rodeo/sdk', () => {
    const defaultOBR = {
        isAvailable: true,
        player: {
            getId: vi.fn(async () => 'mock-player-id'),
            getName: vi.fn(async () => 'Mock Player'),
            getRole: vi.fn(async () => 'PLAYER'),
            id: 'mock-player-id',
            role: 'PLAYER',
            name: 'Mock Player',
            onChange: vi.fn(() => () => {})
        },
        scene: {
            isReady: vi.fn(async () => true),
            onReadyChange: vi.fn(() => () => {}),
            grid: {
                getDpi: vi.fn(async () => 150),
                getScale: vi.fn(async () => ({ parsed: { multiplier: 1, unit: 'ft' } }))
            },
            items: {
                getItems: vi.fn(async () => []),
                updateItems: vi.fn(async () => {}),
                addItems: vi.fn(async () => {}),
                deleteItems: vi.fn(async () => {}),
                onChange: vi.fn(() => () => {})
            },
            local: {
                getItems: vi.fn(async () => []),
                updateItems: vi.fn(async () => {}),
                addItems: vi.fn(async () => {}),
                deleteItems: vi.fn(async () => {}),
                onChange: vi.fn(() => () => {})
            }
        },
        room: {
            id: 'mock-room-id',
            getMetadata: vi.fn(async () => ({})),
            setMetadata: vi.fn(async () => {}),
            onChange: vi.fn(() => () => {})
        },
        notification: {
            show: vi.fn(async () => {})
        },
        broadcast: {
            sendMessage: vi.fn(async () => {}),
            onMessage: vi.fn(() => () => {})
        },
        action: {
            open: vi.fn(async () => {}),
            close: vi.fn(async () => {}),
            isOpen: vi.fn(async () => false)
        },
        popover: {
            open: vi.fn(async () => {}),
            close: vi.fn(async () => {}),
            setHeight: vi.fn(async () => {}),
            setWidth: vi.fn(async () => {})
        }
    };

    return {
        default: defaultOBR,
        isImage: (item: { type?: string }) => item?.type === 'IMAGE',
        isCurve: (item: { type?: string }) => item?.type === 'CURVE',
        isText: (item: { type?: string }) => item?.type === 'TEXT',
        isShape: (item: { type?: string }) => item?.type === 'SHAPE',
        buildImage: (image: unknown, grid: unknown) => new MockImageBuilder(image, grid),
        buildCurve: () => new MockGenericBuilder('CURVE'),
        buildText: () => new MockGenericBuilder('TEXT'),
        buildShape: () => new MockGenericBuilder('SHAPE')
    };
});
