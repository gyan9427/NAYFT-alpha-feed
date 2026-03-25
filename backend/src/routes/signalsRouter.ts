import { Router, type Request, type Response } from 'express';
import { signalsRepo } from '../data-access/signals.repo';

function parseLimit(req: Request, fallback: number): number {
  const raw = req.query.limit;
  const n = parseInt(String(raw ?? fallback), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 200);
}

export function createSignalsRouter(): Router {
  const router = Router();

  router.get('/signals', async (req: Request, res: Response) => {
    try {
      const limit = parseLimit(req, 20);
      const data = await signalsRepo.findLatest({ limit });
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Failed to load signals' });
    }
  });

  router.get('/signals/high-confidence', async (req: Request, res: Response) => {
    try {
      const limit = parseLimit(req, 20);
      const data = await signalsRepo.findHighConfidence({ minStrength: 0.7, limit });
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Failed to load signals' });
    }
  });

  router.get('/signals/:coin', async (req: Request, res: Response) => {
    try {
      const limit = parseLimit(req, 20);
      const coin = String(req.params.coin || '').trim();
      if (!coin) {
        res.status(400).json({ success: false, error: 'coin required' });
        return;
      }
      const data = await signalsRepo.findByCoin({ coin, limit });
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Failed to load signals' });
    }
  });

  return router;
}
