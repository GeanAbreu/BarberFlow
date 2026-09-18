import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) throw new Error('Configure SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD (mínimo 12 caracteres).');
  await prisma.user.upsert({ where: { email }, update: {}, create: { name: 'Administrador', email, password: await bcrypt.hash(password, 12), role: 'ADMIN' } });
  for (const service of [
    { name: 'Corte clássico', description: 'Corte, acabamento e finalização.', duration: 45, price: 55 },
    { name: 'Barba tradicional', description: 'Toalha quente, navalha e cuidado.', duration: 30, price: 40 },
    { name: 'Combo completo', description: 'Corte e barba em uma sessão.', duration: 75, price: 85 }
  ]) {
    const exists = await prisma.service.findFirst({ where: { name: service.name } });
    if (!exists) await prisma.service.create({ data: service });
  }
}
main().finally(() => prisma.$disconnect());
