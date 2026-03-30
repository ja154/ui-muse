# JengaUI - AI-Powered UI Builder

## Overview
An AI-powered UI builder that scrapes websites, analyzes their design, and generates new UI designs using Google's Gemini AI. Users can provide a URL or describe a design, and the app generates a full-page React/Tailwind UI.

## Visual Design System
- **Theme**: Dark glassmorphism — `#04020f` bg, `rgba(255,255,255,0.04)` glass surfaces
- **Accents**: Cyan `#06b6d4` (primary) + Violet `#7c3aed` (secondary), gradient CTA button (cyan→violet)
- **Ambient orbs**: Three fixed-position radial gradients (violet/cyan/indigo) give depth to the glass blur
- **Grid**: Fine 44px grid overlay with bottom mask
- **Glass class**: `glass` CSS utility — `backdrop-blur(20px)`, border + inset highlight, deep shadow
- **CTA button**: `.btn-cta` CSS class — gradient background with hover shimmer/glow + lift effect
- **Typography**: Inter (sans) + JetBrains Mono (code/labels), with `uppercase tracking-widest` section labels
- **Colors**: Tailwind CDN config extends with `brand-bg`, `brand-surface`, `brand-primary`, `brand-violet`, `brand-border`

## Architecture
- **Full-stack TypeScript**: Single `server.ts` runs both the Express API and Vite dev server on port 5000
- **Frontend**: React 19 + Vite 6, using Konva for canvas rendering
- **Backend API**: Express 5 serving two main API endpoints
- **Python service**: `backend/core.py` for design system generation using BM25 + TF-IDF search over `data/design_specs.csv`
- **Puppeteer**: Used server-side for web scraping (screenshots + HTML extraction)
- **AI**: Google Gemini via `@google/genai`

## Key Files
- `server.ts` - Main entry point: Express + Vite middleware, runs on port 5000
- `App.tsx` - Root React component
- `vite.config.ts` - Vite config (port 5000, host 0.0.0.0, allowedHosts: true)
- `backend/core.py` - Python design system generator
- `data/design_specs.csv` - Design specifications dataset
- `services/` - Frontend service modules (Gemini API calls etc.)
- `components/` - React components

## API Endpoints
- `POST /api/scrape` - Scrapes a URL using Puppeteer, returns HTML, screenshots, CSS variables
- `POST /api/design-system` - Calls Python backend to find best matching design system for a query

## Environment Variables
- `GEMINI_API_KEY` - Required for Google Gemini AI features

## Running
```
npm run dev
```
Starts the combined Express + Vite server on port 5000.

## Python Dependencies
- pandas
- rank_bm25
- scikit-learn

## Node.js Dependencies
See `package.json`. Key deps: react, express, vite, puppeteer, konva, react-konva, @google/genai

## Deployment
Configured for autoscale deployment. Build: `npm run build`. Run: `node --import=tsx server.ts`.
