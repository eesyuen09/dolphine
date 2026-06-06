# Listing Research Data

This folder contains the station-agent output for Singapore MRT room-rental research.

- `station_manifest.json`: one row per unique MRT station, including agent name and output file.
- `by_mrt/house_{station_slug}.json`: raw research output for each station agent.
- `house_listings_merged.json`: deduplicated coordinator merge of collected station listings.
- `house_listings_rejected.json`: records rejected during merge, currently duplicates only.

Run the workflow from the repo root:

```bash
npm run generate:listings
npm run validate:listings
npm run merge:listings
```

Current state: all 141 station files exist. `house_one_north.json` has 10 source-backed candidate listings promoted from the existing raw research sample; other station files are explicit pending-research scaffolds with `actual_listing_count: 0` and documented limitations. Do not import pending or snippet-only data into production without opening the source listing pages and completing the missing fields.