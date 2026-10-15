-- Studies 8 and 9 are the same paper (Dhejne et al. 2011, PLOS ONE,
-- "Long-Term Follow-Up of Transsexual Persons Undergoing Sex Reassignment
-- Surgery: Cohort Study in Sweden"). Keep 9, which has the full text; /studies/8
-- URLs 308-redirect to it. Idempotent.
UPDATE studies SET merged_into = 9, approved = false WHERE id = 8;
