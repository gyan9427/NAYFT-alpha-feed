import mongoose, { Schema } from 'mongoose';

const COLLECTION = 'filtered_coins';

const filteredReadSchema = new Schema(
  {
    base_asset: String,
  },
  { collection: COLLECTION, strict: false }
);

const FilteredRead =
  mongoose.models.NayftFilteredRead || mongoose.model('NayftFilteredRead', filteredReadSchema, COLLECTION);

export const coinsRepo = {
  async listDistinctBaseAssets(): Promise<string[]> {
    const raw = await FilteredRead.distinct('base_asset', {
      base_asset: { $exists: true, $nin: [null, ''] },
    });
    return (raw as string[]).map((s) => String(s).trim().toUpperCase()).filter(Boolean);
  },
};
