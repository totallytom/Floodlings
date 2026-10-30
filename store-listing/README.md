# Store listings

One file per language, ready to paste into App Store Connect (App Information /
version page → language picker) and Google Play Console (Main store listing →
Manage translations).

Every field is within its store limit - run the length check before editing:

    node scripts/check-store-listing.js

| Field | Store | Limit |
|---|---|---|
| Name / Title | both | 30 characters |
| Subtitle | App Store | 30 characters |
| Keywords | App Store | 100 bytes (CJK characters count 3 each), comma-separated, no space after commas |
| Promotional text | App Store | 170 characters (editable any time, no review) |
| Short description | Google Play | 80 characters |
| Description | both | 4000 characters |

Keyword tips: App Store already indexes words in the name and subtitle, so the
keyword field avoids repeating them. Revisit keywords after a few weeks using
App Store Connect → App Analytics → Sources → App Store Search.

Translations were written for this app, not machine-translated wholesale, but a
quick read by a native speaker before publishing is still worth it - especially
the keyword choices.
