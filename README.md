<p align="center">
  <a href="https://magari.cc"><img src="brand/mark.svg" width="96" alt="◱"></a>
</p>

# ◱（まがり）

**今日もどこかで誰かが開けている。行ってもいいし、自分が開けてもいい。**

An event calendar for pop-ups, meetups, and borrowed spaces — no sign-up needed to browse.

場所を持たない人の「間」と、場所を貸す人のハコを一箇所に集める。何ができて何をしないかは [magari.cc](https://magari.cc) に書いてある。

## 技術スタック

- **Framework**: SvelteKit 3 (Svelte 5) + Tailwind CSS 4
- **Auth**: better-auth（X OAuth 2.0 / Misskey MiAuth / パスキー）
- **DB**: Cloudflare D1 + Drizzle
- **Deploy**: Cloudflare Workers（無料枠で動く）
- **Language**: TypeScript

設計は [docs/DESIGN.md](docs/DESIGN.md) にあります。

## 開発

```sh
pnpm install
cp .dev.vars.example .dev.vars   # X の鍵などを入れる
pnpm db:migrate                  # ローカル D1 にマイグレーション
pnpm dev                         # http://localhost:5173
```

取り込みを手で走らせる（`IMPORT_ENABLED=1` のときだけ動く。本番は毎時の Cron）:

```sh
curl -X POST -H "Authorization: Bearer $IMPORT_TOKEN" http://localhost:5173/api/admin/import
```

検査: `pnpm check` / `pnpm lint` / `pnpm test`（push と pull request のたびに GitHub Actions でも走る。`.github/workflows/ci.yml`）

## デプロイ

```sh
pnpm exec wrangler d1 create magari --location apac   # 初回のみ。ID を wrangler.jsonc に
pnpm db:migrate:remote
pnpm exec wrangler secret put BETTER_AUTH_SECRET      # ほか X_CLIENT_ID, X_CLIENT_SECRET
pnpm exec wrangler secret put REPORT_WEBHOOK_URL      # 任意。運営への連絡が届いたら知らせる Webhook（Discord / Slack など）
pnpm deploy
```

## ライセンス

[AGPL-3.0-only](LICENSE) © 2026 hitalin

名前とロゴ（`brand/`、`src/lib/assets/`、`static/` のアイコン）はライセンスの対象外です。改造して動かすときは別の名前と看板にしてください。
