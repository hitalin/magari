import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';
import { shortId } from '#lib/id.ts';
import { user } from './auth-schema';

export * from './auth-schema';

const timestamp = (name: string) => integer(name, { mode: 'timestamp' });
const now = () => new Date();

// 人・場・団体。全員が同じ handle 名前空間を共有し /@handle で表示する。
// 将来 ActivityPub の Person / Organization / Group に対応させる。
export const actors = sqliteTable(
	'actors',
	{
		id: text('id').primaryKey().$defaultFn(shortId),
		handle: text('handle').notNull(),
		kind: text('kind', { enum: ['person', 'space', 'group'] }).notNull(),
		// person かつユーザー本人を表す Actor の場合に設定。登録時に自動作成する。
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
		name: text('name').notNull(),
		summary: text('summary'),
		avatarKey: text('avatar_key'),
		// 外部（X / Misskey）のアイコン URL。ログイン時に写す
		avatarUrl: text('avatar_url'),
		headerKey: text('header_key'),
		url: text('url'),
		xHandle: text('x_handle'),
		// space 向け。person/group は会ごとに場所を持つ。
		address: text('address'),
		region: text('region'),
		// 場のホームページ相当（saki-stand.com の上位互換）
		catch: text('catch'),
		// 紹介文。簡易記法（## 見出し、- 箇条書き、空行で段落）
		body: text('body'),
		facilities: text('facilities', { mode: 'json' }).$type<string[]>().notNull().default([]),
		hours: text('hours'),
		closedDays: text('closed_days'),
		access: text('access'),
		operator: text('operator'),
		instagram: text('instagram'),
		links: text('links', { mode: 'json' })
			.$type<{ label: string; url: string }[]>()
			.notNull()
			.default([]),
		createdAt: timestamp('created_at').notNull().$defaultFn(now),
		updatedAt: timestamp('updated_at').notNull().$defaultFn(now)
	},
	(t) => [
		uniqueIndex('actors_handle_idx').on(t.handle),
		uniqueIndex('actors_user_idx').on(t.userId)
	]
);

