require('dotenv').config();
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const base = `http://localhost:${process.env.PORT || 4000}`;
let cookie = '';
let planId, clientId, subscriptionId, barberId, appointmentId;

async function call(path, method = 'GET', body) {
  const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
  return { response, data };
}

async function main() {
  try {
    const login = await call('/auth/login', 'POST', { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD });
    cookie = login.response.headers.get('set-cookie')?.split(';')[0] || '';
    assert.equal(login.data.user.role, 'ADMIN');
    const unique = Date.now();
    const service = (await call('/services')).data[0];
    assert.ok(service?.id);
    const plan = (await call('/subscription-plans', 'POST', { name: `Plano teste ${unique}`, description: 'Verificação automatizada', price: 7.43, visitsPerMonth: 1, serviceIds: [service.id] })).data;
    planId = plan.id;
    const client = (await call('/clients', 'POST', { name: `Cliente teste ${unique}` })).data;
    clientId = client.id;
    const barber = (await call('/users', 'POST', { name: `Barbeiro teste ${unique}`, email: `barber${unique}@example.local`, password: 'temporary-test-password-123', commission: 40, workStart: '09:00', workEnd: '19:00' })).data;
    barberId = barber.id;
    const now = new Date();
    const subscription = (await call('/subscriptions', 'POST', { clientId, planId, startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(), billingDay: Math.min(28, now.getUTCDate()) })).data;
    subscriptionId = subscription.id;
    const list = (await call('/subscriptions')).data;
    const found = list.find(item => item.id === subscriptionId);
    assert.equal(found?.payments.length, 1);
    const payment = found.payments[0];
    assert.equal(payment.status, 'PENDENTE');
    await call(`/subscription-payments/${payment.id}/pay`, 'POST');
    const visitDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
    const appointment = (await call('/appointments', 'POST', { barberId, clientId, serviceId: service.id, subscriptionId, date: visitDate.toISOString() })).data;
    appointmentId = appointment.id;
    await call(`/appointments/${appointmentId}/status`, 'PATCH', { status: 'CONCLUIDO' });
    const secondDate = new Date(visitDate.getTime() + 3 * 3600000);
    const limitResponse = await fetch(`${base}/appointments`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ barberId, clientId, serviceId: service.id, subscriptionId, date: secondDate.toISOString() }) });
    assert.equal(limitResponse.status, 409);
    const from = new Date(Date.now() - 60000).toISOString();
    const to = new Date(Date.now() + 60000).toISOString();
    const finance = (await call(`/finance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)).data;
    assert.ok(finance.subscriptionGross >= 7.43);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
    const monthFinance = (await call(`/finance?from=${encodeURIComponent(monthStart)}&to=${encodeURIComponent(monthEnd)}`)).data;
    assert.equal(monthFinance.serviceGross, 0);
    assert.ok(monthFinance.rows.some(row => row.id === appointmentId && row.price === 0));
    const dashboard = (await call(`/finance/dashboard?from=${encodeURIComponent(monthStart)}&to=${encodeURIComponent(monthEnd)}`)).data;
    assert.ok(dashboard.selected.subscriptionGross >= 7.43);
    assert.ok(dashboard.services.some(item => item.id === service.id));
    assert.ok(dashboard.barbers.some(item => item.id === barberId && item.count === 1 && item.commission > 0));
    const csv = await fetch(`${base}/finance/export.csv?from=${encodeURIComponent(monthStart)}&to=${encodeURIComponent(monthEnd)}`, { headers: { Cookie: cookie } });
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get('content-type'), /text\/csv/);
    assert.match(await csv.text(), /Mensalidade/);
    const barberLogin = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: barber.email, password: 'temporary-test-password-123' }) });
    const barberCookie = barberLogin.headers.get('set-cookie')?.split(';')[0] || '';
    assert.equal(barberLogin.status, 200);
    for (const path of ['/finance', '/finance/dashboard', '/finance/export.csv']) {
      const response = await fetch(`${base}${path}?from=${encodeURIComponent(monthStart)}&to=${encodeURIComponent(monthEnd)}`, { headers: { Cookie: barberCookie } });
      assert.equal(response.status, 403, `${path} deve ser exclusivo de ADMIN`);
    }
    const own = await fetch(`${base}/earnings/me?from=${encodeURIComponent(monthStart)}&to=${encodeURIComponent(monthEnd)}`, { headers: { Cookie: barberCookie } });
    assert.equal(own.status, 200);
    assert.equal((await own.json()).count, 1);
    await call(`/subscriptions/${subscriptionId}`, 'PATCH', { status: 'PAUSADA' });
    await call(`/subscriptions/${subscriptionId}`, 'PATCH', { status: 'ATIVA' });
    console.log('Assinaturas, agenda, relatório, CSV e RBAC financeiro OK.');
  } finally {
    if (appointmentId) { await prisma.appointmentReminder.deleteMany({ where: { appointmentId } }); await prisma.appointment.delete({ where: { id: appointmentId } }); }
    if (subscriptionId) { await prisma.subscriptionPayment.deleteMany({ where: { subscriptionId } }); await prisma.clientSubscription.delete({ where: { id: subscriptionId } }); }
    if (clientId) await prisma.client.delete({ where: { id: clientId } });
    if (barberId) await prisma.user.delete({ where: { id: barberId } });
    if (planId) await prisma.subscriptionPlan.delete({ where: { id: planId } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
