import { supabase } from '@/lib/supabase/client';

/** Exercise videos and posters live in a public bucket (scripts/upload-media.mts uploads them). */
export const EXERCISE_MEDIA_BUCKET = 'exercise-media';

export function exerciseMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(EXERCISE_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}
