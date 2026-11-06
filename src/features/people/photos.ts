// Profile photo logic: path building, image preparation, storage upload/remove and signed URLs.
//
// Photos live in the private `avatars` bucket at `{owner_id}/{person_id}.jpg` (RLS only lets a
// user touch their own folder). `persons.photo_path` stores that storage path, never a URL;
// URLs are signed on demand (see photoHooks.ts).
//
// New people: the picked image stays on the device until Save. The form saves the person
// first, then uploads the photo and sets photo_path. That avoids orphaned uploads when the
// user cancels, and needs no temporary storage path or person-id-before-insert trick.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

export const AVATAR_BUCKET = 'avatars';
export const PHOTO_MAX_SIZE = 500;
export const PHOTO_QUALITY = 0.8;
export const PHOTO_CONTENT_TYPE = 'image/jpeg';
/** Signed URLs last an hour; the query cache refreshes them before that (see photoHooks.ts). */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** What the user did to the photo in the form. `set` holds an already-prepared local JPEG. */
export type PhotoChange = { kind: 'unchanged' } | { kind: 'set'; uri: string } | { kind: 'remove' };

export const NO_PHOTO_CHANGE: PhotoChange = { kind: 'unchanged' };

export interface PhotoPerson {
  id: string;
  owner_id: string;
  photo_path: string | null;
}

export function buildPhotoPath(ownerId: string, personId: string): string {
  return `${ownerId}/${personId}.jpg`;
}

/** Largest centered square inside a width x height image. */
export function squareCropRect(width: number, height: number) {
  const side = Math.min(width, height);
  return {
    originX: Math.floor((width - side) / 2),
    originY: Math.floor((height - side) / 2),
    width: side,
    height: side,
  };
}

/**
 * Crop to a centered square (the picker's editor does this on iOS/Android, but not on web),
 * shrink to at most 500x500, and encode as JPEG at 0.8. Returns the new local file URI.
 */
export async function preparePhoto(
  uri: string,
  size?: { width?: number | null; height?: number | null },
): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  let side = 0;
  if (size?.width && size.height) {
    const rect = squareCropRect(size.width, size.height);
    side = rect.width;
    context.crop(rect);
  }
  // Unknown size: resize to the cap anyway (width and height both given keeps it square-bounded).
  if (side === 0 || side > PHOTO_MAX_SIZE) {
    context.resize({ width: PHOTO_MAX_SIZE, height: PHOTO_MAX_SIZE });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: PHOTO_QUALITY });
  return result.uri;
}

/** Upload (or replace) the person's photo and record its path. Returns the storage path. */
export async function uploadPersonPhoto(person: PhotoPerson, localUri: string): Promise<string> {
  const path = buildPhotoPath(person.owner_id, person.id);
  const body = await (await fetch(localUri)).arrayBuffer();
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, body, { contentType: PHOTO_CONTENT_TYPE, upsert: true });
  if (error) throw error;
  await setPhotoPath(person.id, path);
  return path;
}

/** Null the person's photo_path first (so the row never points at a missing object), then delete the file. */
export async function removePersonPhoto(person: PhotoPerson): Promise<void> {
  const path = person.photo_path ?? buildPhotoPath(person.owner_id, person.id);
  await setPhotoPath(person.id, null);
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  if (error) throw error;
}

async function setPhotoPath(personId: string, path: string | null): Promise<void> {
  const { error } = await supabase.from('persons').update({ photo_path: path }).eq('id', personId);
  if (error) throw error;
}

/** Apply what the form recorded after the person row has been saved. */
export async function applyPhotoChange(person: PhotoPerson, change: PhotoChange): Promise<void> {
  if (change.kind === 'set') await uploadPersonPhoto(person, change.uri);
  else if (change.kind === 'remove' && person.photo_path) await removePersonPhoto(person);
}

/** Signed URLs for many paths in one request, keyed by path. Paths that fail to sign are omitted. */
export async function getSignedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  const urls: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}
