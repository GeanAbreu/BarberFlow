import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'apps', 'api', '.env');
if (existsSync(target)) {
  console.log('Configuração local já existe em apps/api/.env. Nenhuma credencial foi alterada.');
  process.exit(0);
}
const dbPassword = randomBytes(24).toString('base64url');
const adminPassword = randomBytes(18).toString('base64url');
const jwtSecret = randomBytes(48).toString('base64url');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, [
  `DATABASE_URL="postgresql://postgres:${dbPassword}@localhost:5432/barberflow?schema=public"`,
  `JWT_SECRET="${jwtSecret}"`,
  'PORT=4000',
  'WEB_ORIGIN="http://localhost:3000"',
  'SEED_ADMIN_EMAIL="admin@barberflow.local"',
  `SEED_ADMIN_PASSWORD="${adminPassword}"`,
  ''
].join('\n'), { mode: 0o600 });
console.log('Configuração local criada em apps/api/.env.');
console.log(`Login administrador: admin@barberflow.local`);
console.log(`Senha inicial: ${adminPassword}`);
