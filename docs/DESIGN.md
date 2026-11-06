# magari.cc 設計メモ

間借り・日替わり店長・レンタル○○・ライブ・自助会・オフ会・オルタナティブスペースのための
イベント元締めサイト。Google カレンダー / Google フォーム / X の告知に散らばっている
「いつ・どこで・誰が」を一箇所に集め、フォローと通知で Google カレンダーの役割を置き換える。

## 原則

- **場所を持たない人と、場所を貸す人をつなぐ。** 既存のイベントサービスにない「枠を借りてその日だけ店をやる」を一級市民にする。
- **閲覧はログイン不要。** ログインするのは主催者・場の運営者・フォローしたい人だけ。
- **脱 Google、脱メール。** ログインは X と Misskey（MiAuth、任意のサーバー）だけ。メールは確認メールの配送が要るので使わない。パスキーは初回ログイン後に作れる。カレンダーは iCal で出す側に回る。地図は OSM、計測は Cloudflare Web Analytics、フォントはシステムフォント。
- **参加者のプライバシーが既定。** 自助会・オフ会の参加記録は公開プロフィールに残さない。参加表明は非公開・匿名可が既定。
- **出口を持つ。** 全データは iCal / JSON で出せる。将来 ActivityPub で配信する。
- **無料枠で永続運用。** Workers Free の 10ms CPU / 100k req/day の中で動かす。

## 概念モデル

| 概念 | 説明 | ActivityPub 対応 |
|---|---|---|
| **Actor（人・場・団体）** | 会を主催する主体。`kind` で `person` / `space` / `group` を区別。全員が同じ `handle` 名前空間を共有し `/@handle` で表示される | Person / Organization / Group |
| **Event（会）** | 主催 Actor × 日時 × 場所。場（space）は任意。場なし（公園・オンライン・相手の指定場所）やオフ会もここ | Event |
| **Series（定期開催）** | 自助会向け。RRULE で Event を先々まで展開する | — |
| **Slot（枠）** 段階2 | 場が公開する空き枠。応募 → 承認で Event に昇格 | — |
| **Follow** | ユーザーが Actor をフォローし、マイ予定に集める | Follow |
| **Attendance** 段階3 | 参加表明。既定で非公開、匿名可 | Join / Accept |

### オフ会を自然に扱うための決め事

- **ユーザーは登録時に自分の Person Actor を自動で持つ。** 場や団体を作らなくても、誰でも会を立てられる。
- **会は主催 Actor を複数持てる**（`event_hosts`）。共同主催のオフ会のため。
- **場所は「参加者にだけ見せる」を選べる**（`locationVisibility`）。自助会・オフ会で「場所は参加者に連絡」を表現する。
- **会の可視性**は `public` / `unlisted`（URL を知っている人だけ）/ `private`（主催者と参加者だけ）。

## URL 設計（ActivityPub を見据える）

| URL | 内容 | 将来の AP |
|---|---|---|
| `/@{handle}` | Actor ページ | Accept: activity+json で Actor オブジェクト |
| `/@{handle}/feed.ics` | Actor の iCal | — |
| `/e/{id}` | 会ページ（短い。X で共有しやすい） | Event オブジェクト |
| `/me/calendar/{token}.ics` | 個人のマイ予定 iCal | — |
| `/.well-known/webfinger` | 将来 | `acct:{handle}@magari.cc` |

`handle` は `[a-z0-9_]{3,20}`、全 Actor で一意。`id` は 10 文字の短い乱数 ID。

## 技術スタック

| 層 | 選定 |
|---|---|
| フレームワーク | SvelteKit 3 (Svelte 5 runes) + adapter-cloudflare |
| 実行環境 | Cloudflare Workers + Static Assets |
| DB | D1（primary = apac、読み取りレプリカ + Sessions API）+ Drizzle |
| 認証 | better-auth。X（OAuth 2.0）と Misskey（MiAuth を自作プラグイン `src/lib/server/miauth.ts` で）。パスキーは 2 回目以降用 |
| メール | 使わない |
| 画像 | R2 + Images 変換。OGP 画像はブラウザ側 Canvas で生成して R2 に保存（Worker で satori は 10ms を超える） |
| 通知 | Web Push（VAPID、Workers 上で署名） |
| 定期処理 | Cron Triggers（Series の展開、前日通知） |
| 検索 | D1 FTS5（要検証） |
| 開発 | pnpm / biome / vitest / wrangler |

