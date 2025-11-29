import { RequestHandler } from 'express';
import multer from 'multer';
import { supabase } from '../supabaseClient.js';
import path from 'path';

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/upload
export const uploadHandler: RequestHandler = (req, res, next) => {
  // multer middleware handles multipart parsing; this wrapper allows using in express route
  next();
};

export const uploadMiddleware = upload.single('file');

export async function handleUpload(req: any, res: any) {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const file = req.file;
    const originalName = file.originalname || `upload-${Date.now()}`;
    const ext = path.extname(originalName) || '';
    const id = `${Date.now()}-${Math.floor(Math.random() * 100000)}${ext}`;

    const bucket = process.env.SUPABASE_UPLOAD_BUCKET || 'course-assets';
    // attempt upload
    const { data, error } = await supabase.storage.from(bucket).upload(id, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    }).catch((e) => ({ data: null, error: e }));

    if (error) {
      // Try to create bucket if missing (dev convenience)
      try {
        await supabase.storage.createBucket(bucket, { public: true });
        const retry = await supabase.storage.from(bucket).upload(id, file.buffer, { contentType: file.mimetype });
        if (retry.error) {
          console.error('[upload] upload retry failed', retry.error);
          return res.status(500).json({ error: 'Failed to upload file' });
        }
        const url = supabase.storage.from(bucket).getPublicUrl(id).data.publicUrl;
        return res.json({ success: true, url });
      } catch (createErr) {
        console.error('[upload] create bucket failed', createErr);
        return res.status(500).json({ error: 'Upload failed and could not create bucket' });
      }
    }

    // get public URL
    const publicRes = supabase.storage.from(bucket).getPublicUrl(id);
    const publicUrl = publicRes?.data?.publicUrl || null;
    return res.json({ success: true, url: publicUrl });
  } catch (err: any) {
    console.error('[upload] unexpected error', err);
    return res.status(500).json({ error: 'Unexpected upload error' });
  }
}
