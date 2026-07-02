/*
# Add meta (goal) column to cofres

Adds an optional savings goal field to the cofres table.
- meta: numeric, nullable — the target balance the user wants to reach for this safe.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cofres' AND column_name = 'meta'
  ) THEN
    ALTER TABLE cofres ADD COLUMN meta numeric(15,2);
  END IF;
END $$;
