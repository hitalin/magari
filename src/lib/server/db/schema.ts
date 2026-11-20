import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { shortId } from "#lib/id.ts";
import { user } from "./auth-schema";

export * from "./auth-schema";

const timestamp = (name: string) => integer(name, { mode: "timestamp" });
const now = () => new Date();

// 人・場・団体。全員が同じ handle 名前空間を共有し /@handle で表示する。
// 将来 ActivityPub の Person / Organization / Group に対応させる。
export const actors = sqliteTable(
	"actors",
	{
		id: text("id").primaryKey().$defaultFn(shortId),
		handle: text("handle").notNull(),
		kind: text("kind", { enum: ["person", "space", "group"] }).notNull(),
		// person かつユーザー本人を表す Actor の場合に設定。登録時に自動作成する。
		userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
		name: text("name").notNull(),
		summary: text("summary"),
		// 外部（X / Misskey）のアイコン URL。ログイン時に写す
		avatarUrl: text("avatar_url"),
		headerKey: text("header_key"),
		url: text("url"),
		xHandle: text("x_handle"),
		// ハコ・団体の Misskey（"name@host"）。人はログインでつないだアカウントを出すので使わない
		misskey: text("misskey"),
		// space 向け。person/group は会ごとに場所を持つ。
		address: text("address"),
		region: text("region"),
		// 場のホームページ相当（saki-stand.com の上位互換）
		catch: text("catch"),
		// 紹介文。簡易記法（## 見出し、- 箇条書き、空行で段落）
		body: text("body"),
		facilities: text("facilities", { mode: "json" })
			.$type<string[]>()
			.notNull()
			.default([]),
		hours: text("hours"),
		closedDays: text("closed_days"),
		access: text("access"),
		operator: text("operator"),
		instagram: text("instagram"),
		// 運営が非表示にした時刻。入っている間は、ページも、そこで開かれる会も公開しない
		hiddenAt: timestamp("hidden_at"),
		links: text("links", { mode: "json" })
			.$type<{ label: string; url: string }[]>()
			.notNull()
			.default([]),
		createdAt: timestamp("created_at").notNull().$defaultFn(now),
		updatedAt: timestamp("updated_at").notNull().$defaultFn(now),
	},
	(t) => [
		uniqueIndex("actors_handle_idx").on(t.handle),
		uniqueIndex("actors_user_idx").on(t.userId),
	],
);

