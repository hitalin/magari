# ◱（まがり） — magari.cc

間借り店舗・日替わり店長・レンタル○○・プロ○○ヤー・ライブ・自助会・オフ会。
今日もどこかで誰かが開けている。行ってもいいし、自分が開けてもいい。
場所を持たない人の「間」と、場所を貸す人のハコを一箇所に集める。

- 閲覧にログインは要らない。X か Misskey（任意のサーバー、MiAuth）でログインすると「まがりする」（間を開いて管理する）ことができる
- 外部の公開カレンダー（iCal）を取り込む仕組みを持つが、既定では止めてある。開発時のサンプルデータとしてだけ使い、本番には載せない
- Cloudflare Workers + D1 の無料枠で動く。設計は [docs/DESIGN.md](docs/DESIGN.md)

## 開発

```sh
pnpm install
cp .dev.vars.example .dev.vars   # X の鍵などを入れる
pnpm db:migrate                  # ローカル D1 にマイグレーション
pnpm dev                         # http://localhost:5173
```

サンプルデータを入れる（`.dev.vars` の `IMPORT_ENABLED=1` のときだけ動く。本番では無効）:

```sh
curl -X POST -H "Authorization: Bearer $IMPORT_TOKEN" http://localhost:5173/api/admin/import
```

検査: `pnpm check` / `pnpm lint` / `pnpm test`

## デプロイ

```sh
pnpm exec wrangler d1 create magari --location apac   # 初回のみ。ID を wrangler.jsonc に
pnpm db:migrate:remote
pnpm exec wrangler secret put BETTER_AUTH_SECRET      # ほか X_CLIENT_ID, X_CLIENT_SECRET
pnpm exec wrangler secret put REPORT_WEBHOOK_URL      # 任意。運営への連絡が届いたら知らせる Webhook（Discord / Slack など）
pnpm deploy
```

## ライセンス

MIT
