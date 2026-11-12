import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    autoCropTransparency,
    MAX_AUTO_CROP_FILE_BYTES,
    MAX_AUTO_CROP_DIMENSION
} from '@/utils/graphics/imageManager';

describe('imageManagerSafety', () => {
    const originalImage = globalThis.Image;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    beforeEach(() => {
        URL.createObjectURL = vi.fn(() => 'blob:mock-object-url');
        URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
        globalThis.Image = originalImage;
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
        vi.restoreAllMocks();
    });

    it('skips decoding and returns original file when file size exceeds MAX_AUTO_CROP_FILE_BYTES', async () => {
        const oversizedFile = {
            size: MAX_AUTO_CROP_FILE_BYTES + 1,
            type: 'image/png'
        } as unknown as File;

        const result = await autoCropTransparency(oversizedFile);
        expect(result).toBe(oversizedFile);
        expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('revokes object URL on image load error', async () => {
        class MockErrorImage {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            set src(_val: string) {
                setTimeout(() => this.onerror?.(), 0);
            }
        }
        globalThis.Image = MockErrorImage as unknown as typeof Image;

        const file = new File(['bad-image'], 'broken.png', { type: 'image/png' });
        const result = await autoCropTransparency(file);

        expect(result).toBe(file);
        expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-object-url');
    });

    it('downscales oversized dimensions before pixel scanning and revokes object URL on load', async () => {
        const drawImageSpy = vi.fn();
        const getImageDataSpy = vi.fn((_x: number, _y: number, w: number, h: number) => ({
            data: new Uint8ClampedArray(w * h * 4)
        }));
        const mockCanvas = {
            width: 0,
            height: 0,
            getContext: vi.fn(() => ({
                drawImage: drawImageSpy,
                getImageData: getImageDataSpy
            }))
        };
        const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
            if (tag === 'canvas') return mockCanvas as unknown as HTMLCanvasElement;
            return document.createElement(tag);
        });

        class MockLargeImage {
            naturalWidth = MAX_AUTO_CROP_DIMENSION * 4;
            naturalHeight = MAX_AUTO_CROP_DIMENSION * 2;
            width = MAX_AUTO_CROP_DIMENSION * 4;
            height = MAX_AUTO_CROP_DIMENSION * 2;
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            set src(_val: string) {
                setTimeout(() => this.onload?.(), 0);
            }
        }
        globalThis.Image = MockLargeImage as unknown as typeof Image;

        const file = new File(['ok'], 'huge.png', { type: 'image/png' });
        const result = await autoCropTransparency(file);

        expect(result).toBe(file);
        expect(mockCanvas.width).toBe(MAX_AUTO_CROP_DIMENSION);
        expect(mockCanvas.height).toBe(MAX_AUTO_CROP_DIMENSION / 2);
        expect(drawImageSpy).toHaveBeenCalledWith(
            expect.anything(),
            0,
            0,
            MAX_AUTO_CROP_DIMENSION,
            MAX_AUTO_CROP_DIMENSION / 2
        );
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-object-url');
        createElementSpy.mockRestore();
    });
});

