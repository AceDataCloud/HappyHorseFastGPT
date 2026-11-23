import { afterEach, expect, test, vi } from 'vitest';
import plugin from '../index.ts';
import { submitGeneration } from './client.ts';
import { MODELS } from './model-catalog.ts';
const image = 'https://example.com/authorized.png';
const video = 'https://example.com/authorized.mp4';
const audio = 'https://example.com/authorized.mp3';
const handler = plugin.getToolHandler('generate')!;
afterEach(() => vi.unstubAllGlobals());
async function capture(values: Record<string, unknown>) {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ task_id: 'one-submission', status: 'pending' }), { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  const input = handler.inputSchema.parse({ prompt: 'One blue paper sphere', ...values });
  await submitGeneration(input, 'test-key');
  expect(fetch).toHaveBeenCalledTimes(1);
  return JSON.parse(fetch.mock.calls[0]![1].body);
}
test('keeps exact custom model IDs available', () => {
  expect(handler.inputSchema.parse({ prompt: 'One blue paper sphere', model: 'future-custom-model' }).model).toBe('future-custom-model');
});

for (const model of MODELS) test(`preserves ${model} and its selected mode`, async () => {
  const values = model.endsWith('-i2v') ? { action: 'image_to_video', imageUrl: image } : model.endsWith('-r2v') ? { action: 'reference_to_video', imageUrls: [image] } : model.endsWith('-video-edit') ? { action: 'video_edit', videoUrl: video } : { action: 'generate' };
  const body = await capture({ model, ...values });
  expect(body.model).toBe(model);
  expect(body.action).toBe(values.action);
  if ('imageUrl' in values) expect(body.image_url).toBe(image);
  if ('imageUrls' in values) expect(body.image_urls).toEqual([image]);
  if ('videoUrl' in values) expect(body.video_url).toBe(video);
});
test('rejects missing reference inputs and excessive edit images before transport', async () => {
  for (const action of ['image_to_video', 'reference_to_video', 'video_edit']) {
    await expect(capture({ action })).rejects.toThrow(/requires/);
    expect(fetch).not.toHaveBeenCalled();
  }
  await expect(capture({ action: 'video_edit', videoUrl: video, imageUrls: Array(6).fill(image) })).rejects.toThrow('five');
  expect(fetch).not.toHaveBeenCalled();
});
