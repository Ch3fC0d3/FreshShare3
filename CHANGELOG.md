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

## [2025-09-13] UPC Scanner Feature Flag + Create Listing Stability

### Added
- Feature flag `UPC_SCANNER_AUTOSTART` exposed to views and frontend (`server.js`, `views/pages/create-listing.ejs`, `public/js/upc-lookup.js`). Defaults to ON when unset.
- Vendor management: new `models/vendor.model.js` and API routes in `routes/api/marketplace.js`:
  - `GET/POST/PUT/DELETE /api/marketplace/vendors`
  - `GET /api/marketplace/my-templates`

### Changed
- Mounted auth routes (`routes/auth.routes.js`) in `server.js` and added fallback wiring for:
  - `POST /api/auth/login`
  - `POST /api/auth/signup`
- Wrapped Create Listing upload handler to return JSON errors (file type/size) instead of generic HTML 500.
- Scanner auto-start behavior now honors the feature flag on page load and when opening the Scan modal.

### Fixed
- Create Listing 500 due to incomplete GeoJSON: removed default `'Point'` from `location.coordinates.type` in `models/listing.model.js` to avoid storing `{ type: 'Point' }` without coordinates.
- 404 on `/api/auth/login` in local dev by ensuring routes are mounted and fallback endpoints exist.

### Notes
- After changing env flags, restart the server and hard-refresh the browser to ensure flags and scripts are applied.
