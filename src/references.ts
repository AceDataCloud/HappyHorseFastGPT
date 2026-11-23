import z from 'zod';
const httpsUrl = z.string().url().startsWith('https://');
import { ACTIONS } from './model-catalog.ts';
export const referenceInputs = {
  action: z.enum(ACTIONS).default('generate').meta({ title: 'Mode', description: 'Choose a mode and matching model before submitting.' }),
  imageUrl: httpsUrl.optional().meta({ title: 'First frame image URL' }),
  imageUrls: z.array(httpsUrl).min(1).max(9).optional().meta({ title: 'Reference image URLs' }),
  videoUrl: httpsUrl.optional().meta({ title: 'Video to edit URL' })
};
const schema = z.object(referenceInputs);
export type ReferenceInput = z.input<typeof schema>;
export function referencePayload(input: ReferenceInput & { model: string }) {
  const refs = schema.parse(input);
  if (refs.action === 'image_to_video' && !refs.imageUrl) throw new Error('Image-to-video requires a first frame image.');
  if (refs.action === 'reference_to_video' && !refs.imageUrls?.length) throw new Error('Reference-to-video requires reference images.');
  if (refs.action === 'video_edit' && !refs.videoUrl) throw new Error('Video editing requires an existing video URL.');
  if (refs.action === 'video_edit' && (refs.imageUrls?.length ?? 0) > 5) throw new Error('Video editing supports at most five reference images.');
  return { action: refs.action, ...(refs.imageUrl ? { image_url: refs.imageUrl } : {}), ...(refs.imageUrls ? { image_urls: refs.imageUrls } : {}), ...(refs.videoUrl ? { video_url: refs.videoUrl } : {}) };
}
