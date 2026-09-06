# University search maintenance

## Weekly alias review

1. Export grouped zero-result queries from analytics (`university_search_no_results`).
2. Map clear queries to existing stable university IDs.
3. Add aliases to [`shared/universities-metadata.ts`](universities-metadata.ts) and regenerate seed:
   ```bash
   node scripts/generate-university-seed.mjs
   node scripts/reconcile-university-aliases.mjs --check
   ```
4. Add a regression case to [`shared/university-search/search.test.ts`](shared/university-search/search.test.ts).
5. Do not auto-accept AI-generated aliases without human review.

## CI checks

```bash
node scripts/reconcile-university-aliases.mjs --check
node scripts/validate-university-catalog.mjs
```

## Popularity tie-breaking

Update [`shared/universities-metadata.ts`](shared/universities-metadata.ts) `universitySelectionCounts` from aggregate (non-personal) selection data.
