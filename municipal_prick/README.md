# 🏛️ Municipal Prick

Cross-municipality CivicClerk search engine across **1,690+ verified local governments** in the United States.

⚡ **100% Client-Side Serverless**: Queries CivicClerk public APIs directly from the browser using CORS. Zero backend servers or databases required.

Live site: **https://<your-username>.github.io/municipal_prick/**

## Features
- **Full Text & Exact Phrase Search**: Native support for `"exact phrase quotes"`.
- **Direct PDF Download Links**: 1-click `📥 PDF` buttons linking directly to binary attachments and agenda packets.
- **CivicClerk Portal Deep Links**: `👁️ Portal ↗` buttons that open documents directly in the portal viewer.
- **Verbatim Match Snippets**: Highlights and quotes the exact matched text from inside attachments and agendas.
- **1-Click CSV Export**: Includes direct PDF URLs for all matching documents.
- **Theme Player**: Embedded video player for [*Municiple Prick*](https://www.youtube.com/watch?v=2RWcFTNli-I).

## Files in this repository
- `index.html`: The standalone single-page web app.
- `portals.json`: Compact 92 KB database of all 1,690 verified active municipalities.
- `.nojekyll`: Bypasses Jekyll build processing on GitHub Pages.
- `docs/`: Mirror copy so deployment works whether GitHub Pages is set to `/` or `/docs`.
