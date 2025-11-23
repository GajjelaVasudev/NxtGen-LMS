import { Router, Request, Response } from 'express';
import { supabase } from '../../supabaseClient.js';
import { REGISTERED_USERS } from '../auth.js';

const router = Router();

// GET /api/_debug/demo-mappings
router.get('/demo-mappings', async (req: Request, res: Response) => {
  const adminSecret = process.env.ADMIN_SECRET || '';
  const provided = (req.query.admin_secret as string) || (req.headers['admin_secret'] as string) || (req.headers['x-admin-secret'] as string) || '';
  if (!adminSecret || provided !== adminSecret) {
    return res.status(403).json({ error: 'admin secret required' });
  }

  console.log('[debug/demo-mappings] Checking demo mapping…');

  try {
    const emails = REGISTERED_USERS.map((u: any) => u.email);
    const { data, error } = await supabase.from('users').select('id,email').in('email', emails as string[]);

    console.log('[debug/demo-mappings] Supabase returned:', { data, error });

    // Build mapping list preserving demo order
    const mappings = REGISTERED_USERS.map((u: any) => {
      const found = Array.isArray(data) ? data.find((d: any) => String(d.email).toLowerCase() === String(u.email).toLowerCase()) : null;
      return {
        demoId: String(u.id),
        email: u.email,
        dbId: found ? found.id : null,
      };
    });

    return res.json({ mappings });
  } catch (err: any) {
    console.error('[debug/demo-mappings] Error:', err);
    return res.status(500).json({ error: 'unexpected error' });
  }
});

export default router;
