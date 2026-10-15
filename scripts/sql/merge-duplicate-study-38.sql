-- Study 38 duplicates study 24 (Vandenbussche, "Detransition-Related Needs and
-- Support", J Homosexuality). Keep 24; hide 38 and redirect its URLs to 24.
-- Requires migration 0019_study_merges.sql. Idempotent.
UPDATE studies SET merged_into = 24, approved = false WHERE id = 38;
SELECT id, approved, merged_into FROM studies WHERE id IN (24, 38) ORDER BY id;
