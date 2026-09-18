'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import Skull from './Skull';
import { request } from '../lib/api';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    try { await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); router.push('/agenda'); router.refresh(); }
    catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  }
  return <main className="login-page"><div className="login-noise"/><div className="login-art"><div className="art-ring"><Skull className="hero-skull"/></div><div className="art-caption">TRADIÇÃO &amp; PRECISÃO <span>✦</span> DESDE SEMPRE</div><p>Seu negócio sob controle.<br/>Do primeiro corte ao último detalhe.</p></div><div className="login-panel"><div className="login-card"><div className="eyebrow"><span className="eyebrow-line"/> ACESSO RESTRITO</div><div className="mobile-skull"><Skull/></div><h1>Bem-vindo<br/><em>de volta.</em></h1><p className="login-subtitle">Entre para comandar o dia na sua barbearia.</p><form onSubmit={submit}><label>E-MAIL PROFISSIONAL<div className="input-icon"><Mail size={18}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" required autoComplete="email"/></div></label><label>SENHA<div className="input-icon"><LockKeyhole size={18}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha" required autoComplete="current-password"/></div></label>{error && <p className="form-error">{error}</p>}<button className="button button-primary login-submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar no sistema'}<ArrowRight size={18}/></button></form><div className="login-foot">BARBERFLOW <span>✦</span> GESTÃO DE BARBEARIA</div></div></div></main>;
}
