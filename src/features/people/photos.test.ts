import { supabase } from '@/lib/supabase';
import { createFakePeople } from '@/test-utils/fakePeople';
import { fakeSupabase } from '@/test-utils/fakeSupabase';

import {
  applyPhotoChange,
  buildPhotoPath,
  getSignedPhotoUrls,
  preparePhoto,
  squareCropRect,
  uploadPersonPhoto,
} from './photos';

const mockContext = {
  crop: jest.fn().mockReturnThis(),
  resize: jest.fn().mockReturnThis(),
  renderAsync: jest.fn(),
};
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: { manipulate: jest.fn(() => mockContext) },
}));

const upload = jest.fn();
const remove = jest.fn();
const createSignedUrls = jest.fn();
const from = jest.fn(() => ({ upload, remove, createSignedUrls }));
(supabase as unknown as { storage: unknown }).storage = { from };

const person = { id: 'p1', owner_id: 'u1', photo_path: null as string | null };

let people: ReturnType<typeof createFakePeople>;
let uninstall: () => void;

beforeEach(() => {
  jest.clearAllMocks();
  fakeSupabase.reset();
  people = createFakePeople();
  uninstall = people.install();
  people.seedPerson({ id: 'p1', owner_id: 'u1', first_name: 'Ana' });
  upload.mockResolvedValue({ error: null });
  remove.mockResolvedValue({ error: null });
  global.fetch = jest.fn(async () => ({
    arrayBuffer: async () => new ArrayBuffer(8),
  })) as unknown as typeof fetch;
});
afterEach(() => uninstall());

describe('paths and cropping', () => {
  it('builds {owner}/{person}.jpg', () => {
    expect(buildPhotoPath('u1', 'p1')).toBe('u1/p1.jpg');
  });

  it('centers the largest square', () => {
    expect(squareCropRect(800, 600)).toEqual({ originX: 100, originY: 0, width: 600, height: 600 });
    expect(squareCropRect(300, 500)).toEqual({ originX: 0, originY: 100, width: 300, height: 300 });
  });
});

describe('preparePhoto', () => {
  const saveAsync = jest.fn();
  beforeEach(() => {
    saveAsync.mockResolvedValue({ uri: 'file:///out.jpg' });
    mockContext.renderAsync.mockResolvedValue({ saveAsync });
  });

  it('crops square, resizes to 500 and encodes JPEG at 0.8', async () => {
    const uri = await preparePhoto('file:///in.png', { width: 2000, height: 1000 });
    expect(mockContext.crop).toHaveBeenCalledWith({
      originX: 500,
      originY: 0,
      width: 1000,
      height: 1000,
    });
    expect(mockContext.resize).toHaveBeenCalledWith({ width: 500, height: 500 });
    expect(saveAsync).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.8 });
    expect(uri).toBe('file:///out.jpg');
  });

  it('does not upscale a small square image', async () => {
    await preparePhoto('file:///in.png', { width: 200, height: 200 });
    expect(mockContext.resize).not.toHaveBeenCalled();
  });
});

describe('uploadPersonPhoto', () => {
  it('uploads to the avatars bucket as JPEG with upsert, then saves photo_path', async () => {
    const path = await uploadPersonPhoto(person, 'file:///x.jpg');
    expect(path).toBe('u1/p1.jpg');
    expect(from).toHaveBeenCalledWith('avatars');
    expect(upload).toHaveBeenCalledWith('u1/p1.jpg', expect.any(ArrayBuffer), {
      contentType: 'image/jpeg',
      upsert: true,
    });
    expect(people.tables.persons![0]).toMatchObject({ photo_path: 'u1/p1.jpg' });
  });

  it('throws and leaves photo_path alone when the upload fails', async () => {
    const error = new Error('too big');
    upload.mockResolvedValue({ error });
    await expect(uploadPersonPhoto(person, 'file:///x.jpg')).rejects.toBe(error);
    expect(people.tables.persons![0]!.photo_path).toBeUndefined();
  });
});

describe('applyPhotoChange', () => {
  it('does nothing when unchanged', async () => {
    await applyPhotoChange(person, { kind: 'unchanged' });
    expect(upload).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('remove nulls photo_path and deletes the object', async () => {
    people.tables.persons![0]!.photo_path = 'u1/p1.jpg';
    await applyPhotoChange({ ...person, photo_path: 'u1/p1.jpg' }, { kind: 'remove' });
    expect(people.tables.persons![0]).toMatchObject({ photo_path: null });
    expect(remove).toHaveBeenCalledWith(['u1/p1.jpg']);
  });

  it('remove is a no-op when the person has no photo', async () => {
    await applyPhotoChange(person, { kind: 'remove' });
    expect(remove).not.toHaveBeenCalled();
  });
});

describe('getSignedPhotoUrls', () => {
  it('signs unique paths in one call for an hour and maps them by path', async () => {
    createSignedUrls.mockResolvedValue({
      data: [
        { path: 'u1/a.jpg', signedUrl: 'https://s/a', error: null },
        { path: 'u1/b.jpg', signedUrl: null, error: 'x' },
      ],
      error: null,
    });
    const urls = await getSignedPhotoUrls(['u1/a.jpg', 'u1/b.jpg', 'u1/a.jpg']);
    expect(createSignedUrls).toHaveBeenCalledWith(['u1/a.jpg', 'u1/b.jpg'], 3600);
    expect(urls).toEqual({ 'u1/a.jpg': 'https://s/a' });
  });

  it('skips the request for no paths', async () => {
    expect(await getSignedPhotoUrls([])).toEqual({});
    expect(createSignedUrls).not.toHaveBeenCalled();
  });
});
