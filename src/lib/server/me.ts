import { redirect } from "@sveltejs/kit";
import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { eventArea } from "#lib/area.ts";
import type { ParsedEvent } from "#lib/event-form.ts";
import { withNext } from "#lib/next.ts";
import type { Db } from "./db/index.ts";
import { actorMembers, actors, eventHosts, events } from "./db/schema.ts";
import { isBlockedHandle } from "./moderation.ts";
import { resolveSpace } from "./spaces.ts";

export type MyActor = {
	id: string;
	handle: string;
	name: string;
	avatarUrl: string | null;
};

// ユーザー本人の Person アクター
export async function getActorForUser(
	db: Db,
	userId: string,
): Promise<MyActor | null> {
	const [row] = await db
		.select({
			id: actors.id,
			handle: actors.handle,
			name: actors.name,
			avatarUrl: actors.avatarUrl,
		})
		.from(actors)
		.where(eq(actors.userId, userId))
		.limit(1);
	return row ?? null;
}

// 小さなアイコン URL を大きいものに。X は _normal（48px）→ _400x400。
export function largeAvatarUrl(url: string | null | undefined): string | null {
	if (!url) return null;
	if (/pbs\.twimg\.com/.test(url))
		return url.replace(/_normal(\.[a-z]+)$/i, "_400x400$1");
	return url;
}

// ログイン元のアイコンを写す（未設定か、小さい URL のままなら更新）
export async function syncAvatar(
	db: Db,
	actor: MyActor,
	image: string | null | undefined,
): Promise<MyActor> {
	const large = largeAvatarUrl(image);
	if (!large) return actor;
	if (actor.avatarUrl && largeAvatarUrl(actor.avatarUrl) === actor.avatarUrl)
		return actor;
	if (actor.avatarUrl === large) return actor;
	await db
		.update(actors)
		.set({ avatarUrl: large, updatedAt: new Date() })
		.where(eq(actors.id, actor.id));
	return { ...actor, avatarUrl: large };
}

// 主催が actorId だけの間。ほかに主催がいる間は含めない
export function soleHostedEventIds(
	rows: { eventId: string; actorId: string }[],
	actorId: string,
): string[] {
	const shared = new Set(
		rows.filter((r) => r.actorId !== actorId).map((r) => r.eventId),
	);
	return [
		...new Set(
			rows
				.filter((r) => r.actorId === actorId && !shared.has(r.eventId))
				.map((r) => r.eventId),
		),
	];
}

// アカウント削除: 本人が作った間、主催が本人だけの間、本人のアクターを消す。ユーザー本体は better-auth が消す。
// ほかに主催のいる間は消さず、本人が主催から外れるだけ（event_hosts はアクターの削除で消える）
export async function deleteMyData(
	db: Db,
	userId: string,
	actor: MyActor | null,
): Promise<void> {
	if (actor) {
		const hosted = await db
			.select({ id: eventHosts.eventId })
			.from(eventHosts)
			.where(eq(eventHosts.actorId, actor.id));
		for (let i = 0; i < hosted.length; i += 90) {
			const ids = hosted.slice(i, i + 90).map((h) => h.id);
			const rows = await db
				.select({ eventId: eventHosts.eventId, actorId: eventHosts.actorId })
				.from(eventHosts)
				.where(inArray(eventHosts.eventId, ids));
			const sole = soleHostedEventIds(rows, actor.id);
			if (sole.length)
				await db
					.delete(events)
					.where(and(isNull(events.source), inArray(events.id, sole)));
		}
		await db.delete(actors).where(eq(actors.id, actor.id));
	}
	await db
		.delete(events)
		.where(and(isNull(events.source), eq(events.createdByUserId, userId)));
}

export async function createPersonActor(
	db: Db,
	input: {
		userId: string;
		handle: string;
		name: string;
		avatarUrl: string | null;
	},
): Promise<MyActor | { error: string }> {
	const [taken] = await db
		.select({ id: actors.id })
		.from(actors)
		.where(eq(actors.handle, input.handle))
		.limit(1);
	if (taken) return { error: "その ID は使われています" };
	if (await isBlockedHandle(db, input.handle))
		return { error: "その ID は使えません" };
	const [row] = await db
		.insert(actors)
		.values({
			handle: input.handle,
			kind: "person",
			name: input.name,
			userId: input.userId,
			avatarUrl: largeAvatarUrl(input.avatarUrl),
		})
		.returning({
			id: actors.id,
			handle: actors.handle,
			name: actors.name,
			avatarUrl: actors.avatarUrl,
		});
	return row;
}

// ユーザーが代表できる Actor（本人 + 管理している場・団体）
export async function listManagedActorIds(
	db: Db,
	userId: string,
	self: MyActor | null,
): Promise<string[]> {
	const rows = await db
		.select({ actorId: actorMembers.actorId })
		.from(actorMembers)
		.where(eq(actorMembers.userId, userId));
	return [...(self ? [self.id] : []), ...rows.map((r) => r.actorId)];
}

// next: ログイン（と初回登録）のあとに戻る先。ページの load が自分の URL を渡す
export function requireLogin(
	locals: App.Locals,
	next?: string,
): NonNullable<App.Locals["session"]> {
	if (!locals.session) redirect(303, withNext("/login", next));
	return locals.session;
}

export function requireActor(
	locals: App.Locals,
	next?: string,
): {
	session: NonNullable<App.Locals["session"]>;
	actor: MyActor;
} {
	const session = requireLogin(locals, next);
	if (!locals.actor) redirect(303, withNext("/welcome", next));
	return { session, actor: locals.actor };
}

