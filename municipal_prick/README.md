# 🏛️ Cross-Municipality Search

Cross-municipality search engine querying public CivicClerk portals across **1,690+ local governments** in the United States.

⚡ **100% Client-Side Serverless**: Queries CivicClerk public APIs directly from the browser using CORS. Zero backend servers or databases required.

Live site: **https://<your-username>.github.io/municipal_prick/**

## Features
- **Full Text & Exact Phrase Search**: Native support for `"exact phrase quotes"`.
- **Direct PDF Download Links**: 1-click `📥 PDF` buttons linking directly to binary attachments and agenda packets.
- **CivicClerk Portal Deep Links**: `CivicClerk ↗` buttons that open documents directly in the portal viewer.
- **Verbatim Match Snippets**: Highlights and quotes the exact matched text from inside attachments and agendas.
- **Municipality Directory**: Browse and filter all 1,690 local government portals with 1-click search filtering.
- **1-Click CSV Export**: Includes direct PDF URLs for all matching documents.

## Files in this repository
- `index.html`: The standalone single-page web app.
- `portals.json`: Compact 92 KB database of all 1,690 active municipalities.
- `.nojekyll`: Bypasses Jekyll build processing on GitHub Pages.
- `docs/`: Mirror copy so deployment works whether GitHub Pages is set to `/` or `/docs`.
