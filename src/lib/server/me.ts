import { redirect } from "@sveltejs/kit";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import type { ParsedEvent } from "#lib/event-form.ts";
import type { Db } from "./db/index.ts";
import { actorMembers, actors, eventHosts, events } from "./db/schema.ts";
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

// 小さなアイコン URL を大きいものに。X は _normal（48px）→ _400x400、Misskey のプロキシ縮小は元画像に。
export function largeAvatarUrl(url: string | null | undefined): string | null {
	if (!url) return null;
	if (/pbs\.twimg\.com/.test(url))
		return url.replace(/_normal(\.[a-z]+)$/i, "_400x400$1");
	try {
		const u = new URL(url);
		const original = u.searchParams.get("url");
		if (u.pathname.startsWith("/proxy/") && original) return original;
	} catch {
		return url;
	}
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

// アカウント削除: 本人の場（主催・作成）と本人のアクターを消す。ユーザー本体は better-auth が消す
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
			await db.delete(events).where(
				and(
					isNull(events.source),
					inArray(
						events.id,
						hosted.slice(i, i + 90).map((h) => h.id),
					),
				),
			);
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

export function requireLogin(
	locals: App.Locals,
): NonNullable<App.Locals["session"]> {
	if (!locals.session) redirect(303, "/login");
	return locals.session;
}

export function requireActor(locals: App.Locals): {
	session: NonNullable<App.Locals["session"]>;
	actor: MyActor;
} {
	const session = requireLogin(locals);
	if (!locals.actor) redirect(303, "/welcome");
	return { session, actor: locals.actor };
}

export type MyEvent = typeof events.$inferSelect & {
	hostIds: string[];
	spaceHandle: string | null;
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
	return rows.map((r) => ({ ...r, hostIds: [], spaceHandle: null }));
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
				.select({ handle: actors.handle })
				.from(actors)
				.where(eq(actors.id, row.spaceActorId))
				.limit(1)
		: [];
	return { ...row, hostIds, spaceHandle: space?.handle ?? null };
}

// ParsedEvent の spaceHandle を actors.id に解決する。見つからなければ error
export async function toEventValues(
	db: Db,
	input: ParsedEvent,
): Promise<EventValues | { error: string }> {
	const { spaceHandle, ...rest } = input;
	const space = await resolveSpace(db, spaceHandle);
	if ("error" in space) return space;
	return { ...rest, spaceActorId: space.id };
}
export type EventValues = Omit<ParsedEvent, "spaceHandle"> & {
	spaceActorId: string | null;
};

export async function createEvent(
	db: Db,
	input: EventValues,
	hostActorId: string,
	userId: string,
): Promise<string> {
	const [row] = await db
		.insert(events)
		.values({ ...input, createdByUserId: userId })
		.returning({ id: events.id });
	await db
		.insert(eventHosts)
		.values({ eventId: row.id, actorId: hostActorId, role: "host" });
	return row.id;
}

export async function updateEvent(
	db: Db,
	id: string,
	input: EventValues,
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