## 速さの規約

1. **公開ページは CDN に HTML ごとキャッシュ**し、更新時に purge by URL。Worker は通さない。
2. **クライアント遷移は Worker を通さない。** `+page.ts`（universal load）から CDN キャッシュ済みの JSON エンドポイントを fetch する。`__data.json` 経由にしない。
3. **読み取りで D1 に触るのはキャッシュミス時だけ。** APAC primary でも東京から往復 70ms かかりうる。
4. **日本語 Web フォントを使わない。** システムフォント。
5. **Service Worker はシェル + SWR。** IndexedDB の前回データを先に描画し、裏で再検証。
6. **管理画面は SPA 寄り。** Worker は JSON を返すだけにして 10ms に収める。
7. Early Hints / HTTP/3 / Tiered Cache / Brotli を有効化。画像は AVIF + サイズ指定。
8. `data-sveltekit-preload-data` と Speculation Rules で次ページを先読み。

## 段階

1. **元締めカレンダー**: Actor / Event / Series の登録、公開ページ、OGP、X 共有、iCal 配信、フォロー、マイ予定。パスキー + X ログイン。
2. **間借り枠**: Space が Slot を公開 → 応募 → 承認で Event に。
3. **参加と通知**: 参加表明（非公開既定）、定員、キャンセル待ち、PWA + Web Push。
4. **後回し**: レンタル○○への個別依頼、決済、.ics 一回限りインポート、ActivityPub 配信、X 自動投稿。

## X 連携

- ログイン: better-auth の `twitter` プロバイダ（OAuth 2.0 + PKCE）。
- 共有: intent URL + OGP 画像。API 不要。共有文は「題 / 日時 / 📍ハコ（無ければ場所の名前かオンライン）」の 3 行（`src/lib/share.ts`）。リンクカードの説明も日時とハコから始める。
- 自動投稿: 段階4。X API Free 枠の投稿上限を確認してから。

## UI 言語

参照元は 2 つ。配置と部品の文法は liblib.page（`liberated-library` リポジトリ）、質感と空気はイベントバーエデンの公式サイト。

- **面**: 黒いアスファルト。画像ではなく SVG の `feTurbulence` を 2 層（細かい粒子 + 大きなムラ）重ねて CSS だけで作る。
- **色**: アクセントは「黒いアスファルトに貼ったガムテープ」の茶 1 系統（`accent` #c4874a / `accent-2` のグラデーション、`accent-ink` 文字、`accent-soft` 16% 背景、`accent-border` 50% 枠）。primary ボタンはテープに黒マジックの字（濃い文字色）。
- **文字**: 見出し・会の名前・人の名前・日付の数字は明朝、UI と本文はゴシック。小さなラベルは太字で字間 0.12em。Web フォントは使わない。
- **ヘッダー**: 64px 固定、75% 透過 + blur、ロゴは明朝の和名 + 英字大文字の 2 段、縦の区切り線、文字だけのナビ、現在地は 2px の赤い下線。
- **セクション題**: 明朝 + 6px のグラデーション下線（`.section-title`）。日付の区切りは両脇に罫線（`.day-rule`、エデンの「―― 題 ――」）。
- **一覧**: カードではなく上下 1px の罫線リスト（`.rule-list`）。`[時刻 tabular][明朝の題 / muted のメタを · で区切る / チップ最大 3]`。hover は `accent-soft` の背景だけ。
- **会の詳細**: 灰のラベル列 + 面の値セルの定義表（`.defs`、エデンの店舗概要）。
- **ボタン**: primary は 200% 幅のグラデーションが hover で流れる + 赤い影。secondary は枠線 1px のピル。影や浮き上がりは他では使わない。
- **装飾**: ヒーローはドット（上下フェード）とキーワード 1 語だけのグラデーション文字。記号は `›` と `·` のみ。
- 部品は `src/routes/layout.css` の `@layer components` に置き、トークンは `@theme` にだけ書く。

## 外部カレンダーの取り込み

各団体は今まで通り Google カレンダーで運用し、まがりが公開 iCal を定期的に読んで鏡写しにする。Google の API や認証は使わない（iCal は標準形式なので、別のカレンダーに移っても同じ経路で読める）。

