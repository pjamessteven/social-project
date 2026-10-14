-- Translated story titles (the generated display names shown on story cards,
-- dialogs and pages), as a JSON object ({ locale: title }) like the other
-- *_translation columns. The URL slug keeps using the English display_name.
ALTER TABLE detrans_user_display_names
  ADD COLUMN IF NOT EXISTS display_name_translation TEXT;
