# IK

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-2k5fzwhw)

## Configuração do Supabase

1. Crie um projeto Supabase e copie a URL do projeto e a anon key.
2. Copie [.env.example](.env.example) para .env e preencha as variáveis.
3. No SQL editor do Supabase, execute [supabase/setup.sql](supabase/setup.sql) para criar as tabelas base e evitar erros de runtime.
4. Publique as Edge Functions em [supabase/functions](supabase/functions) para ativar notificações, admin API e integrações de pagamento.
5. Ative os buckets de storage necessários para avatars, marketplace, chat e documentos de identidade.
