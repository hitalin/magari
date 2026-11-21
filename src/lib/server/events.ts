import {
	and,
	asc,
	desc,
	eq,
	gte,
	inArray,
	isNotNull,
	isNull,
	lt,
	notInArray,
	or,
} from "drizzle-orm";
import { type LinkedSns, nameOnlyIfUnmanaged, shownSns } from "#lib/actor.ts";
import { parseFlyerLook } from "#lib/flyer.ts";
import { mentionHandles } from "#lib/share.ts";
import { actorSns } from "#lib/sns.ts";
import {
	type ActorProfile,
	type ActorRef,
	type EventDetail,
	type EventSummary,
	mediaUrl,
	type ShareMention,
} from "#lib/types.ts";
import type { Db } from "./db/index.ts";
import {
	account,
	actorMembers,
	actors,
	eventHosts,
	events,
	user,
} from "./db/schema.ts";

function selectEvents(db: Db) {
	return db
		.select({
			id: events.id,
			title: events.title,
			description: events.description,
			startsAt: events.startsAt,
			endsAt: events.endsAt,
			allDay: events.allDay,
			area: events.area,
			url: events.url,
			source: events.source,
			status: events.status,
			visibility: events.visibility,
			locationName: events.locationName,
			locationAddress: events.locationAddress,
			locationVisibility: events.locationVisibility,
			createdByUserId: events.createdByUserId,
			onlineUrl: events.onlineUrl,
			feeText: events.feeText,
			coverKey: events.coverKey,
			flyerVariant: events.flyerVariant,
			flyerColor: events.flyerColor,
			hiddenAt: events.hiddenAt,
			spaceHandle: actors.handle,
			spaceName: actors.name,
			spaceKind: actors.kind,
			spaceAvatarUrl: actors.avatarUrl,
		})
		.from(events)
		.leftJoin(actors, eq(events.spaceActorId, actors.id))
		.$dynamic();
}
type Row = Awaited<ReturnType<typeof selectEvents>>[number];

// 運営が非表示にしていない会。会そのもの、ハコ（selectEvents が join している actors）、主催のどれかが
// 非表示なら公開しない
const notHidden = (db: Db) =>
	and(
		isNull(events.hiddenAt),
		isNull(actors.hiddenAt),
		notInArray(
			events.id,
			db
				.select({ id: eventHosts.eventId })
				.from(eventHosts)
				.innerJoin(actors, eq(eventHosts.actorId, actors.id))
				.where(isNotNull(actors.hiddenAt)),
		),
	);

async function hostsByEvent(
	db: Db,
	eventIds: string[],
): Promise<Map<string, ActorRef[]>> {
	const map = new Map<string, ActorRef[]>();
	// D1 は 1 文の bind 変数が 100 までなので分割して引く
	const CHUNK = 90;
	for (let i = 0; i < eventIds.length; i += CHUNK) {
		const rows = await db
			.select({
				eventId: eventHosts.eventId,
				handle: actors.handle,
				name: actors.name,
				kind: actors.kind,
				avatarUrl: actors.avatarUrl,
			})
			.from(eventHosts)
			.innerJoin(actors, eq(eventHosts.actorId, actors.id))
			.where(inArray(eventHosts.eventId, eventIds.slice(i, i + CHUNK)));
		for (const { eventId, ...host } of rows) {
			map.set(eventId, [...(map.get(eventId) ?? []), host]);
		}
	}
	return map;
}

function toDetail(
	row: Row,
	hosts: ActorRef[],
	mentions: ShareMention[] = [],
): EventDetail {
	return {
		id: row.id,
		title: row.title,
		description: row.description,
		startsAt: row.startsAt.toISOString(),
		endsAt: row.endsAt?.toISOString() ?? null,
		allDay: row.allDay,
		area: row.area,
		url: row.url,
		source: row.source,
		status: row.status,
		visibility: row.visibility,
		hidden: row.hiddenAt !== null,
		locationName: row.locationName,
		// 「主催に聞いてもらう」会の住所は API に出さない
		locationAddress:
			row.locationVisibility === "public" ? row.locationAddress : null,
		locationVisibility: row.locationVisibility,
		onlineUrl: row.onlineUrl,
		feeText: row.feeText,
		flyerUrl: mediaUrl(row.coverKey),
		flyerLook: parseFlyerLook(row.flyerVariant, row.flyerColor),
		space:
			row.spaceHandle && row.spaceName && row.spaceKind
				? {
						handle: row.spaceHandle,
						name: row.spaceName,
						kind: row.spaceKind,
						avatarUrl: row.spaceAvatarUrl,
					}
				: null,
		hosts,
		mentions,
	};
}

