# CodeScan — Project Worth & Pricing Guide

A write-up for quoting and ongoing support of the CodeScan app, deployed for solar farm field engineers.

---

## 1. Executive Summary

CodeScan is a React Native (Expo) mobile app for capturing and digitizing printed text (serial numbers, part numbers, codes) via on-device OCR. It is suitable for solar farm engineers who need to collect equipment identifiers in the field without manual entry. This document covers initial project pricing and monthly support/maintenance.

---

## 2. Current Capabilities (Already Built)

| Component | Status | Description |
|-----------|--------|-------------|
| **OCR text extraction** | Production-ready | On-device (Apple Vision / ML Kit); no cloud required |
| **Camera capture** | Production-ready | Pinch-to-zoom, capture flow |
| **Analyze screen** | Production-ready | Image preview, OCR, optional bounding boxes |
| **Text selection & edit** | Production-ready | Select, edit, deduplication, save |
| **Session persistence** | Production-ready | AsyncStorage + FileSystem for scan history |
| **Data screen** | Production-ready | List of saved scans, swipe-to-delete, reopen sessions |
| **Settings** | Production-ready | Camera and photo library permissions |
| **UI** | Production-ready | NativeWind, dark scanner theme |

---

## 3. Planned Additions (Scope for Quote)

| Deliverable | Effort | Purpose |
|-------------|--------|---------|
| **Google Drive integration** | ~3–5 days | Export scans and data (CSV/JSON + images) for sharing and reporting |
| **Barcode scanning in Analyze** | ~2–3 days | Fallback when OCR is not suitable (damaged labels, barcode-only) |
| **Build & deployment** | ~1–2 days | EAS build, store submission, signing |

---

## 4. Initial Project Pricing

### Option A: Tiered by Scope

| Tier | Deliverables | Effort | Price |
|------|--------------|--------|-------|
| **Base** | Current app + Google Drive export | 5–7 days | $2,000 – $3,500 |
| **Full** | Base + Barcode fallback + Deployment | 8–12 days | $3,500 – $5,000 |
| **Enterprise** | Full + 3 months support included | 12+ days | $5,500 – $6,500 |

### Option B: Recommended Quote

For a solar farm app with Google Drive export, barcode fallback, and deployment for multiple engineers:

**Suggested project range: $4,000 – $6,000 (one-time)**

| Package | Price | Includes |
|---------|-------|----------|
| **Standard** | $4,500 | Base app + Google Drive + barcode fallback + deployment + documentation |
| **Enterprise** | $6,000 | Above + 3 months support/maintenance + minor customization |

---

## 5. Monthly Support & Maintenance

### Pricing Tiers

| Tier | Monthly Rate | Includes |
|------|--------------|----------|
| **Light** | $200 – $300 | Bug fixes, OS compatibility updates, email support (2–3 day response) |
| **Standard** | $350 – $500 | Light + 1–2 minor enhancements/month, 1 business day response |
| **Enterprise** | $600 – $800 | Standard + priority support, quarterly review, larger enhancement scope |

### Recommended Starting Point

**$300 – $400/month** for a Standard plan covering:

- Bug fixes and compatibility updates
- Email support (24–48 hour response)
- 1–2 small enhancements per month
- Optional monthly status summary

### Additional Terms

- **Minimum commitment**: 3–6 months
- **Out-of-scope work**: Bill at $100–150/hr
- **Emergency support**: Define and charge extra for same-day turnaround
- **Annual renewal**: Consider 5–10% increase per year

---

## 6. Value Proposition for Solar Farm Use

| Factor | Benefit |
|--------|---------|
| Serial numbers on inverters/panels | Reduces manual typing and transcription errors |
| Field conditions | Works offline; no cloud required for OCR |
| Multiple engineers | Google Drive export enables shared data and reporting |
| Barcode fallback | Handles damaged or barcode-only labels |
| Industry | Solar operators typically budget for field tools |

---

## 7. Negotiation Points

1. Emphasize time saved and error reduction vs manual data entry
2. Highlight offline operation for remote sites
3. Position Google Drive export as enabling team-wide reporting
4. Propose fixed-price scope with a defined change process
5. Include or separately quote App Store / Play Store submission
6. Offer maintenance retainer as optional ongoing support

---

## 8. Summary

| Item | Range |
|------|-------|
| Initial project (Full scope) | $4,000 – $6,000 |
| Monthly support (Standard) | $300 – $500 |
| Per-user license (optional) | $150 – $300/user/year |

---

*Last updated: February 2025*
