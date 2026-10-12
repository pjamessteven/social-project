/**
 * Transition-year cohorts shared by the "over the years" endpoints. Buckets
 * are wide enough that each holds a usable number of stories.
 */
export const YEAR_BUCKETS = [
  { key: "pre2015", from: null, to: 2014 },
  { key: "2015_2017", from: 2015, to: 2017 },
  { key: "2018_2020", from: 2018, to: 2020 },
  { key: "2021_2023", from: 2021, to: 2023 },
  { key: "2024_plus", from: 2024, to: null },
] as const;

export function bucketFor(year: number): string | null {
  for (const bucket of YEAR_BUCKETS) {
    if (bucket.from != null && year < bucket.from) continue;
    if (bucket.to != null && year > bucket.to) continue;
    return bucket.key;
  }
  return null;
}
