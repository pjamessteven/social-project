-- Study 5111 duplicates study 37 (Feigerlova, "Prevalence of detransition in
-- persons seeking gender-affirming hormonal treatments", J Sex Med 2025).
-- Keep 37 (full text, limitations); hide 5111 and redirect its URLs to 37.
-- Requires migration 0019_study_merges.sql. Idempotent.
UPDATE studies SET merged_into = 37, approved = false WHERE id = 5111;
SELECT id, approved, merged_into FROM studies WHERE id IN (37, 5111) ORDER BY id;
