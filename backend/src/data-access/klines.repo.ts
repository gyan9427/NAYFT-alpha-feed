import mongoose, { Schema } from 'mongoose';
import type { KlineCandleDto } from './dtos';

const COLLECTION = 'ohlcv_klines';

const klineReadSchema = new Schema(
  {
    meta: {
      exchange: String,
      symbol: String,
      interval: String,
    },
    openTime: Date,
    open: Number,
    high: Number,
    low: Number,
    close: Number,
    volume: Number,
  },
  { collection: COLLECTION, strict: false }
);

const KlineRead =
  mongoose.models.NayftKlineRead || mongoose.model('NayftKlineRead', klineReadSchema, COLLECTION);

function toDto(d: {
  openTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}): KlineCandleDto {
  return {
    openTime: d.openTime,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume,
  };
}

export const klinesRepo = {
  async find1mKlines(params: {
    exchange: string;
    symbol: string;
    from: Date;
    to: Date;
    limit?: number;
  }): Promise<KlineCandleDto[]> {
    const { exchange, symbol, from, to, limit = 2000 } = params;
    const docs = await KlineRead.find({
      'meta.exchange': exchange,
      'meta.symbol': symbol.toUpperCase(),
      'meta.interval': '1m',
      openTime: { $gte: from, $lte: to },
    })
      .sort({ openTime: -1 })
      .limit(limit)
      .lean();

    const arr = docs as unknown as Array<{
      openTime: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    return arr.reverse().map(toDto);
  },

  /**
   * Latest close at or before `at` (for news-impact baseline).
   */
  async findCloseAtOrBefore(params: {
    exchange: string;
    symbol: string;
    at: Date;
  }): Promise<number | null> {
    const { exchange, symbol, at } = params;
    const doc = await KlineRead.findOne({
      'meta.exchange': exchange,
      'meta.symbol': symbol.toUpperCase(),
      'meta.interval': '1m',
      openTime: { $lte: at },
    })
      .sort({ openTime: -1 })
      .lean();

    const row = doc as { close?: number } | null;
    return row?.close != null ? Number(row.close) : null;
  },
};
