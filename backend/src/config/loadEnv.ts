import dotenv from 'dotenv';
import path from 'path';

/** Load .env from NAYFT-alpha-feed/backend then repo root. */
export function loadEnv(): void {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}
