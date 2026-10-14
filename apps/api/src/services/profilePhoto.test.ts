/**
 * renderVariants — the pure sharp step of the image-optimization job.
 * Proves the three variants are exact-size WebP with every metadata block
 * stripped, and that EXIF orientation is applied before stripping.
 */
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { renderVariants, VARIANT_SPECS } from './profilePhoto.js';

/** 800×600 JPEG tagged "rotate 90° CW" with GPS and camera EXIF. */
async function photoWithExif(): Promise<Buffer> {
  return sharp({ create: { width: 800, height: 600, channels: 3, background: '#1a6bff' } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .withExif({
      IFD0: { Make: 'TestCam', Model: 'Field 1' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '6/1 15/1 0/1',
        GPSLongitudeRef: 'W',
        GPSLongitude: '75/1 34/1 0/1',
      },
    })
    .toBuffer();
}

describe('renderVariants', () => {
  it('fixture carries EXIF, GPS and an orientation tag', async () => {
    const meta = await sharp(await photoWithExif()).metadata();
    expect(meta.exif).toBeDefined();
    expect(meta.orientation).toBe(6);
  });

  it('produces exactly 150/400/1200 WebP variants', async () => {
    const { variants } = await renderVariants(await photoWithExif());
    expect(variants.map((v) => v.spec.variant)).toEqual(['THUMB_150', 'CARD_400', 'FULL_1200']);
    for (const { spec, data } of variants) {
      const meta = await sharp(data).metadata();
      expect(meta.format).toBe('webp');
      expect([meta.width, meta.height]).toEqual([spec.size, spec.size]);
    }
    expect(VARIANT_SPECS.map((s) => s.quality)).toEqual([80, 85, 90]);
  });

  it('strips EXIF, GPS, ICC, XMP and the orientation tag from every variant', async () => {
    const { variants } = await renderVariants(await photoWithExif());
    for (const { data } of variants) {
      const meta = await sharp(data).metadata();
      expect(meta.exif).toBeUndefined();
      expect(meta.icc).toBeUndefined();
      expect(meta.xmp).toBeUndefined();
      expect(meta.orientation).toBeUndefined();
      expect(data.includes(Buffer.from('TestCam'))).toBe(false);
    }
  });

  it('reports the upright size of the original', async () => {
    // Orientation 6 means the stored 800×600 pixels display as 600×800.
    expect(await renderVariants(await photoWithExif())).toMatchObject({ width: 600, height: 800 });
  });

  it('accepts PNG and WebP input', async () => {
    const base = sharp({ create: { width: 300, height: 200, channels: 3, background: '#fff' } });
    for (const input of [
      await base.clone().png().toBuffer(),
      await base.clone().webp().toBuffer(),
    ]) {
      expect((await renderVariants(input)).variants).toHaveLength(3);
    }
  });

  it('rejects unsupported and corrupt input', async () => {
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } })
      .gif()
      .toBuffer();
    await expect(renderVariants(gif)).rejects.toThrow('unsupported image format');
    await expect(renderVariants(Buffer.from('not an image'))).rejects.toThrow();
  });
});
