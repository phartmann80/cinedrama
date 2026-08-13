import { defineConfig } from 'drizzle-kit';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set before running drizzle-kit.');
}

export default defineConfig({
  schema: path.join(__dirname, './src/db/schema.ts'),
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
