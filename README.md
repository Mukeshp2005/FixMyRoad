# FixMyRoad Setup & Execution Guide

This repository contains the full source code for **FixMyRoad** - an automated, AI-assisted civic infrastructure & complaint management platform built with Node.js, Express, React (Vite), MongoDB, and Google Gemini Vision AI.

---

## 🛠️ Quick Start (Running on Any Device)

### 1. Prerequisites
- Node.js `v18+`
- MongoDB running locally (`mongodb://127.0.0.1:27017/fixmyroad`) or MongoDB Atlas.

### 2. Environment Configuration
Create a `.env` file in the root directory (or copy `.env.example` to `.env`):
```bash
cp .env.example .env
```
Also copy `.env` into `server/.env` if running backend independently:
```bash
cp .env server/.env
```

---

## 🚀 Running the Project

### Start Backend Server:
```bash
cd server
npm install
npm run dev
```
Backend server runs at `http://localhost:5000`.

### Start Client App:
```bash
cd client
npm install
npm run dev
```
Frontend application runs at `http://localhost:5173`.

---

## 🔐 Default Admin & Officer Credentials

### 1. Super Admin Portal (`/admin/dashboard`)
- **Username:** `admin`
- **Email:** `admin@fixmyroad.gov`
- **Password:** `AdminPass123!`

### 2. Government Officer Portal (`/municipality/dashboard`)
- **Username:** `muniadmin`
- **Email:** `municipality@fixmyroad.local`
- **Password:** `Municipality@12345`

### 3. Citizen Portal (`/citizen/dashboard`)
- **Email:** `citizen@fixmyroad.local`
- **Password:** `CitizenPass123!`

---

## ✨ Features Implemented & Working
1. **Citizen Complaint System**:
   - Manual text input for **Taluk** and **Zone / Ward**.
   - Editable & Deletable complaints by Citizens.
   - Dispute Rejection & Escalation workflows.
2. **Google Gemini Vision AI Verification**:
   - Live AI verification checking uploaded pothole/damage photos against description text.
   - Automatically flags fake or mismatched images before saving.
3. **Government Official Inspection Portal**:
   - Access to view, inspect, and transition status on **all citizen complaints**.
   - Validated status transitions (`ACCEPT`, `IN PROGRESS`, `RESOLVED`, `REJECT`).
   - Mandatory rejection reason enforcement.
4. **Super Admin Access & User Creation**:
   - Super Admin can create custom logins/passwords for new Government Officials and Admins with specific roles (`MUNICIPALITY_ADMIN`, `MUNICIPALITY_OFFICER`, `SUPER_ADMIN`).
   - Super Admin user directory with instant account removal capabilities.
