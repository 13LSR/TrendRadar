import test from 'node:test';
import assert from 'node:assert/strict';
import { canvasToPng, createCaptureValidator, getCaptureScale } from './exportImage.js';

test('short reports retain the original export resolution', () => {
  assert.equal(getCaptureScale(1280, 2000), 1.5);
});

test('long and wide reports stay within canvas limits without cropping', () => {
  // The current 343-item report previously produced a 66,682px-tall canvas.
  for (const [width, height] of [[525, 44529], [1265, 42000], [3840, 90000], [40000, 500]]) {
    const scale = getCaptureScale(width, height);
    const outputWidth = Math.floor(width * scale);
    const outputHeight = Math.floor(height * scale);
    assert.ok(scale > 0 && scale <= 1.5);
    assert.ok(outputWidth <= 32760 && outputHeight <= 32760);
    assert.ok(outputWidth * outputHeight <= 16 * 1024 * 1024);
    // Allow subpixel rounding when the canvas allocates integer dimensions.
    assert.ok(Math.abs((outputWidth / width) / (outputHeight / height) - 1) < 0.003);
  }
});

test('invalid capture dimensions fail before allocating a canvas', () => {
  for (const [width, height] of [[0, 100], [100, -1], [NaN, 100], [100, Infinity]]) {
    assert.throws(() => getCaptureScale(width, height), /页面尺寸无效/);
  }
});

test('library validation checks scaled canvas dimensions for long reports', () => {
  const width = 1265;
  const height = 44529;
  const scale = getCaptureScale(width, height);
  const validator = createCaptureValidator(scale);
  assert.equal(validator.validateOptions({ width, height, scale }).valid, true);
  assert.equal(validator.validateOptions({ width, height: 1000000, scale }).valid, false);
  assert.equal(validator.validateOptions({ width, height, scale: -1 }).valid, false);
  assert.equal(validator.validateOptions({ width: 0, height, scale }).valid, false);
});

test('PNG encoding rejects empty results instead of downloading an empty file', async () => {
  for (const blob of [null, new Blob([])]) {
    await assert.rejects(canvasToPng({ toBlob: callback => callback(blob) }), /图片生成失败/);
  }
});

test('PNG encoding preserves valid data and surfaces browser errors', async () => {
  const blob = new Blob(['png'], { type: 'image/png' });
  assert.equal(await canvasToPng({ toBlob: (callback, type) => {
    assert.equal(type, 'image/png');
    callback(blob);
  } }), blob);
  await assert.rejects(canvasToPng({ toBlob: () => {
    throw new Error('Canvas is tainted');
  } }), /Canvas is tainted/);
});
