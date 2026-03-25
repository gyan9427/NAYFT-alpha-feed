import mongoose from 'mongoose';

export async function connectMongo(uri: string): Promise<void> {
  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10_000,
  });
}
