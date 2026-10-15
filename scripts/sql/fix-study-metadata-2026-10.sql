-- Corrections to approved study metadata, verified against PubMed/Crossref/
-- publisher records (2026-10). Idempotent: safe to run more than once.
-- prod: docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -1 -U <user> -d <db> < scripts/sql/fix-study-metadata-2026-10.sql

-- 42: Littman, O'Malley, Kerschner & Bailey (2024), Arch Sex Behav 53(1):57-76, PMID 38038854
UPDATE studies SET authors = 'Lisa Littman, Stella O''Malley, Helena Kerschner, J. Michael Bailey',
                   year = 2024, journal = 'Archives of Sexual Behavior'
WHERE id = 42;

-- 35: Gorin (2024), Hastings Center Report 54(3), PMID 38842886
UPDATE studies SET title = 'What Is the Aim of Pediatric "Gender-Affirming" Care?',
                   authors = 'Moti Gorin', journal = 'Hastings Center Report'
WHERE id = 35;

-- 37: Feigerlova (2025), J Sex Med 22(1), PMID 39724926 (print issue Jan 2025)
UPDATE studies SET year = 2025 WHERE id = 37;

-- 12: Cass Review final report, canonical source
UPDATE studies SET url = 'https://cass.independent-review.uk/home/publications/final-report/' WHERE id = 12;

-- 13: Pigozzi et al. (2022), BMJ Open Sport Exerc Med, PMID 35127133
UPDATE studies SET url = 'https://doi.org/10.1136/bmjsem-2021-001273' WHERE id = 13;

-- 4: trailing comma in author list; 14: double space in author list
UPDATE studies SET authors = regexp_replace(authors, ',\s*$', '') WHERE id = 4;
UPDATE studies SET authors = regexp_replace(authors, '\s+', ' ', 'g') WHERE id = 14;

SELECT id, authors, year, journal, left(title, 60) AS title, url
FROM studies WHERE id IN (4, 12, 13, 14, 35, 37, 42) ORDER BY id;
