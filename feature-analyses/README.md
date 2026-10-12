# r/detrans feature analyses

Short analyses of the most interesting and distinct features extracted with Jev
(TypeSafe System One) from first-person detransition profiles.

## Cohort & method

- **5,030 accounts** from r/detrans (users with ≥5 substantive comments at score ≥3).
- Profiles were written by MiMo v2.6 Flash from each account's full comment/post
  history; features were then scored by Jev, whose raw probabilities are stored
  in `detrans_user_features` (runs 4–8; run 6 re-ran the status question under
  taxonomy v4, and run 8 refreshed the accounts affected by the October 2026
  ingest).
- A tag is applied at **p ≥ 0.8** per feature. Primary reasons are assigned when
  the winning option reaches **p ≥ 0.4**, otherwise to "other / unclear" (which is
  why the site's reason totals are more conservative than raw model argmaxes).
- **Status definitions (taxonomy v4):** *desisted* = stopped with no medical
  intervention (social transition only, or never transitioned);
  *detransitioned* = stopped after at least one medical step (blockers,
  hormones, or surgery). The status question was re-run for all accounts under
  these rules.
- Account composition: **71.7% female / 28.3% male**; 96.8% personal-experience
  accounts (not parents/researchers/observers).
- These numbers are model estimates of what accounts disclose, not clinical data.
  Features overlap and are not mutually exclusive.
- Figures refreshed **11 Oct 2026** after ingesting all r/detrans activity through
  10 Oct 2026 (cohort 4,866 → 5,030 accounts).

## Index

| # | Document | Feature of interest |
|---|----------|---------------------|
| 01 | `01-regret.md` | Regret of transition (bimodality, trajectory) |
| 02 | `02-suicidality-timeline.md` | Suicidality before/during/after transition |
| 03 | `03-attitudes-towards-transition.md` | What users think about transition for others |
| 04 | `04-transition-reasons.md` | Primary reasons for transitioning |
| 05 | `05-detransition-reasons.md` | Primary reasons for detransitioning |
| 06 | `06-internalised-homophobia-and-misogyny.md` | Internalised homophobia / misogyny-misandry |
| 07 | `07-trauma.md` | Trauma history vs trauma as a driver |
| 08 | `08-online-influence-and-platforms.md` | Online/peer contagion, platforms, ROGD |
| 09 | `09-community-disillusionment.md` | Disillusionment with the trans community |
| 10 | `10-medical-footprint.md` | Hormones, surgeries, complications |
| 11 | `11-fertility-and-infertility.md` | Infertility, preservation, regret |
| 12 | `12-body-reconciliation.md` | Accepting the sexed body |
| 13 | `13-post-detransition-identity.md` | Non-binary after, retransition, social-only |
| 14 | `14-mental-health-burden.md` | Anxiety, depression, self-harm, and more |
| 15 | `15-escapism.md` | Transition as escape |
| 16 | `16-pathways.md` | Journey: dysphoria → transition → detransition → outcome |
