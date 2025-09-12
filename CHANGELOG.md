# Changelog

All notable changes to this project will be documented in this file.

## [2025-09-11] UPC Debug/Health/UX Milestone

### Added
- UPC lookup debug mode in `controllers/marketplace.controller.js` (`lookupUpc()`): enable with `?debug=1|true|yes` to include sanitized upstream error info.
- Health endpoint in `server.js`: `GET /api/health/db` returns `{ success, connected, state, ping }`.
- Friendly status messages and Retry links on Create Listing (`views/pages/create-listing.ejs`) for loading saved vendors and previous templates.
- Friendly status+Retry on Edit Listing (`views/pages/edit-listing.ejs`) for loading saved vendors.

### Changed
- Vendor website input changed to `type="text" inputmode="url"` on Create/Edit Listing to avoid strict HTML5 URL validation.
- Vendor website normalization: added `normalizeUrl()` and applied in `createListing`, `updateListing`, `createVendor`, and `updateVendor` to ensure `https://` prefix when missing.
- Improved server logs for `getMyVendors()` and `getMyListingTemplates()` to include `userId`, counts, and concise error signatures.

### Notes
- Debug data is only included when `debug` query param is provided; no secrets are exposed.
- See `UPC_LOOKUP_FIX_MILESTONE.md` for a detailed milestone write-up and verification steps.
