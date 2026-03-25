import mongoose, { Schema } from 'mongoose';
import type { NayftSignalDoc, NayftSignalType } from './dtos';

const COLLECTION = 'nayft_signals';

const nayftSignalSchema = new Schema(
  {
    coin: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ['price_spike', 'volume_spike', 'news_impact'] },
    strength: { type: Number, required: true, min: 0, max: 1 },
    timestamp: { type: Date, required: true, index: true },
    meta: { type: Schema.Types.Mixed, required: true },
    insight: { type: String, required: true },
  },
  { collection: COLLECTION, timestamps: false }
);

nayftSignalSchema.index({ timestamp: -1 });
nayftSignalSchema.index({ coin: 1, timestamp: -1 });
nayftSignalSchema.index({ type: 1, timestamp: -1 });
nayftSignalSchema.index({ coin: 1, type: 1, timestamp: -1 });

const NayftSignalModel =
  mongoose.models.NayftSignal || mongoose.model('NayftSignal', nayftSignalSchema, COLLECTION);

export const signalsRepo = {
  async insertMany(docs: NayftSignalDoc[]): Promise<number> {
    if (docs.length === 0) return 0;
    await NayftSignalModel.insertMany(docs as unknown as Record<string, unknown>[], { ordered: false });
    return docs.length;
  },

  async existsRecent(params: {
    coin: string;
    type: NayftSignalType;
    since: Date;
  }): Promise<boolean> {
    const doc = await NayftSignalModel.findOne({
      coin: params.coin.toUpperCase(),
      type: params.type,
      timestamp: { $gte: params.since },
    })
      .select('_id')
      .lean();
    return doc != null;
  },

  async findLatest(params: { limit: number }): Promise<NayftSignalDoc[]> {
    const docs = await NayftSignalModel.find({})
      .sort({ timestamp: -1 })
      .limit(params.limit)
      .lean();
    return docs.map((d) => ({
      coin: d.coin,
      type: d.type as NayftSignalType,
      strength: d.strength,
      timestamp: d.timestamp,
      meta: (d.meta as Record<string, unknown>) ?? {},
      insight: d.insight,
    }));
  },

  async findByCoin(params: { coin: string; limit: number }): Promise<NayftSignalDoc[]> {
    const docs = await NayftSignalModel.find({ coin: params.coin.toUpperCase() })
      .sort({ timestamp: -1 })
      .limit(params.limit)
      .lean();
    return docs.map((d) => ({
      coin: d.coin,
      type: d.type as NayftSignalType,
      strength: d.strength,
      timestamp: d.timestamp,
      meta: (d.meta as Record<string, unknown>) ?? {},
      insight: d.insight,
    }));
  },

  async findHighConfidence(params: { minStrength: number; limit: number }): Promise<NayftSignalDoc[]> {
    const docs = await NayftSignalModel.find({ strength: { $gt: params.minStrength } })
      .sort({ timestamp: -1 })
      .limit(params.limit)
      .lean();
    return docs.map((d) => ({
      coin: d.coin,
      type: d.type as NayftSignalType,
      strength: d.strength,
      timestamp: d.timestamp,
      meta: (d.meta as Record<string, unknown>) ?? {},
      insight: d.insight,
    }));
  },

  async ensureIndexes(): Promise<void> {
    await NayftSignalModel.syncIndexes();
  },
};
