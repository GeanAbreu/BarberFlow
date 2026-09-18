import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, 'apps', 'api', '.env');
if (!existsSync(envPath)) throw new Error('Execute npm run db:local:setup primeiro.');
const contents = readFileSync(envPath, 'utf8');
const urlValue = contents.match(/^DATABASE_URL="?([^"\r\n]+)"?/m)?.[1];
if (!urlValue) throw new Error('DATABASE_URL não encontrado em apps/api/.env');
const url = new URL(urlValue);
if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('db:local exige DATABASE_URL apontando para localhost.');
const dir = join(root, '.local-data', 'postgres');
const pg = new EmbeddedPostgres({ databaseDir: dir, user: url.username, password: decodeURIComponent(url.password), port: Number(url.port || 5432), persistent: true, onLog: () => {}, onError: error => console.error(error) });
if (!existsSync(join(dir, 'PG_VERSION'))) await pg.initialise();
await pg.start();
try { await pg.createDatabase(url.pathname.slice(1)); }
catch (error) { if (error?.code !== '42P04') throw error; }
console.log(`PostgreSQL local pronto em ${url.hostname}:${url.port || 5432}.`);
process.on('SIGINT', async () => { await pg.stop(); process.exit(0); });
process.on('SIGTERM', async () => { await pg.stop(); process.exit(0); });
