# 023 — Production on a Hostpro VPS (alternative to Railway)

**Status:** draft · **Depends on:** 022 (slices 1–6) · **Route(s):** all public routes unchanged

> **Possible option, not chosen.** An alternative to 022 slice 6b (Railway) for production. Built only if the client wants hosting with HostPro. Until then 022 stays as written.

## Goal
The 022 build (Next.js + Payload, Node runtime) runs in production on one HostPro NVMe VPS in Poland, with Postgres on the same server and Cloudflare in front. The client keeps everything at one Ukrainian provider; the site behaves the same as on Railway.

Why consider it (stack review, 2026-11-16):
- A plain Node server runs Next.js with every feature (SSR, ISR, Server Actions, middleware, `sharp`), no OpenNext, no platform limits.
- Postgres on the same server: no network hop per query.
- HostPro includes OS updates, daily server backups (30 days), availability monitoring and a Telegram status bot.

## HostPro answers (support, 2026-11-16)
1. Docker and PostgreSQL: they install them; configuring them for the site is on us.
2. Daily backups, kept 30 days. Not answered: whether the Postgres copy is consistent while the DB runs, and how long a restore takes.
3. Firewall allowing 80/443 only from Cloudflare IPs: set up on request.
4. Any OS version installed on request (we ask for Ubuntu 24.04 LTS; the site lists only 22.04).
5. Downtime on hardware failure or plan upgrade: no guaranteed time (no SLA).

Facts from the plan page (hostpro.ua/en/nvme-vps): KVM, full root access, free administration includes OS and package updates, backup setup and availability monitoring; non-standard settings are paid; a plan upgrade may move the VPS to another server with some downtime.

## Plan
- **NVMe VPS-2** (1 vCPU, 4 GB RAM, 80 GB NVMe) — the minimum, with the image built in GitHub Actions (never `next build` on the server).
- **NVMe VPS-3** (2 vCPU, 6 GB, 100 GB) — if the Plektan sync or traffic slows the site.
- VPS-1 (2 GB) is too small for Next + Payload + Postgres.
- Location: Poland. Premium NVMe differs only in CPU (AMD EPYC); not needed.
- Prices are the client's concern; check them on the site before quoting.

## Responsibility split
| HostPro | Us |
| --- | --- |
| OS install and updates (Ubuntu 24.04 LTS) | Docker Compose, env, deploy pipeline |
| Docker and Postgres install | Updating container images (app, Postgres) |
| Firewall: 80/443 only from Cloudflare, on request | `pg_dump` to R2 and the restore runbook |
| Daily server backups, 30 days | External uptime check + Telegram alert |
| Availability monitoring | Cloudflare setup (DNS, WAF, Access, cache) |

## Scope
- In:
  - Docker Compose on the VPS: `app` (Next standalone + Payload), `postgres` (major version pinned), `restart: always`, health checks; Postgres not published outside the Docker network.
  - Deploy: GitHub Actions builds the image → GHCR → SSH (deploy key) → `docker compose pull && up -d`; rollback = previous image tag.
  - Cron: `/api/cron/*` called by host cron (or a small cron container) with the secret.
  - TLS: Cloudflare edge certificate + **Cloudflare Origin Certificate** on the server (free, long-lived, SSL mode Full (strict)); no paid SSL, no certbot.
  - Origin lockdown: HostPro firewall (Cloudflare IPs only) + a secret header added by a Cloudflare Transform Rule and checked in middleware; `/admin` behind Cloudflare Access.
  - Images: Cloudflare loader / sizes on upload, as in 022 (no on-server `next/image` optimisation).
  - Backups: `pg_dump` twice a day → dated file in R2 (14–30 days); HostPro server backups as the second layer.
  - Monitoring: external uptime check on the health route → Telegram.
  - Docs: `docs/setup.md` → «Production on HostPro VPS» and a restore runbook.
- Out:
  - Several servers, load balancing, automatic failover.
  - Zero-downtime deploys (a restart takes ~5–10 s; blue-green only if it becomes a problem).
  - A paid admin contract with HostPro.

## Data
Same as 022: Payload collections, Postgres behind `DATABASE_URL` (`postgres://…@postgres:5432/…` inside the Compose network), photos in R2. Moving from Railway or Neon: `pg_dump`/`pg_restore`, same Postgres major version.

## Slices

### [ ] 1. Server and Compose
- **Build:** request from HostPro: Ubuntu 24.04 LTS, Docker, firewall for Cloudflare IPs, SSH by key only. `docker-compose.prod.yml` (app + postgres, health checks, restart, volumes), `.env` template.
- **Files:** `deploy/hostpro/docker-compose.prod.yml`, `deploy/hostpro/.env.example`, `Dockerfile` (Next `output: 'standalone'`)
- **Agent:** backend · **Model:** sonnet
- **Accept:**
  - [ ] after a VPS reboot, the site and DB come back without manual steps.
  - [ ] port 5432 is not reachable from outside; 80/443 answer only via Cloudflare.

### [ ] 2. Deploy from GitHub
- **Build:** GitHub Actions: build image → GHCR → SSH deploy → health check; rollback to the previous tag.
- **Files:** `.github/workflows/deploy-hostpro.yml`
- **Agent:** backend · **Model:** sonnet
- **Accept:**
  - [ ] a push to `main` deploys without building on the server.
  - [ ] rollback to the previous image takes one command.

### [ ] 3. Cloudflare in front
- **Build:** proxied DNS, SSL Full (strict) with the Origin Certificate, secret header (Transform Rule) checked in middleware, Access on `/admin`, WAF + rate limits on `/api/*` and forms, cache rules for `/_next/static/*` and photos only.
- **Agent:** backend · **Model:** sonnet
- **Accept:**
  - [ ] a request straight to the server IP gets no content.
  - [ ] HTML isn't cached by Cloudflare; Core Web Vitals green (`pnpm perf`).

### [ ] 4. Backups, monitoring, runbook
- **Build:** `pg_dump` twice a day → R2 with retention; uptime check → Telegram; runbook «restore on a new VPS».
- **Files:** `deploy/hostpro/backup.sh`, `docs/setup.md`
- **Agent:** backend · **Model:** sonnet (docs: haiku)
- **Accept:**
  - [ ] a dump restores into an empty Postgres on a test VPS.
  - [ ] the runbook brings the site up on a fresh VPS in ≤ 2 hours, checked once end to end.

## Known risks
- **One server:** a hardware failure takes the site and DB down together; HostPro gives no recovery time. Mitigation: dumps in R2 + the tested runbook.
- **Server backup consistency** for a running Postgres is unconfirmed — `pg_dump` is the backup we rely on.
- **Plan upgrade** may move the VPS and cause downtime — do it at night, with a fresh dump first.
- Updating images (Postgres minor versions, app dependencies) is on us — part of the monthly support.

## External needs
- Client decision: HostPro VPS (this spec) or Railway (022 slice 6b).
- HostPro account in the client's name, VPS-2 in Poland; developer SSH key.
- Cloudflare zone for the domain (NS moved from HostPro), Origin Certificate, Access policy.
- R2 bucket and keys for photos and dumps; GHCR access for the deploy.

## Open questions
- Support contract with the client for server upkeep (updates, monitoring, restore).
- VPS-2 vs VPS-3: decide after a load check with the real Plektan data.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-16 | — | spec drafted | possible alternative to 022 slice 6b; HostPro support answers recorded |
