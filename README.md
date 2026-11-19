<p align="center">
  <a href="https://magari.cc"><img src="brand/mark.svg" width="96" alt="◱"></a>
</p>

# ◱（まがり）

**今日もどこかで誰かが開けている。行ってもいいし、自分が開けてもいい。**

An event calendar for pop-ups, meetups, and borrowed spaces — no sign-up needed to browse.

🔗 <https://magari.cc>

## コンセプト

間借り店舗・日替わり店長・レンタル○○・プロ○○ヤー・ライブ・自助会・オフ会。
こうした会の告知は Google カレンダーや X に散らばっていて、「いつ・どこで・誰が」を一度に見られる場所がありません。

- 今日、近くで誰が開けている？
- 自分も一日だけ開けてみたいとき、どこに声をかければいい？
- 貸せるハコがあることを、どう知らせる？

まがりは、場所を持たない人の「間」と、場所を貸す人のハコを一箇所に集めます。「18時から店にいます」のひとことでも載せられます。

## 機能

### 見る

- ログイン不要。これから 7 日の一覧・フライヤーの壁・月のカレンダーの 3 つの見せ方を切り替えられる
- エリアで絞り込める
- 人・ハコ・団体はどれも `/@handle` のページを持ち、開ける会と過去の会が並ぶ

### まがりする（間を開ける）

- X か Misskey（任意のサーバー、MiAuth）でログインする。2 回目からはパスキーも使える
- 要るのは「ひとこと・日時・場所」だけ。打つそばからビラが刷り上がり、型と差し色を選べる
- 開けたら X か Misskey に貼るだけ。共有用の OGP 画像も自動で付く

### ハコ

- 貸せる場所を載せると、ハコのページに「誰に声をかければいいか」が出る
- 外部の公開カレンダー（iCal）を取り込める（`IMPORT_ENABLED=1` のときだけ動く）。写すのは題・日時・場所・元へのリンクと説明の抜粋だけ

## しないこと

- **お金をとらない**: 個人が無償で動かしている。広告もない
- **預からない**: メールアドレスも、誰がどこへ行くかも持たない
- **取り持たない**: 予約・決済・参加登録・利用者どうしのメッセージは作らない。行く前の確認は開けた人の告知で
- **隠さない**: ソースは公開していて、だれでも読めて、直せる

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
