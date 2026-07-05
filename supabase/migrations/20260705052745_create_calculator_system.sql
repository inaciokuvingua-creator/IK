/*
# Calculator History & Formulas

Stores the user's calculation history, saved formulas, and custom formula library.

Tables:
1. calc_history — every calculation the user runs, with formula, result, steps, destination
2. calc_saved_formulas — user's saved/favourited formulas and custom formula library
*/

CREATE TABLE IF NOT EXISTS calc_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  expression  text NOT NULL,
  result      text NOT NULL,
  label       text,
  category    text DEFAULT 'general',
  steps       jsonb,
  destination text,
  favourited  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE calc_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ch_select" ON calc_history;
CREATE POLICY "ch_select" ON calc_history FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ch_insert" ON calc_history;
CREATE POLICY "ch_insert" ON calc_history FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ch_update" ON calc_history;
CREATE POLICY "ch_update" ON calc_history FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ch_delete" ON calc_history;
CREATE POLICY "ch_delete" ON calc_history FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS calc_saved_formulas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  expression  text NOT NULL,
  description text,
  category    text DEFAULT 'custom',
  variables   jsonb,
  is_builtin  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE calc_saved_formulas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "csf_select" ON calc_saved_formulas;
CREATE POLICY "csf_select" ON calc_saved_formulas FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_builtin = true);

DROP POLICY IF EXISTS "csf_insert" ON calc_saved_formulas;
CREATE POLICY "csf_insert" ON calc_saved_formulas FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "csf_update" ON calc_saved_formulas;
CREATE POLICY "csf_update" ON calc_saved_formulas FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "csf_delete" ON calc_saved_formulas;
CREATE POLICY "csf_delete" ON calc_saved_formulas FOR DELETE TO authenticated USING (user_id = auth.uid() AND is_builtin = false);

CREATE INDEX IF NOT EXISTS idx_calc_history_user ON calc_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calc_formula_user ON calc_saved_formulas(user_id);
