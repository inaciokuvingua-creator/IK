import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import AdvancedModal from './AdvancedModal';

export default function DealPanel({ toId, onClose, onSent }: { toId: string; onClose: () => void; onSent?: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('Proposta de Negócio');
  const [description, setDescription] = useState('Olá, tenho uma proposta para si...');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState('AOA');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!user) return alert('Login necessário');
    if (!amount) return alert('Indique um valor');
    setSending(true);
    try {
      await supabase.from('deals').insert({
        from_id: user.id,
        to_id: toId,
        title,
        description,
        amount: Number(amount),
        currency,
        status: 'proposed',
        created_at: new Date()
      });
      onSent && onSent();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Erro ao enviar proposta');
    } finally {
      setSending(false);
    }
  };

  return (
    <AdvancedModal title="Enviar proposta" onClose={onClose} initialWidth={620} initialHeight={540}>
        <div className="grid grid-cols-1 gap-3">
          <input value={title} onChange={e => setTitle(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input type="number" value={amount as any} onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm flex-1" placeholder="Valor" />
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
              <option>AOA</option>
              <option>USD</option>
              <option>EUR</option>
              <option>ZWL</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button className="btn btn-ghost" onClick={onClose} disabled={sending}>Cancelar</button>
            <button className="btn bg-emerald-500 text-white" onClick={send} disabled={sending}>{sending ? 'A enviar...' : 'Enviar proposta'}</button>
          </div>
        </div>
    </AdvancedModal>
  );
}
