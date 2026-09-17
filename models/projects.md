CANDIDATE'S ADDITIONAL PROJECT PORTFOLIO (real projects built by Caio Porto — reference these when relevant to answer questions about experience, side projects, ownership, product thinking, or full-stack work):

## Shopping Guide Chatbot — Euroconsumers / Proteste (ec.byporto.com.br)
- AI shopping assistant widget for Proteste Brazil (Euroconsumers group, consumer protection org).
- Full-stack: PHP backend, JavaScript embeddable widget, admin panel to review conversations.
- Uses LLM to analyze user shopping intent, recommend products, integrate with Proteste's review database.
- Feature: AI-powered conversation analysis for the admin team (sentiment, category, resolution).
- Deployed on HostGator, works via FTP deploy pipeline.

## OM PAY (ompayments) — Payment Gateway
- Monorepo payment gateway: NestJS backend + Next.js frontend.
- Deploy stack: Vercel (frontend), Render (API), Supabase (DB), Upstash (Redis/queue).
- Handles card processing, PIX, split payments, webhook orchestration.
- Personal rule during dev: every edit = immediate commit + push to keep prod-like environments in sync.

## WhatsApp Sales Ecosystem (byPorto SaaS)
- 100% WhatsApp commerce flow: virtual storefront → catalog → order → payment → tracking.
- Pivoted from nutritionist niche to snack bars / lanchonetes (proven demand).
- Stack: Twilio Studio Flow orchestration, Pagar.me for payments, n8n for automations, Vercel endpoint with RSA encryption for webhooks.
- SaaS panel features built: campaigns, abandoned-cart recovery, ROI dashboard, LGPD opt-out, webhook dedup.
- Multi-tenant architecture pending.

## WAHA — Self-hosted WhatsApp API
- Docker deployment of unofficial WhatsApp HTTP API on ARM (Mac mini + VPS).
- Used as message layer for the WhatsApp SaaS.

## byPorto Instagram Carousel Generator
- Local Vite + Playwright pipeline: JSON theme file → rendered PNG 1080x1350 slides.
- Design tokens: petrol blue + gold palette, 9 layout archetypes tied to brand archetypes.
- Workflow: "generate carousel about X" → author JSON → auto-export image set.

## ai-job-search — AI Job Application Agent
- Framework of Claude Code slash commands to automate job hunt.
- Targeting: remote PM/PO roles in Brazil, R$10-15k range.
- Includes profile-aware CV tailoring, cover letter generation, ATS keyword extraction.

## Byporto Visual System
- Design system: petrol-blue + gold tokens, typography scale, 9 layout archetypes mapped to brand archetypes.
- Photo demoted to background, UI card promoted to protagonist in social media posts.

## Delivery style
- Comfortable working solo end-to-end (product, backend, frontend, DevOps, design).
- Prefer real deploys over prototypes; ship to production fast, iterate with real users.
- Multi-tenant SaaS, WhatsApp/Twilio flows, payment integrations, AI/LLM product features are recurring themes.