// ログインでつないだ X と Misskey。人のページのバッジと、共有文のメンションに使う
export async function linkedSns(
	db: Db,
	userIds: string[],
): Promise<Map<string, LinkedSns>> {
	const out = new Map<string, LinkedSns>();
	if (!userIds.length) return out;
	const rows = await db
		.select({
			userId: account.userId,
			providerId: account.providerId,
			accountId: account.accountId,
			xUsername: user.xUsername,
		})
		.from(account)
		.innerJoin(user, eq(account.userId, user.id))
		.where(
			and(
				inArray(account.userId, userIds),
				inArray(account.providerId, ["twitter", "miauth"]),
			),
		);
	for (const r of rows) {
		const l = out.get(r.userId) ?? {
			hasX: false,
			x: r.xUsername,
			misskey: [],
		};
		if (r.providerId === "twitter") l.hasX = true;
		else l.misskey.push(r.accountId);
		out.set(r.userId, l);
	}
	return out;
}

// 共有文（題・場所）に書かれた @name のうち、まがりにいる人の、ページに出している X と Fediverse
async function mentionsOf(db: Db, row: Row): Promise<ShareMention[]> {
	const handles = mentionHandles(
		[row.title, row.spaceName, row.locationName].filter(Boolean).join("\n"),
	);
	if (!handles.length) return [];
	const rows = await db
		.select({
			handle: actors.handle,
			kind: actors.kind,
			userId: actors.userId,
			xHandle: actors.xHandle,
			misskey: actors.misskey,
			links: actors.links,
		})
		.from(actors)
		.where(and(inArray(actors.handle, handles), isNull(actors.hiddenAt)));
	const linked = await linkedSns(
		db,
		rows.flatMap((a) => (a.kind === "person" && a.userId ? [a.userId] : [])),
	);
	return rows.map((a) => {
		const shown = shownSns(a, a.userId ? linked.get(a.userId) : undefined);
		return {
			handle: a.handle,
			x: shown.xHandle,
			fediverse:
				actorSns({ ...shown, instagram: null, links: a.links }).sns.find(
					(s) => s.kind === "misskey" || s.kind === "fediverse",
				)?.label ?? null,
		};
	});
}

function toSummary(detail: EventDetail): EventSummary {
	const {
		id,
		title,
		startsAt,
		endsAt,
		allDay,
		area,
		locationName,
		onlineUrl,
		space,
		hosts,
		flyerUrl,
		flyerLook,
	} = detail;
	return {
		id,
		title,
		startsAt,
		endsAt,
		allDay,
		area,
		locationName,
		onlineUrl,
		space,
		hosts,
		flyerUrl,
		flyerLook,
	};
}

// その Actor が場または主催の会
function ofActor(db: Db, actorId: string) {
	return or(
		eq(events.spaceActorId, actorId),
		inArray(
			events.id,
			db
				.select({ id: eventHosts.eventId })
				.from(eventHosts)
				.where(eq(eventHosts.actorId, actorId)),
		),
	);
}

// Actor のこれまでの間。before より前に始まったものを、新しい順に
export async function listPastEvents(
	db: Db,
	opts: { actorId: string; before: Date; limit: number },
): Promise<EventSummary[]> {
	const rows = await selectEvents(db)
		.where(
			and(
				eq(events.status, "published"),
				eq(events.visibility, "public"),
				lt(events.startsAt, opts.before),
				notHidden(db),
				ofActor(db, opts.actorId),
			),
		)
		.orderBy(desc(events.startsAt))
		.limit(opts.limit);
	const hosts = await hostsByEvent(
		db,
		rows.map((r) => r.id),
	);
	return rows.map((r) => toSummary(toDetail(r, hosts.get(r.id) ?? [])));
}

export async function listUpcomingEvents(
	db: Db,
	opts: {
		actorId?: string;
		limit?: number;
		from?: Date;
		to?: Date;
	} = {},
): Promise<EventSummary[]> {
	const from = opts.from ?? new Date();
	const upcoming = and(
		eq(events.status, "published"),
		eq(events.visibility, "public"),
		gte(events.startsAt, from),
		opts.to ? lt(events.startsAt, opts.to) : undefined,
		notHidden(db),
	);
	// actorId 指定時は、その Actor が場または主催の会に絞る
	const where = opts.actorId
		? and(upcoming, ofActor(db, opts.actorId))
		: upcoming;

	const rows = await selectEvents(db)
		.where(where)
		.orderBy(asc(events.startsAt))
		.limit(opts.limit ?? 100);
	const hosts = await hostsByEvent(
		db,
		rows.map((r) => r.id),
	);
	return rows.map((r) => toSummary(toDetail(r, hosts.get(r.id) ?? [])));
}