export type MyEvent = typeof events.$inferSelect & {
	hostIds: string[];
	spaceHandle: string | null;
	spaceName: string | null;
};

export async function listMyEvents(
	db: Db,
	userId: string,
	actorIds: string[],
): Promise<MyEvent[]> {
	const hosted = actorIds.length
		? db
				.select({ id: eventHosts.eventId })
				.from(eventHosts)
				.where(inArray(eventHosts.actorId, actorIds))
		: null;
	const rows = await db
		.select()
		.from(events)
		.where(
			and(
				isNull(events.source),
				hosted
					? or(eq(events.createdByUserId, userId), inArray(events.id, hosted))
					: eq(events.createdByUserId, userId),
			),
		)
		.orderBy(desc(events.startsAt))
		.limit(300);
	return rows.map((r) => ({
		...r,
		hostIds: [],
		spaceHandle: null,
		spaceName: null,
	}));
}

// 自分が編集できる会（作成者か主催者。取り込んだ会は不可）
export async function getEditableEvent(
	db: Db,
	id: string,
	userId: string,
	actorIds: string[],
): Promise<MyEvent | null> {
	const [row] = await db
		.select()
		.from(events)
		.where(and(eq(events.id, id), isNull(events.source)))
		.limit(1);
	if (!row) return null;
	const hosts = await db
		.select({ actorId: eventHosts.actorId })
		.from(eventHosts)
		.where(eq(eventHosts.eventId, id));
	const hostIds = hosts.map((h) => h.actorId);
	const mine =
		row.createdByUserId === userId || hostIds.some((h) => actorIds.includes(h));
	if (!mine) return null;
	const [space] = row.spaceActorId
		? await db
				.select({ handle: actors.handle, name: actors.name })
				.from(actors)
				.where(eq(actors.id, row.spaceActorId))
				.limit(1)
		: [];
	return {
		...row,
		hostIds,
		spaceHandle: space?.handle ?? null,
		spaceName: space?.name ?? null,
	};
}

// ParsedEvent の spaceHandle を actors.id に解決する。見つからなければ error
export async function toEventValues(
	db: Db,
	input: ParsedEvent,
): Promise<EventValues | { error: string }> {
	const { spaceHandle, ...rest } = input;
	const space = await resolveSpace(db, spaceHandle);
	if ("error" in space) return space;
	return {
		...rest,
		spaceActorId: space.id,
		// 一覧とカレンダーのエリア絞り込みに要る
		area: eventArea({ ...rest, spaceRegion: space.region }),
	};
}
export type EventValues = Omit<ParsedEvent, "spaceHandle"> & {
	spaceActorId: string | null;
	area: string | null;
};

export async function createEvent(
	db: Db,
	input: EventValues,
	hostActorId: string,
	userId: string,
	// 作成画面が先に決めた ID（画面で見たビラと同じ見た目にするため）。もう使われていたら null を返す
	id?: string,
): Promise<string | null> {
	const [row] = await db
		.insert(events)
		.values({ ...input, createdByUserId: userId, ...(id ? { id } : {}) })
		.onConflictDoNothing()
		.returning({ id: events.id });
	if (!row) return null;
	await db
		.insert(eventHosts)
		.values({ eventId: row.id, actorId: hostActorId, role: "host" });
	return row.id;
}

export async function updateEvent(
	db: Db,
	id: string,
	input: Omit<EventValues, "status"> & {
		status: "draft" | "published" | "cancelled";
	},
): Promise<void> {
	await db
		.update(events)
		.set({ ...input, updatedAt: new Date() })
		.where(eq(events.id, id));
}

export async function setEventStatus(
	db: Db,
	id: string,
	status: "published" | "draft" | "cancelled",
): Promise<void> {
	await db
		.update(events)
		.set({ status, updatedAt: new Date() })
		.where(eq(events.id, id));
}

export async function deleteEvent(db: Db, id: string): Promise<void> {
	await db.delete(events).where(eq(events.id, id));
}

export type EventHost = {
	actorId: string;
	handle: string;
	name: string;
	role: "host" | "cohost";
};

export async function listEventHosts(
	db: Db,
	eventId: string,
): Promise<EventHost[]> {
	return db
		.select({
			actorId: actors.id,
			handle: actors.handle,
			name: actors.name,
			role: eventHosts.role,
		})
		.from(eventHosts)
		.innerJoin(actors, eq(eventHosts.actorId, actors.id))
		.where(eq(eventHosts.eventId, eventId))
		.orderBy(asc(eventHosts.role));
}

// 主催を外す。最後の 1 人は外せない（外せたら true）
export async function removeEventHost(
	db: Db,
	eventId: string,
	actorId: string,
): Promise<boolean> {
	const hosts = await db
		.select({ actorId: eventHosts.actorId })
		.from(eventHosts)
		.where(eq(eventHosts.eventId, eventId));
	if (hosts.length <= 1 || !hosts.some((h) => h.actorId === actorId))
		return false;
	await db
		.delete(eventHosts)
		.where(
			and(eq(eventHosts.eventId, eventId), eq(eventHosts.actorId, actorId)),
		);
	return true;
}

// 会のフライヤー（R2 のキー）。null で自動のビラに戻す
export async function setEventFlyer(
	db: Db,
	id: string,
	coverKey: string | null,
): Promise<void> {
	await db
		.update(events)
		.set({ coverKey, updatedAt: new Date() })
		.where(eq(events.id, id));
}
