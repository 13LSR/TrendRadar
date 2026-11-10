import test from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync } from 'fflate';
import { getCaptureScale } from './exportImage.js';
import { EXPORT_PAGE_HEIGHT, EXPORT_SCALE, EXPORT_WIDTH, packageImages, paginateRows, safeFilename } from './exportModules.js';

test('module pages retain 2x resolution at their maximum dimensions', () => {
  const scale = getCaptureScale(EXPORT_WIDTH, EXPORT_PAGE_HEIGHT, EXPORT_SCALE);
  assert.equal(scale, 2);
  assert.equal(EXPORT_WIDTH * scale, 1800);
});

test('pagination preserves every row in order and never divides an article', () => {
  const heights = Array.from({ length: 94 }, (_, index) => 100 + (index % 7) * 40);
  const pages = paginateRows(heights, 2100);
  assert.deepEqual(pages.flat(), heights.map((_, index) => index));
  assert.ok(pages.length > 1);
  for (const page of pages) assert.ok(page.reduce((sum, index) => sum + heights[index], 0) <= 2100);
});

test('pagination handles exact fits, empty modules and invalid measurements', () => {
  assert.deepEqual(paginateRows([400, 600, 1000], 1000), [[0, 1], [2]]);
  assert.deepEqual(paginateRows([], 1000), []);
  assert.throws(() => paginateRows([1200], 1000), /单条新闻过长/);
  assert.throws(() => paginateRows([NaN], 1000), /新闻尺寸无效/);
  assert.throws(() => paginateRows([100], 0), /可用高度不足/);
});

test('download filenames preserve Chinese while replacing path characters', () => {
  assert.equal(safeFilename('NEW_ARRIVALS // 新增热点'), 'NEW_ARRIVALS __ 新增热点');
  assert.equal(safeFilename('a:b?c*.'), 'a_b_c_');
  assert.equal(safeFilename(''), 'module');
});

test('one image downloads directly and multiple images form a complete UTF-8 ZIP', async () => {
  const files = [
    { filename: '01_通用AI_01.png', blob: new Blob(['first-image'], { type: 'image/png' }) },
    { filename: '02_半导体_01.png', blob: new Blob(['second-image'], { type: 'image/png' }) },
  ];
  const single = await packageImages([files[0]], '20261110');
  assert.equal(single.blob, files[0].blob);
  assert.equal(single.imageCount, 1);
  const archive = await packageImages(files, '20261110');
  assert.equal(archive.filename, 'TrendRadar_20261110.zip');
  assert.equal(archive.imageCount, 2);
  const contents = unzipSync(new Uint8Array(await archive.blob.arrayBuffer()));
  assert.deepEqual(Object.keys(contents), files.map(file => file.filename));
  for (const file of files) assert.deepEqual(contents[file.filename], new Uint8Array(await file.blob.arrayBuffer()));
  await assert.rejects(packageImages([], '20261110'), /没有可导出的新闻/);
});