// 場・団体を管理するユーザー。person Actor は userId で本人を表すのでここには入らない。
export const actorMembers = sqliteTable(
	'actor_members',
	{
		actorId: text('actor_id')
			.notNull()
			.references(() => actors.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: text('role', { enum: ['owner', 'editor'] })
			.notNull()
			.default('editor'),
		createdAt: timestamp('created_at').notNull().$defaultFn(now)
	},
	(t) => [
		primaryKey({ columns: [t.actorId, t.userId] }),
		index('actor_members_user_idx').on(t.userId)
	]
);

// 定期開催（自助会など）。RRULE から events を先々まで展開する。
export const eventSeries = sqliteTable('event_series', {
	id: text('id').primaryKey().$defaultFn(shortId),
	rrule: text('rrule').notNull(),
	timezone: text('timezone').notNull().default('Asia/Tokyo'),
	until: timestamp('until'),
	// ここまでは展開済み。Cron が延ばす。
	expandedUntil: timestamp('expanded_until'),
	createdAt: timestamp('created_at').notNull().$defaultFn(now)
});

// 会。場（spaceActorId）は任意。場なし・オンライン・オフ会もここ。
export const events = sqliteTable(
	'events',
	{
		id: text('id').primaryKey().$defaultFn(shortId),
		title: text('title').notNull(),
		description: text('description'),
		startsAt: timestamp('starts_at').notNull(),
		endsAt: timestamp('ends_at'),
		allDay: integer('all_day', { mode: 'boolean' }).notNull().default(false),
		timezone: text('timezone').notNull().default('Asia/Tokyo'),
		status: text('status', { enum: ['draft', 'published', 'cancelled'] })
			.notNull()
			.default('draft'),
		// public: 一覧に出る / unlisted: URL を知る人だけ / private: 主催と参加者だけ
		visibility: text('visibility', { enum: ['public', 'unlisted', 'private'] })
			.notNull()
			.default('public'),
		spaceActorId: text('space_actor_id').references(() => actors.id, { onDelete: 'set null' }),
		locationName: text('location_name'),
		locationAddress: text('location_address'),
		// 絞り込み用のエリア。都道府県名（接尾辞なし）か「オンライン」
		area: text('area'),
		// attendees: 場所は参加者にだけ見せる（自助会・オフ会向け）
		locationVisibility: text('location_visibility', { enum: ['public', 'attendees'] })
			.notNull()
			.default('public'),
		onlineUrl: text('online_url'),
		// 外部の告知ページ（こくちーず、X のポストなど）
		url: text('url'),
		capacity: integer('capacity'),
		feeText: text('fee_text'),
		// 自由タグの JSON 配列。例: ["間借り","自助会","オフ会"]
		tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
		coverKey: text('cover_key'),
		ogpKey: text('ogp_key'),
		seriesId: text('series_id').references(() => eventSeries.id, { onDelete: 'set null' }),
		createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
		// 外部カレンダーから取り込んだ会。source は取り込み元の識別子、sourceUid は元の UID
		source: text('source'),
		sourceUid: text('source_uid'),
		createdAt: timestamp('created_at').notNull().$defaultFn(now),
		updatedAt: timestamp('updated_at').notNull().$defaultFn(now)
	},
	(t) => [
		index('events_source_idx').on(t.source, t.startsAt),
		index('events_area_idx').on(t.area, t.startsAt),
		index('events_starts_idx').on(t.status, t.visibility, t.startsAt),
		index('events_space_idx').on(t.spaceActorId, t.startsAt),
		index('events_series_idx').on(t.seriesId, t.startsAt)
	]
);

// 主催 Actor。複数可（共同主催のオフ会）。
export const eventHosts = sqliteTable(
	'event_hosts',
	{
		eventId: text('event_id')
			.notNull()
			.references(() => events.id, { onDelete: 'cascade' }),
		actorId: text('actor_id')
			.notNull()
			.references(() => actors.id, { onDelete: 'cascade' }),
		role: text('role', { enum: ['host', 'cohost'] })
			.notNull()
			.default('host')
	},
	(t) => [
		primaryKey({ columns: [t.eventId, t.actorId] }),
		index('event_hosts_actor_idx').on(t.actorId)
	]
);

// フォロー。マイ予定の元になる。
export const follows = sqliteTable(
	'follows',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		actorId: text('actor_id')
			.notNull()
			.references(() => actors.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().$defaultFn(now)
	},
	(t) => [primaryKey({ columns: [t.userId, t.actorId] }), index('follows_actor_idx').on(t.actorId)]
);

// 個人 iCal 用トークン。/me/calendar/{token}.ics
export const calendarTokens = sqliteTable('calendar_tokens', {
	token: text('token')
		.primaryKey()
		.$defaultFn(() => shortId(24)),
	userId: text('user_id')
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').notNull().$defaultFn(now)
});

// 出店プラン。段階2 の「枠」の親概念（何がどう借りられるか）。
export const spacePlans = sqliteTable(
	'space_plans',
	{
		id: text('id').primaryKey().$defaultFn(shortId),
		actorId: text('actor_id')
			.notNull()
			.references(() => actors.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		// spot: 時間帯で / weekly: 曜日固定 / exclusive: 貸し切り
		kind: text('kind', { enum: ['spot', 'weekly', 'exclusive', 'other'] })
			.notNull()
			.default('other'),
		priceText: text('price_text'),
		description: text('description'),
		sortOrder: integer('sort_order').notNull().default(0)
	},
	(t) => [index('space_plans_actor_idx').on(t.actorId, t.sortOrder)]
);

// お知らせ。Actor が出す投稿。会に紐づけられる。将来の ActivityPub Note。
export const posts = sqliteTable(
	'posts',
	{
		id: text('id').primaryKey().$defaultFn(shortId),
		actorId: text('actor_id')
			.notNull()
			.references(() => actors.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		body: text('body'),
		eventId: text('event_id').references(() => events.id, { onDelete: 'set null' }),
		status: text('status', { enum: ['draft', 'published'] })
			.notNull()
			.default('published'),
		publishedAt: timestamp('published_at').notNull().$defaultFn(now),
		createdAt: timestamp('created_at').notNull().$defaultFn(now)
	},
	(t) => [index('posts_actor_idx').on(t.actorId, t.status, t.publishedAt)]
);

// 場への問い合わせ（出店相談・イベント利用・来店・取材）。
export const inquiries = sqliteTable(
	'inquiries',
	{
		id: text('id').primaryKey().$defaultFn(shortId),
		actorId: text('actor_id')
			.notNull()
			.references(() => actors.id, { onDelete: 'cascade' }),
		kind: text('kind', { enum: ['rental', 'event', 'visit', 'press', 'other'] }).notNull(),
		name: text('name').notNull(),
		email: text('email').notNull(),
		phone: text('phone'),
		body: text('body').notNull(),
		createdAt: timestamp('created_at').notNull().$defaultFn(now)
	},
	(t) => [index('inquiries_actor_idx').on(t.actorId, t.createdAt)]
);