// 場・団体を管理するユーザー。person Actor は userId で本人を表すのでここには入らない。
export const actorMembers = sqliteTable(
	"actor_members",
	{
		actorId: text("actor_id")
			.notNull()
			.references(() => actors.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role", { enum: ["owner", "editor"] })
			.notNull()
			.default("editor"),
		createdAt: timestamp("created_at").notNull().$defaultFn(now),
	},
	(t) => [
		primaryKey({ columns: [t.actorId, t.userId] }),
		index("actor_members_user_idx").on(t.userId),
	],
);

// 定期開催（自助会など）。RRULE から events を先々まで展開する。
export const eventSeries = sqliteTable("event_series", {
	id: text("id").primaryKey().$defaultFn(shortId),
	rrule: text("rrule").notNull(),
	timezone: text("timezone").notNull().default("Asia/Tokyo"),
	until: timestamp("until"),
	// ここまでは展開済み。Cron が延ばす。
	expandedUntil: timestamp("expanded_until"),
	createdAt: timestamp("created_at").notNull().$defaultFn(now),
});

// 会。場（spaceActorId）は任意。場なし・オンライン・オフ会もここ。
export const events = sqliteTable(
	"events",
	{
		id: text("id").primaryKey().$defaultFn(shortId),
		title: text("title").notNull(),
		description: text("description"),
		startsAt: timestamp("starts_at").notNull(),
		endsAt: timestamp("ends_at"),
		allDay: integer("all_day", { mode: "boolean" }).notNull().default(false),
		status: text("status", { enum: ["draft", "published", "cancelled"] })
			.notNull()
			.default("draft"),
		// public: 一覧に出る / unlisted: URL を知る人だけ
		visibility: text("visibility", { enum: ["public", "unlisted"] })
			.notNull()
			.default("public"),
		spaceActorId: text("space_actor_id").references(() => actors.id, {
			onDelete: "set null",
		}),
		locationName: text("location_name"),
		locationAddress: text("location_address"),
		// 絞り込み用のエリア。都道府県名（接尾辞なし）か「オンライン」
		area: text("area"),
		// attendees: 住所は載せず、主催に聞いてもらう（自助会・オフ会向け。参加者という概念は持たない）
		locationVisibility: text("location_visibility", {
			enum: ["public", "attendees"],
		})
			.notNull()
			.default("public"),
		onlineUrl: text("online_url"),
		// 外部の告知ページ（こくちーず、X のポストなど）
		url: text("url"),
		feeText: text("fee_text"),
		coverKey: text("cover_key"),
		// 自動のビラの型と差し色（開けた人が選んだもの）。無ければ ID から決まる
		flyerVariant: text("flyer_variant"),
		flyerColor: text("flyer_color"),
		seriesId: text("series_id").references(() => eventSeries.id, {
			onDelete: "set null",
		}),
		createdByUserId: text("created_by_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		// 外部カレンダーから取り込んだ会。source は取り込み元の識別子、sourceUid は元の UID
		source: text("source"),
		sourceUid: text("source_uid"),
		// 運営が非表示にした時刻。入っている間は公開しない（主催には見える）
		hiddenAt: timestamp("hidden_at"),
		createdAt: timestamp("created_at").notNull().$defaultFn(now),
		updatedAt: timestamp("updated_at").notNull().$defaultFn(now),
	},
	(t) => [
		index("events_source_idx").on(t.source, t.startsAt),
		index("events_area_idx").on(t.area, t.startsAt),
		index("events_starts_idx").on(t.status, t.visibility, t.startsAt),
		index("events_space_idx").on(t.spaceActorId, t.startsAt),
		index("events_series_idx").on(t.seriesId, t.startsAt),
	],
);

// 主催 Actor。複数可（共同主催のオフ会）。
export const eventHosts = sqliteTable(
	"event_hosts",
	{
		eventId: text("event_id")
			.notNull()
			.references(() => events.id, { onDelete: "cascade" }),
		actorId: text("actor_id")
			.notNull()
			.references(() => actors.id, { onDelete: "cascade" }),
		role: text("role", { enum: ["host", "cohost"] })
			.notNull()
			.default("host"),
	},
	(t) => [
		primaryKey({ columns: [t.eventId, t.actorId] }),
		index("event_hosts_actor_idx").on(t.actorId),
	],
);

// 運営への連絡（掲載の取り下げ、ページの引き取りなど）。ログイン不要で送れる。
export const reports = sqliteTable(
	"reports",
	{
		id: text("id").primaryKey().$defaultFn(shortId),
		kind: text("kind", { enum: ["takedown", "claim", "other"] }).notNull(),
		// 対象のページや会（@handle や URL）。自由記述
		about: text("about"),
		name: text("name").notNull(),
		// 返信先。X や Misskey の ID（メールアドレスでもよい）
		contact: text("contact").notNull().default(""),
		body: text("body").notNull(),
		// 対応の記録: いつ対応したかと、何をしたかのメモ
		handledAt: timestamp("handled_at"),
		note: text("note"),
		createdAt: timestamp("created_at").notNull().$defaultFn(now),
	},
	(t) => [index("reports_created_idx").on(t.createdAt)],
);

// 掲載を断られた handle。誰もこの handle のページを作れず、取り込みも飛ばす。
export const blockedHandles = sqliteTable("blocked_handles", {
	handle: text("handle").primaryKey(),
	note: text("note"),
	createdAt: timestamp("created_at").notNull().$defaultFn(now),
});

// 載せないでと言われた主催の名前。題にこの語が入った会は、取り込みで写さない。
export const blockedTitles = sqliteTable("blocked_titles", {
	phrase: text("phrase").primaryKey(),
	note: text("note"),
	createdAt: timestamp("created_at").notNull().$defaultFn(now),
});

// 地面の落書き。1 行 = 1 回ぶんの線（src/lib/graffiti.ts の形）。誰が描いたかは持たない。
export const graffiti = sqliteTable(
	"graffiti",
	{
		id: text("id").primaryKey().$defaultFn(shortId),
		d: text("d").notNull(),
		createdAt: timestamp("created_at").notNull().$defaultFn(now),
	},
	(t) => [index("graffiti_created_idx").on(t.createdAt)],
);
