-- Remove privilégio super_admin de todos
UPDATE admin_users
SET role = 'admin'
WHERE role = 'super_admin';

-- Define somente o administrador principal
UPDATE admin_users
SET 
  role = 'super_admin',
  ativo = true
WHERE email = 'inaciokuvingua@gmail.com';