export async function getEvent(
	db: Db,
	id: string,
): Promise<EventDetail | null> {
	const [row] = await selectEvents(db)
		.where(and(eq(events.id, id), notHidden(db)))
		.limit(1);
	if (!row || row.status === "draft") return null;
	const hosts = await hostsByEvent(db, [row.id]);
	return toDetail(row, hosts.get(row.id) ?? [], await mentionsOf(db, row));
}

// 下書き・非公開も含めて、作成者か主催者（管理している Actor を含む）なら返す
export async function getEventForUser(
	db: Db,
	id: string,
	userId: string,
	actorIds: string[],
): Promise<EventDetail | null> {
	const [row] = await selectEvents(db).where(eq(events.id, id)).limit(1);
	if (!row) return null;
	const hostRows = await db
		.select({ actorId: eventHosts.actorId })
		.from(eventHosts)
		.where(eq(eventHosts.eventId, id));
	const mine =
		row.createdByUserId === userId ||
		hostRows.some((h) => actorIds.includes(h.actorId));
	if (!mine) return null;
	const hosts = await hostsByEvent(db, [row.id]);
	return toDetail(row, hosts.get(row.id) ?? [], await mentionsOf(db, row));
}

export async function getActorByHandle(
	db: Db,
	handle: string,
	// 開発環境で、取り込んだ見本のハコを紹介文つきで出す（nameOnlyIfUnmanaged）
	showSamples = false,
): Promise<ActorProfile | null> {
	const [row] = await db
		.select({
			id: actors.id,
			handle: actors.handle,
			kind: actors.kind,
			userId: actors.userId,
			name: actors.name,
			avatarUrl: actors.avatarUrl,
			headerKey: actors.headerKey,
			summary: actors.summary,
			url: actors.url,
			xHandle: actors.xHandle,
			misskey: actors.misskey,
			instagram: actors.instagram,
			address: actors.address,
			region: actors.region,
			catch: actors.catch,
			body: actors.body,
			facilities: actors.facilities,
			hours: actors.hours,
			closedDays: actors.closedDays,
			access: actors.access,
			operator: actors.operator,
			links: actors.links,
		})
		.from(actors)
		// 運営が非表示にしたページは、無いものとして扱う
		.where(and(eq(actors.handle, handle), isNull(actors.hiddenAt)))
		.limit(1);
	if (!row) return null;
	const [member] = await db
		.select({ userId: actorMembers.userId })
		.from(actorMembers)
		.where(eq(actorMembers.actorId, row.id))
		.limit(1);
	const { headerKey, userId, ...rest } = row;
	const linked =
		row.kind === "person" && userId
			? (await linkedSns(db, [userId])).get(userId)
			: undefined;
	return nameOnlyIfUnmanaged(
		{
			...rest,
			...shownSns(row, linked),
			hasManager: userId !== null || member !== undefined,
			headerUrl: mediaUrl(headerKey),
		},
		showSamples,
	);
}

// 検索に出してよいページ（sitemap.xml 用）。ページ側で noindex にしているものは載せない:
// 写した会（source あり）と、管理者のいないページ
export async function listIndexable(db: Db): Promise<{
	events: { id: string; updatedAt: Date }[];
	actors: { handle: string; updatedAt: Date }[];
}> {
	const [eventRows, actorRows] = await Promise.all([
		db
			.select({ id: events.id, updatedAt: events.updatedAt })
			.from(events)
			.leftJoin(actors, eq(events.spaceActorId, actors.id))
			.where(
				and(
					eq(events.status, "published"),
					eq(events.visibility, "public"),
					isNull(events.source),
					notHidden(db),
				),
			)
			.orderBy(desc(events.startsAt))
			.limit(5000),
		db
			.select({ handle: actors.handle, updatedAt: actors.updatedAt })
			.from(actors)
			.where(
				and(
					isNull(actors.hiddenAt),
					or(
						isNotNull(actors.userId),
						inArray(
							actors.id,
							db.select({ id: actorMembers.actorId }).from(actorMembers),
						),
					),
				),
			)
			.limit(5000),
	]);
	return { events: eventRows, actors: actorRows };
}
