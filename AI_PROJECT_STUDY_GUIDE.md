# FixMyRoad: Team AI Study & Viva Preparation Guide

> 💡 **How to use this guide with your AI:**
> Copy this entire file (or attach it) into **ChatGPT, Claude, or Gemini** and use the prompts at the bottom to ask anything about the project, generate presentation slides, prepare for technical viva questions, or understand code snippets!

---

## 1. Quick Project Pitch (What is FixMyRoad?)
**FixMyRoad** is an automated civic infrastructure defect tracking platform designed to eliminate delays in road maintenance and civic defect resolution. It allows citizens to photograph road defects (potholes, damaged streetlights, waterlogging, open manholes), verifies photos using **Google Gemini Vision AI** to filter out fake/mismatched submissions, automatically routes complaints to the responsible municipal corporation using **GeoJSON spatial boundaries**, and enforces a transparent workflow for government officers with photo proof of resolution.

---

## 2. Core Modules & How They Work

### Module 1: Authentication & Role-Based Access Control (RBAC)
- **Roles:**
  - `CITIZEN`: Can report issues, track status, give feedback, and escalate/reopen unresolved issues.
  - `MUNICIPALITY_OFFICER`: Can inspect complaints, accept them, update status to `IN_PROGRESS`, and upload completion proof to mark `RESOLVED`.
  - `MUNICIPALITY_ADMIN`: Oversees officer assignments, handles citizen escalations/reopens, and manages municipality zones.
  - `SUPER_ADMIN`: System-wide access; creates officer accounts, inspects server health, and oversees all municipal jurisdictions.
- **Security:** Passwords hashed with `bcryptjs` (salt rounds = 10). Authentication via signed JSON Web Tokens (JWT) with 7-day expiration.
- **Email Verification & Password Recovery:** OTP generated via cryptographic random numbers, sent via **Brevo HTTPS API** to eliminate cloud SMTP port blocking.

### Module 2: Image Processing & Google Gemini AI Verification
- **Binary Inspection:** Uploaded images are binary-checked with **Sharp** (`server/src/services/imageUploadService.js`) to reject corrupted files, enforce dimension limits, and compress payloads.
- **Visual AI Verification:** Sent to **Google Gemini Vision REST API** (`gemini-2.5-flash`):
  - Validates whether the image matches civic defects.
  - Detects fake images (selfies, memes, animals, indoor photos) and prevents bogus complaints from cluttering the system.
  - Automatically assesses damage severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **Resilient Fallback:** If the external AI API is rate-limited, an internal Sharp-based feature heuristic verifies image validity so citizens are never blocked.

### Module 3: Geocoding & GeoJSON Municipality Resolution
- **OpenStreetMap & Leaflet Integration:**
  - Interactive map allows clicking anywhere to drop a pinpoint marker.
  - Forward search bar allows searching by street/locality name (e.g. "Gandhipuram, Coimbatore").
  - Reverse geocoding resolves coordinates into normalized street address, city, district, and state.
- **Spatial Auto-Routing:**
  - Each municipality has a defined GeoJSON `Polygon` boundary stored in MongoDB.
  - When coordinates `[longitude, latitude]` are submitted, MongoDB executes a `$geoIntersects` 2dsphere spatial query to automatically detect which municipality is responsible.

### Module 4: Complaint Lifecycle & Citizen Escalation
- **State Machine:**  
  `SUBMITTED` ➔ `ACKNOWLEDGED` ➔ `IN_PROGRESS` ➔ `RESOLVED` (or `REJECTED`).
- **Enforced Accountabilities:**
  - An officer cannot resolve a complaint without resolution proof.
  - An officer cannot reject a complaint without providing a mandatory explanation.
- **Dispute & Reopen Workflow:**
  - If a citizen disagrees with a closure, they can submit a `ReopenRequest` with a new photo.
  - This escalates the issue to a `MUNICIPALITY_ADMIN` to prevent corrupt closures.

---

## 3. High-Probability Viva / Interview Questions & Answers

#### Q1: Why did you use MongoDB instead of SQL (e.g., PostgreSQL/MySQL)?
**Answer:** MongoDB natively supports **GeoJSON spatial queries** via `2dsphere` indexes. We use the `$geoIntersects` operator to instantly determine which municipality polygon contains the citizen's GPS coordinates without needing custom coordinate bounding-box math. Furthermore, document schemas easily accommodate dynamic complaint metadata, status audit trails, and AI confidence payloads.

#### Q2: How does your application prevent fake or spam complaints?
**Answer:** We implemented a two-tier verification system:
1. **Cryptographic Image Binary Inspection (Sharp):** Rejects fake extensions, verifies readable binary headers, and compresses images.
2. **Google Gemini Vision AI:** Inspects image content against the citizen's description. If a user uploads a selfie, an animal, or a living room photo, Gemini flags `isFakeImage: true`, preventing submission.

#### Q3: Why did you switch from standard SMTP to Brevo HTTPS API?
**Answer:** Standard email protocols (SMTP over ports 25, 465, 587) are blocked by outbound firewall rules on cloud providers like Render to prevent spam abuse. Brevo’s HTTPS REST API communicates over standard secure port 443, delivering OTPs in under 0.5 seconds with zero firewall blocks.

#### Q4: How is security handled between the Vercel frontend and Render backend?
**Answer:**
- **CORS:** Controlled origin whitelist with credentials support.
- **CSRF Immunity:** Authentication tokens are stored in `localStorage` and passed via `Authorization: Bearer <token>` headers. Cross-Site Request Forgery is mathematically impossible with custom Bearer headers because browsers never auto-attach them across origins.
- **Role-Based Guards:** Both client-side React route guards and backend Express middleware (`authenticate`, `authorize('CITIZEN')`, etc.) strictly enforce role boundaries.

#### Q5: What happens if a user submits a report from a desktop without GPS?
**Answer:** Desktop browsers estimate location using ISP IP addresses, which can have an uncertainty radius of ~200 km. To solve this, our UI provides:
1. An **Area / Locality Search Bar** that forward-geocodes street names to precise coordinates.
2. A **One-Click Map Pinning** feature allowing users to click anywhere on the OpenStreetMap view to set their exact location.

---

## 4. Ready-to-Use AI Prompts for Team Members

Copy any of these prompts into **ChatGPT / Claude / Gemini** along with this guide to learn more:

* **Prompt 1 (Code Walkthrough):**
  > "Based on this guide, explain how a complaint travels from `ReportIssuePage.jsx` in the frontend to `complaintController.js` in the backend and finally into MongoDB Atlas. Walk me through the code step-by-step."

* **Prompt 2 (Mock Viva Practice):**
  > "Act as a tough college viva examiner testing me on the FixMyRoad project. Ask me 5 deep technical questions one by one about our database design, AI integration, and cloud architecture. Evaluate my answers."

* **Prompt 3 (Presentation Script):**
  > "Write a compelling 3-minute project presentation speech for our team demo explaining the problem, the tech stack, the Google Gemini AI integration, and the impact of FixMyRoad on civic governance."

* **Prompt 4 (Database Schema Explanation):**
  > "Explain the relationships between the User, Complaint, Municipality, and ReopenRequest models in FixMyRoad and why GeoJSON 2dsphere indexes are important."