- 取り込み元は `src/lib/server/import/sources.ts`。1 取り込み元 = 1 Actor（場または団体）+ 複数カレンダー。
- パーサは `ics.ts`（終日 / UTC / TZID=Asia/Tokyo、折り返し、エスケープ、RRULE、EXDATE、RECURRENCE-ID）。繰り返しの展開は `rrule`（JST の壁時計を UTC に見立てて展開し、最後に戻す）。
- `normalize.ts`: エデンは終日予定の題に「13-17」「17:30~」「11-16時」と時刻が書かれているので、それを読んで時刻付きにする。発達障害2.0 は説明文の `<a href>` から告知ページを取り出す。
- `run.ts`: 今日の 1 日前から 120 日先までを対象に、ID を「取り込み元 + UID + 回」のハッシュで固定して upsert し、元から消えた会は消す。D1 の bind 変数上限（100）のため 1 行ずつの文を batch で送る。
- 起動: Cron（`worker.ts` の `scheduled`、毎時 15 分）と、手動の `POST /api/admin/import`（`IMPORT_TOKEN`）。
  - adapter-cloudflare は wrangler 設定の `main` の場所を毎回消して生成物を書くので、adapter には `wrangler.adapter.jsonc` を渡し、`wrangler.jsonc` の `main` は手書きの `worker.ts` にする。`worker.ts` は生成物の `fetch` をそのまま出し、`scheduled` で自分の `/api/admin/import` を叩く。
- 取り込んだ会は `events.source` / `source_uid` を持ち、会ページに「公開カレンダーから取り込み」と出す。
- 現在の取り込み元: イベントバーエデン 9 店舗（本店・神田・日暮里・横浜・名古屋・京都・難波・神戸・福岡。Fu は予定なし）、発達障害2.0 イベントまとめの 7 地域カレンダー。
- フリカレ（freecalend.com、エデン神戸）は iCal を出さないので `freecalend.ts` で読む。公開ページの JS が叩く `POST /open/data` を同じ形で呼ぶ。
  - 本文の `keys` は `{"data":[[キー, 版, 版, [["ok-{mem}-all-r-cald",true]], []], …]}` を 2 重に URL エンコードしたもの。キーは月 `cald-{mem}-{y}-{m}` と日 `cald-{mem}-{y}-{m}-{d}`。版に古い値を送ると、中身のある日だけ `set` で返る。
  - 1 日 1 枠で題しかないので、JST の終日予定に見立てて返し、エデンの題の時刻（「16-21時」など）は他店と同じく `parseEdenTitle` で読む。空・「休み」・「仮予約」は会にしない。
  - 非公開の内部 API なので、形が変わったら取り込みは 0 件か例外になる。取り込み結果の `fetched` を見て気づけるようにしておく。
- エデンの題に時刻が無い 1 日の会は、店の営業時間（`sources.ts` の `storeHours`。公式の店舗ページから写した）に置く。題に「昼」があれば昼の営業時間に置くが、分かっているのは難波の 13〜17 時だけなので、他の店の昼の会は終日のまま。複数日にまたがる会も終日のまま。題の頭の「昼14-18時」のような時刻は `parseEdenTitle` が読む。

## 大量フィードの見せ方

同じ主催者の会が 1 日に多数ある（まとめサイトの取り込みなど）ときは、一覧では 1 行（`GroupRow`、4 件以上）、カレンダーのセルでは 1 チップ（3 件以上）に畳む（`collapseByActor`）。全件はその主催者のページで、タグ（地域など）で絞って見る。特定の団体をハードコードしない。

## 主催者側の動線（段階1の後半）

公開ポリシーは **A: 誰でも即公開**。登録すれば即一覧に載り、荒らしは事後に消す。承認制は必要になってから。

