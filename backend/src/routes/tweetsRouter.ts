import { Router, type Request, type Response } from 'express';
import { getGeneratedTweets } from '../tweets/service/tweetService';

function parseLimit(req: Request, fallback: number): number {
  const raw = req.query.limit;
  const n = parseInt(String(raw ?? fallback), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 50);
}

export function createTweetsRouter(): Router {
  const router = Router();

  router.get('/tweets', async (req: Request, res: Response) => {
    try {
      const limit = parseLimit(req, 10);
      const result = await getGeneratedTweets({ limit, onlyHighlighted: true });
      res.json({ success: true, data: result.tweets, meta: result.meta });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Failed to generate tweets' });
    }
  });

  router.get('/tweets/top', async (req: Request, res: Response) => {
    try {
      const limit = parseLimit(req, 5);
      const result = await getGeneratedTweets({ limit, onlyHighlighted: false });
      res.json({ success: true, data: result.tweets, meta: result.meta });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Failed to generate top tweets' });
    }
  });

  return router;
}

