import React, { useEffect, useState, useRef } from 'react';

import { supabase } from '../lib/supabase';
import UserCard from '../components/Community/UserCard';
import CommunityFeed from '../components/Community/CommunityFeed';

export default function Comunidades() {
  const [users, setUsers] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(0);

  const load = async (reset = false) => {
    setLoading(true);
    try {
      const page = reset ? 0 : pageRef.current;
      const limit = 20;
      const queryText = query.trim();
      let builder = supabase.from('user_profiles').select('*').order('updated_at', { ascending: false });
      if (queryText) {
        const q = `%${queryText}%`;
        builder = builder.or(`nome.ilike.${q},bio.ilike.${q},company.ilike.${q},profession.ilike.${q},country.ilike.${q}`);
      }
      const { data } = await builder.range(page * limit, page * limit + limit - 1);
      if (reset) setUsers(data || []);
      else setUsers((u) => [...u, ...(data || [])]);
      pageRef.current = page + 1;
    } catch (e) {
      console.error('Comunidades load error', e);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(true); }, [query]);

  return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Comunidades</h1>
          <div className="w-96">
            <input placeholder="Pesquisar pessoas, lojas, produtos..." value={query} onChange={(e) => setQuery(e.target.value)} className="input w-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <h3 className="font-semibold">Filtros</h3>
              <div className="mt-2 text-sm text-gray-400">Nome, País, Cidade, Profissão, Empresa, Loja, Categoria, Área, Último acesso, Verificados</div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <h3 className="font-semibold">Utilizadores</h3>
              <div className="mt-3 space-y-3">
                {users.slice(0, 10).map((u) => (<UserCard key={u.id} user={u} compact />))}
                {users.length === 0 && <div className="text-gray-500">Nenhum utilizador encontrado</div>}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <CommunityFeed query={query} />
          </div>
        </div>
      </div>
  );
}
