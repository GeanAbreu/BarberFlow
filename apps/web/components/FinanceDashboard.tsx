'use client';
import { useCallback, useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownToLine, Banknote, CalendarDays, ChartNoAxesCombined, Scissors, UsersRound, Wallet } from 'lucide-react';
import Skull from './Skull';
import { API, money, request } from '../lib/api';

type Report = {
  cards: { day: number; week: number; month: number; appointments: number; clients: number; averageTicket: number };
  selected: { gross: number; serviceGross: number; subscriptionGross: number; appointments: number };
  daily: { date: string; revenue: number }[];
  services: { id: string; name: string; count: number }[];
  barbers: { id: string; name: string; count: number; gross: number; commission: number }[];
};
type Period = 'semana' | 'quinzena' | 'mes' | 'personalizado';
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const initialRange = () => { const now = new Date(); return { from: localDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: localDate(now) }; };
const query = (from: string, to: string) => { const end = new Date(`${to}T00:00:00`); end.setDate(end.getDate() + 1); return new URLSearchParams({ from: new Date(`${from}T00:00:00`).toISOString(), to: end.toISOString() }).toString(); };
const chartColors = ['#d7b47b', '#f2e5cf', '#8c8b87', '#5e584e', '#b7a78e', '#74726e'];

export default function FinanceDashboard() {
  const [period, setPeriod] = useState<Period>('mes');
  const [range, setRange] = useState(initialRange);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const params = query(range.from, range.to);
  const reload = useCallback(async () => { setBusy(true); setError(''); try { setReport(await request<Report>(`/finance/dashboard?${query(range.from, range.to)}`)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }, [range]);
  useEffect(() => { void reload(); }, [reload]);
  function selectPeriod(value: Period) {
    setPeriod(value);
    if (value === 'personalizado') return;
    const today = new Date(); const start = new Date(today);
    if (value === 'semana') start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    if (value === 'quinzena') start.setDate(today.getDate() - 14);
    if (value === 'mes') start.setDate(1);
    setRange({ from: localDate(start), to: localDate(today) });
  }
  async function exportCsv() {
    setExporting(true); setError('');
    try {
      const response = await fetch(`${API}/finance/export.csv?${params}`, { credentials: 'include' });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || 'Falha ao exportar.'); }
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a');
      link.href = url; link.download = `barberflow-financeiro-${range.from}-${range.to}.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (e) { setError((e as Error).message); } finally { setExporting(false); }
  }
  const metric = (label: string, value: string, caption: string, Icon: typeof Wallet) => <div className="relative min-h-36 overflow-hidden rounded-xl border border-[#292929] bg-[#141414] p-5"><div className="relative z-10 flex items-center justify-between text-[10px] font-bold tracking-[.14em] text-[#a6a49e]"><span>{label}</span><Icon size={18} className="text-[#d7b47b]"/></div><strong className="relative z-10 mt-6 block text-2xl font-bold text-white sm:text-3xl">{value}</strong><small className="relative z-10 mt-1 block text-[11px] text-[#888782]">{caption}</small><Skull className="pointer-events-none absolute -bottom-10 right-1 h-32 w-32 opacity-[.035]"/></div>;
  return <div className="space-y-6 pb-12">
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-[#292929] bg-[#111] p-5">
      <div><p className="mb-2 text-[10px] font-bold tracking-[.18em] text-[#d7b47b]">CAIXA E RELATÓRIOS</p><h2 className="m-0 text-3xl text-white" style={{ fontFamily: 'Jolly Lodger, Georgia, serif' }}>Panorama financeiro</h2><p className="mb-0 mt-1 text-xs text-[#96948e]">Valores recebidos, produção da equipe e comissões.</p></div>
      <button className="flex items-center gap-2 rounded-lg border border-[#d7b47b] bg-[#d7b47b] px-4 py-2.5 text-xs font-bold text-black hover:bg-[#e6c796] disabled:opacity-50" onClick={exportCsv} disabled={exporting || busy}><ArrowDownToLine size={16}/>{exporting ? 'Exportando...' : 'Exportar CSV'}</button>
    </div>
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#292929] bg-[#111] p-4"><div className="flex flex-wrap gap-2">{(['semana','quinzena','mes','personalizado'] as Period[]).map(value => <button key={value} onClick={() => selectPeriod(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize ${period === value ? 'bg-[#d7b47b] text-black' : 'border border-[#303030] bg-[#1a1a1a] text-[#aaa]'}`}>{value === 'mes' ? 'Este mês' : value === 'semana' ? 'Esta semana' : value === 'quinzena' ? 'Últimos 15 dias' : 'Personalizado'}</button>)}</div><div className="ml-auto flex flex-wrap items-end gap-2"><label className="text-[10px] text-[#aaa]">DE <input aria-label="Data inicial" type="date" value={range.from} max={range.to} onChange={e => { setPeriod('personalizado'); setRange(r => ({ ...r, from: e.target.value })); }} className="mt-1 block rounded-md border border-[#303030] bg-[#191919] px-2 py-1.5 text-xs text-white"/></label><label className="text-[10px] text-[#aaa]">ATÉ <input aria-label="Data final" type="date" value={range.to} min={range.from} onChange={e => { setPeriod('personalizado'); setRange(r => ({ ...r, to: e.target.value })); }} className="mt-1 block rounded-md border border-[#303030] bg-[#191919] px-2 py-1.5 text-xs text-white"/></label></div></div>
    {error && <div role="alert" className="rounded-lg border border-[#a44848] bg-[#321b1b] p-3 text-sm text-[#ffb7b7]">{error}</div>}
    {busy && <div className="py-14 text-center text-sm text-[#aaa]">Carregando relatório...</div>}
    {report && !busy && <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{metric('FATURAMENTO DE HOJE', money(report.cards.day), 'Serviços e mensalidades recebidas', Wallet)}{metric('FATURAMENTO DA SEMANA', money(report.cards.week), 'Semana atual, segunda a domingo', CalendarDays)}{metric('FATURAMENTO DO MÊS', money(report.cards.month), 'Mês corrente', ChartNoAxesCombined)}{metric('ATENDIMENTOS NO PERÍODO', String(report.cards.appointments).padStart(2,'0'), 'Serviços concluídos', Scissors)}{metric('TICKET MÉDIO POR CLIENTE', money(report.cards.averageTicket), `${report.cards.clients} clientes atendidos ou pagantes`, UsersRound)}{metric('RECEITA NO PERÍODO', money(report.selected.gross), `${money(report.selected.serviceGross)} serviços · ${money(report.selected.subscriptionGross)} assinaturas`, Banknote)}</div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]"><section className="rounded-xl border border-[#292929] bg-[#121212] p-5"><h3 className="m-0 text-2xl text-white" style={{ fontFamily: 'Jolly Lodger, Georgia, serif' }}>Faturamento diário</h3><p className="mt-1 text-xs text-[#92918c]">Mês atual · serviços e mensalidades efetivamente recebidos</p><div className="mt-5 h-72 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={report.daily}><defs><linearGradient id="financeGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d7b47b" stopOpacity={0.3}/><stop offset="100%" stopColor="#d7b47b" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#282828" vertical={false}/><XAxis dataKey="date" tickFormatter={value => value.slice(8)} stroke="#787771" tickLine={false} axisLine={false} fontSize={11}/><YAxis stroke="#787771" tickLine={false} axisLine={false} fontSize={11} tickFormatter={value => `${value}`}/><Tooltip contentStyle={{ background:'#1c1c1c', border:'1px solid #444', borderRadius:8, color:'#fff' }} formatter={value => [money(Number(value)), 'Faturamento']} labelFormatter={value => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')}/><Area type="monotone" dataKey="revenue" stroke="#d7b47b" strokeWidth={3} fill="url(#financeGradient)"/></AreaChart></ResponsiveContainer></div></section>
      <section className="rounded-xl border border-[#292929] bg-[#121212] p-5"><h3 className="m-0 text-2xl text-white" style={{ fontFamily: 'Jolly Lodger, Georgia, serif' }}>Serviços mais vendidos</h3><p className="mt-1 text-xs text-[#92918c]">Atendimentos concluídos no período selecionado</p>{report.services.length ? <><div className="h-52 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={report.services} dataKey="count" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={3} stroke="none">{report.services.map((item, index) => <Cell key={item.id} fill={chartColors[index % chartColors.length]}/>)}</Pie><Tooltip contentStyle={{ background:'#1c1c1c', border:'1px solid #444', borderRadius:8, color:'#fff' }}/></PieChart></ResponsiveContainer></div><div className="space-y-2">{report.services.slice(0,6).map((service,index) => <div key={service.id} className="flex items-center gap-2 text-xs text-[#c9c8c3]"><i className="h-2 w-2 rounded-full" style={{background:chartColors[index % chartColors.length]}}/><span className="flex-1">{service.name}</span><strong className="text-white">{service.count}</strong></div>)}</div></> : <p className="py-20 text-center text-xs text-[#888]">Nenhum serviço concluído no período.</p>}</section></div>
      <section className="overflow-hidden rounded-xl border border-[#292929] bg-[#121212]"><div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#292929] p-5"><div><h3 className="m-0 text-2xl text-white" style={{ fontFamily: 'Jolly Lodger, Georgia, serif' }}>Comissões por barbeiro</h3><p className="mb-0 mt-1 text-xs text-[#92918c]">Produção inclui atendimentos cobertos por assinatura; receita recebida considera a mensalidade separadamente.</p></div><span className="text-[10px] font-bold tracking-[.12em] text-[#d7b47b]">{range.from.split('-').reverse().join('/')} — {range.to.split('-').reverse().join('/')}</span></div><div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-left text-xs"><thead><tr className="border-b border-[#292929] text-[10px] tracking-[.12em] text-[#92918c]"><th className="p-4">BARBEIRO</th><th className="p-4 text-right">ATENDIMENTOS</th><th className="p-4 text-right">PRODUÇÃO BRUTA</th><th className="p-4 text-right">COMISSÃO A PAGAR</th></tr></thead><tbody>{report.barbers.map(barber => <tr key={barber.id} className="border-b border-[#252525] text-[#dfded9] last:border-0"><td className="p-4 font-semibold text-white">{barber.name}</td><td className="p-4 text-right">{barber.count}</td><td className="p-4 text-right">{money(barber.gross)}</td><td className="p-4 text-right font-bold text-[#d7b47b]">{money(barber.commission)}</td></tr>)}{!report.barbers.length && <tr><td colSpan={4} className="p-8 text-center text-[#888]">Nenhum atendimento concluído no período.</td></tr>}</tbody><tfoot><tr className="border-t border-[#45413a] bg-[#191816] font-bold text-white"><td className="p-4">TOTAL</td><td className="p-4 text-right">{report.barbers.reduce((sum,b) => sum+b.count,0)}</td><td className="p-4 text-right">{money(report.barbers.reduce((sum,b) => sum+b.gross,0))}</td><td className="p-4 text-right text-[#d7b47b]">{money(report.barbers.reduce((sum,b) => sum+b.commission,0))}</td></tr></tfoot></table></div></section>
    </>}
  </div>;
}
