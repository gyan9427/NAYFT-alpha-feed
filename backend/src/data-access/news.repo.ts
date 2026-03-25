import mongoose, { Schema } from 'mongoose';
import type { NewsArticleDto } from './dtos';

const COLLECTION = 'newsarticles';

const newsReadSchema = new Schema(
  {
    externalId: String,
    title: String,
    publishedAt: Date,
    coins: [{ symbol: String, name: String }],
  },
  { collection: COLLECTION, strict: false }
);

const NewsRead =
  mongoose.models.NayftNewsRead || mongoose.model('NayftNewsRead', newsReadSchema, COLLECTION);

export const newsRepo = {
  async findPublishedSince(params: { since: Date; limit?: number }): Promise<NewsArticleDto[]> {
    const { since, limit = 500 } = params;
    const docs = await NewsRead.find({
      publishedAt: { $gte: since },
      coins: { $exists: true, $ne: [] },
    })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean();

    return (docs as unknown as Array<{
      _id: unknown;
      externalId?: string;
      title: string;
      publishedAt: Date;
      coins?: Array<{ symbol: string }>;
    }>).map((d) => ({
      id: String(d._id),
      title: d.title,
      publishedAt: d.publishedAt,
      coinSymbols: (d.coins ?? []).map((c) => String(c.symbol).toUpperCase()).filter(Boolean),
    }));
  },
};
