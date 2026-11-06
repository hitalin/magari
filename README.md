# まがり — magari.cc

間借り店舗・日替わり店長・レンタル○○・プロ○○ヤー・ライブ・自助会・オフ会。
場所を持たない人の「間」と、場所を貸す人の空き枠を一箇所に集めるイベントカレンダー。

- 閲覧にログインは要らない。X か Misskey（任意のサーバー、MiAuth）でログインすると「まがりする」（間を開いて管理する）ことができる
- イベントバーエデン各店と発達障害2.0 の Google カレンダー（公開 iCal）を毎時取り込んで鏡写しにする
- Cloudflare Workers + D1 の無料枠で動く。設計は [docs/DESIGN.md](docs/DESIGN.md)

## 開発

```sh
pnpm install
cp .dev.vars.example .dev.vars   # X の鍵などを入れる
pnpm db:migrate                  # ローカル D1 にマイグレーション
pnpm dev                         # http://localhost:5173
```

取り込みを手で走らせる:

```sh
curl -X POST -H "Authorization: Bearer $IMPORT_TOKEN" http://localhost:5173/api/admin/import
```

検査: `pnpm check` / `pnpm lint` / `pnpm test`

## デプロイ

```sh
pnpm exec wrangler d1 create magari --location apac   # 初回のみ。ID を wrangler.jsonc に
pnpm db:migrate:remote
pnpm exec wrangler secret put BETTER_AUTH_SECRET      # ほか X_CLIENT_ID, X_CLIENT_SECRET, IMPORT_TOKEN
pnpm deploy
```

## ライセンス

MIT
