import {
	and,
	asc,
	eq,
	gte,
	inArray,
	isNotNull,
	isNull,
	lt,
	notInArray,
	or,
} from "drizzle-orm";
import { nameOnlyIfUnmanaged } from "#lib/actor.ts";
import {
	type ActorProfile,
	type ActorRef,
	type EventDetail,
	type EventSummary,
	mediaUrl,
} from "#lib/types.ts";
import type { Db } from "./db/index.ts";
import { actorMembers, actors, eventHosts, events } from "./db/schema.ts";

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
			capacity: events.capacity,
			feeText: events.feeText,
			tags: events.tags,
			coverKey: events.coverKey,
			hiddenAt: events.hiddenAt,
			spaceHandle: actors.handle,
			spaceName: actors.name,
			spaceKind: actors.kind,
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
		for (const { eventId, avatarUrl, ...actor } of rows) {
			const host = actor.kind === "person" ? { ...actor, avatarUrl } : actor;
			map.set(eventId, [...(map.get(eventId) ?? []), host]);
		}
	}
	return map;
}

function toDetail(row: Row, hosts: ActorRef[]): EventDetail {
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
		// 参加者限定の場所は API に出さない
		locationAddress:
			row.locationVisibility === "public" ? row.locationAddress : null,
		locationVisibility: row.locationVisibility,
		onlineUrl: row.onlineUrl,
		capacity: row.capacity,
		feeText: row.feeText,
		tags: row.tags,
		flyerUrl: mediaUrl(row.coverKey),
		space:
			row.spaceHandle && row.spaceName && row.spaceKind
				? { handle: row.spaceHandle, name: row.spaceName, kind: row.spaceKind }
				: null,
		hosts,
	};
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
		tags,
		space,
		hosts,
		flyerUrl,
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
		tags,
		space,
		hosts,
		flyerUrl,
	};
}

export async function listUpcomingEvents(
	db: Db,
	opts: {
		actorId?: string;
		limit?: number;
		from?: Date;
		to?: Date;
		// 主催がフライヤー画像を上げた会だけ（壁）
		withFlyer?: boolean;
	} = {},
): Promise<EventSummary[]> {
	const from = opts.from ?? new Date();
	const upcoming = and(
		eq(events.status, "published"),
		eq(events.visibility, "public"),
		gte(events.startsAt, from),
		opts.to ? lt(events.startsAt, opts.to) : undefined,
		opts.withFlyer ? isNotNull(events.coverKey) : undefined,
		notHidden(db),
	);
	// actorId 指定時は、その Actor が場または主催の会に絞る
	const where = opts.actorId
		? and(
				upcoming,
				or(
					eq(events.spaceActorId, opts.actorId),
					inArray(
						events.id,
						db
							.select({ id: eventHosts.eventId })
							.from(eventHosts)
							.where(eq(eventHosts.actorId, opts.actorId)),
					),
				),
			)
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
	if (!row || row.status === "draft" || row.visibility === "private")
		return null;
	const hosts = await hostsByEvent(db, [row.id]);
	return toDetail(row, hosts.get(row.id) ?? []);
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
	return toDetail(row, hosts.get(row.id) ?? []);
}

export async function getActorByHandle(
	db: Db,
	handle: string,
	// 開発環境で、取り込んだ見本のハコを写真つきで出す（nameOnlyIfUnmanaged）
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
	return nameOnlyIfUnmanaged(
		{
			...rest,
			hasManager: userId !== null || member !== undefined,
			headerUrl: mediaUrl(headerKey),
		},
		showSamples,
	);
}