| 画面 | 役割 |
|---|---|
| `/login` | X、Misskey（サーバー名を入力。任意のサーバー）、パスキー。閲覧にログインは不要 |
| `/welcome` | 初回だけ。handle と表示名を決めて本人の Person アクターを作る。ついでにパスキーを作れる |
| `/me` | 自分の会（これから・下書き・過去）、まがりする（会を立てる）、自分のページ、パスキー登録、ログアウト |
| `/new` | まがりする（会を立てる）。`?from=ID` で複製。保存と同時に公開か下書き |
| `/e/{id}/edit` | 編集、中止、中止の取り消し、削除。作成者か主催者だけ。取り込んだ会は編集不可 |
| `/spaces/new` | ハコ（場）か団体を登録する。作った人が `actor_members` の owner になる |
| `/@{handle}/edit` | ページの編集。本人の person か、管理している場・団体だけ。紹介・アクセス・リンク、写真（R2）、出店プラン、お知らせ、問い合わせの受信箱 |
| `/i/{key}` | R2（MEDIA）の画像。キーは乱数なので immutable でキャッシュ |

- フォームの検証と JST → UTC 変換は `src/lib/event-form.ts`（純粋関数、テストあり）。終了が開始以前なら翌日扱い（深夜営業）。
- 書き込みは SvelteKit の form action。`hooks.server.ts` が `locals.actor`（本人のアクター）を載せる。
- ヘッダーのログイン状態は今は `+layout.server.ts` で出している。公開ページを CDN に載せる段階で、ここだけクライアント取得に切り替える（HTML を Cookie に依存させないため）。
- 会は「ハコ」欄に場の handle を書くと `space_actor_id` に紐づき、その場のページとカレンダーに載る（`resolveSpace`）。
- 未実装: 管理者（メンバー）の追加、共同主催の指定、フォローとマイ予定、公開ページのキャッシュ purge。

## 場のページ（saki-stand.com の上位互換）

間借りを受け入れる店（カレー屋など）が、自前のホームページの代わりに `/@handle` を使えるようにする。参照元は saki-stand.com（コミュニティスタンド咲）。あちらにあってこちらに無いものが無いように揃え、加えて「その場で開かれる間のカレンダー」が自動で付く。

| saki-stand.com | まがり |
|---|---|
| 店名・キャッチコピー・コンセプト・使い方・利用の流れ | `name` / `catch` / `summary` / `body`（簡易記法、`Blocks`） |
| 設備タグ（Wi-Fi、電源、厨房…） | `facilities` |
| NEWS | `posts`（お知らせ。日付順） |
| 出店プラン（時間帯別 / 曜日固定 / 貸し切りの料金表） | `space_plans`（`kind` = spot / weekly / exclusive / other、料金は自由テキストで改行可） |
| ACCESS（住所、駅、営業時間、定休日、運営、地図） | `address` / `access` / `hours` / `closed_days` / `operator`、地図は OSM の検索リンク |
| 建物写真 | `header_key`（R2、`/i/{key}`）。OGP 画像にも使う |
| CONTACT（種別付きフォーム、ハニーポット） | `inquiries`。ログイン不要で送れる。メールは送らず、管理者が `/@handle/edit` の受信箱で見る |
| SNS（X、Instagram）、会社概要、関連サイト | `x_handle` / `instagram` / `operator` / `links` |
| オープンイベントなどの催し | 会（Event）。「ハコ」に自分の場を指定して開く |

- 問い合わせは脱メールの原則どおり通知しない。受信箱の件数を `/@handle/edit` に出すだけ。将来 Web Push で知らせる。
- 画像は R2 に生のまま置く（変換なし）。JPEG / PNG / WebP、5MB まで。

## ロゴ

「間」の字を図像化。門の中の「日」をガムテープに置き換えて「間借り」を表す。アスファルト色のタイル（#151617）にクリーム（#f1efe9）の門、テープはサイトのアクセントと同じ茶。

- `brand/mark.svg`: タイル付き。favicon、PWA アイコン、OG 画像の元。
- `brand/logo.svg`: タイル無し。ヘッダー用（`src/lib/assets/logo.svg`）。
- 生成物は `static/`（`favicon.svg`、`icon-192.png`、`icon-512.png`、`apple-touch-icon.png`、`og.png`、`manifest.webmanifest`）。PNG は headless Chromium で `brand/*.svg` を描画して作る。

## 語彙

| 概念 | 呼び方 |
|---|---|
| 1 回の催し | **間**（間借りの間） |
| 会場（エデン、URA など、kind=space） | **ハコ** |
| 人 / 団体 | 人 / 団体 |
| 間を開く | **まがりする** |
