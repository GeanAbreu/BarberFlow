export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers }, cache: 'no-store' });
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || 'Não foi possível concluir a operação.'); }
  if (res.status === 204) return undefined as T;
  return res.json();
}
export const money = (value: number | string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
export const dateRange = (day: string) => {
  const from = new Date(`${day}T00:00:00`);
  const to = new Date(from); to.setDate(to.getDate() + 1);
  return `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
};
export const monthRange = (day: string) => {
  const [y, m] = day.split('-').map(Number);
  return `from=${encodeURIComponent(new Date(y, m - 1, 1).toISOString())}&to=${encodeURIComponent(new Date(y, m, 1).toISOString())}`;
};
