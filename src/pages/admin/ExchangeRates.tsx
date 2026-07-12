import React, { useEffect, useState } from 'react';
import { listRates, upsertRate, deleteRateByCurrency, fetchAndStoreExternal } from '../../lib/exchangeRates';
 
export default function ExchangeRatesAdmin() {
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [rate, setRate] = useState('1');

  const load = async () => { setLoading(true); try { const r = await listRates(); setRates(r); } catch (e) { console.error(e); } finally { setLoading(false); } };

  useEffect(() => { load(); }, []);

  const doSave = async () => {
    try {
      await upsertRate(currency.toUpperCase(), Number(rate));
      setCurrency(''); setRate('1');
      await load();
    } catch (e) { console.error(e); }
  };

  const doDelete = async (c: string) => { if (!confirm(`Excluir taxa ${c}?`)) return; try { await deleteRateByCurrency(c); await load(); } catch (e) { console.error(e); } };

  const doFetchExternal = async () => { setLoading(true); try { await fetchAndStoreExternal('KZ'); await load(); } catch (e) { console.error(e); alert('Falha ao buscar taxas externas'); } finally { setLoading(false); } };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Taxas de Câmbio (Admin)</h2>
      <div className="mt-4 flex gap-2">
        <input className="input" placeholder="Moeda (ex: USD)" value={currency} onChange={(e) => setCurrency(e.target.value)} />
        <input className="input" placeholder="Rate" value={rate} onChange={(e) => setRate(e.target.value)} />
        <button className="btn btn-primary" onClick={doSave}>Salvar</button>
        <button className="btn" onClick={doFetchExternal} disabled={loading}>{loading ? 'Buscando...' : 'Buscar Externas'}</button>
      </div>
      <div className="mt-4">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="py-2">Moeda</th>
              <th className="py-2">Rate</th>
              <th className="py-2">Atualizado</th>
              <th className="py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.currency} className="border-t">
                <td className="py-2">{r.currency}</td>
                <td className="py-2">{Number(r.rate).toFixed(6)}</td>
                <td className="py-2">{r.fetched_at}</td>
                <td className="py-2"><button className="btn btn-ghost" onClick={() => doDelete(r.currency)}>Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
