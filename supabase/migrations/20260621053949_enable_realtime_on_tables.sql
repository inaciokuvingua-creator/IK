-- Enable Supabase Realtime publication for all financial tables
-- This allows postgres_changes subscriptions to fire correctly

ALTER PUBLICATION supabase_realtime ADD TABLE cofres;
ALTER PUBLICATION supabase_realtime ADD TABLE negocios;
ALTER PUBLICATION supabase_realtime ADD TABLE patrimonio;
ALTER PUBLICATION supabase_realtime ADD TABLE transacoes;
