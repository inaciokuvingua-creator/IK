-- Extend patrimonio with category-specific fields

-- Common extra fields
ALTER TABLE patrimonio
  ADD COLUMN IF NOT EXISTS localizacao         text,
  ADD COLUMN IF NOT EXISTS imagem_url          text,
  ADD COLUMN IF NOT EXISTS status              text DEFAULT 'ativo';

-- Imóvel / Aluguel fields
ALTER TABLE patrimonio
  ADD COLUMN IF NOT EXISTS imovel_tipo         text,         -- casa, apartamento, terreno, comercial, outro
  ADD COLUMN IF NOT EXISTS imovel_area_m2      numeric(10,2),
  ADD COLUMN IF NOT EXISTS imovel_quartos      int,
  ADD COLUMN IF NOT EXISTS imovel_arrendado    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS renda_mensal        numeric(15,2), -- receita de aluguel
  ADD COLUMN IF NOT EXISTS despesa_mensal      numeric(15,2), -- condomínio, IPTU etc.
  ADD COLUMN IF NOT EXISTS inquilino_nome      text,
  ADD COLUMN IF NOT EXISTS contrato_inicio     date,
  ADD COLUMN IF NOT EXISTS contrato_fim        date;

-- Veículo fields (carro, taxi, moto, camião)
ALTER TABLE patrimonio
  ADD COLUMN IF NOT EXISTS veiculo_tipo        text,         -- carro, taxi, moto, camiao, outro
  ADD COLUMN IF NOT EXISTS veiculo_marca       text,
  ADD COLUMN IF NOT EXISTS veiculo_modelo      text,
  ADD COLUMN IF NOT EXISTS veiculo_ano         int,
  ADD COLUMN IF NOT EXISTS veiculo_matricula   text,
  ADD COLUMN IF NOT EXISTS veiculo_km          numeric(10,0),
  ADD COLUMN IF NOT EXISTS veiculo_combustivel text,
  ADD COLUMN IF NOT EXISTS veiculo_gera_renda  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS veiculo_renda_diaria numeric(15,2); -- renda de taxi por dia

-- Estúdio / Negócio físico fields
ALTER TABLE patrimonio
  ADD COLUMN IF NOT EXISTS studio_tipo         text,         -- gravação, fotografia, podcast, dança, outro
  ADD COLUMN IF NOT EXISTS studio_capacidade   int,          -- capacidade de pessoas
  ADD COLUMN IF NOT EXISTS studio_equipamentos text,         -- lista/descrição de equipamentos
  ADD COLUMN IF NOT EXISTS studio_disponivel   boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS studio_preco_hora   numeric(15,2);
