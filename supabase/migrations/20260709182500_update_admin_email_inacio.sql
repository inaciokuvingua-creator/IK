-- Atualiza o e-mail do admin principal para o endereço solicitado
UPDATE admin_users
SET email = 'inaciokuvingua@gmail.com',
    updated_at = now()
WHERE username = 'admin'
   OR email = 'admin@ikfinance.app';

