// 主催どうしの関係のメモ（host_moderations）の読み書き。呼ぶ側が、持ち主のページの管理者だと確かめてから呼ぶ。
import { and, asc, eq, inArray } from "drizzle-orm";
import type { ModerationKind, ParsedModeration } from "#lib/host-moderation.ts";
import type { ActorRef } from "#lib/types.ts";
import type { Db } from "./db/index.ts";
import { actors, eventHosts, hostModerations } from "./db/schema.ts";
import { seal, unseal } from "./seal.ts";

// 封じる中身。a と b は actor の ID
type Sealed = { kind: ModerationKind; a: string; b: string | null };

export type HostModeration = {
	id: string;
	kind: ModerationKind;
	a: ActorRef;
	b: ActorRef | null;
	createdAt: Date;
};

const MAX_MODERATIONS = 100;

export async function listHostModerations(
	db: Db,
	secret: string,
	ownerActorId: string,
): Promise<HostModeration[]> {
	const rows = await db
		.select()
		.from(hostModerations)
		.where(eq(hostModerations.ownerActorId, ownerActorId))
		.orderBy(asc(hostModerations.createdAt));
	const opened = (
		await Promise.all(
			rows.map(async (row) => ({
				row,
				moderation: await unseal<Sealed>(secret, ownerActorId, row.sealed),
			})),
		)
	).flatMap(({ row, moderation }) => (moderation ? [{ row, moderation }] : []));
	const ids = [
		...new Set(
			opened.flatMap(({ moderation }) => [
				moderation.a,
				moderation.b ?? moderation.a,
			]),
		),
	];
	const refs = new Map(
		ids.length
			? (
					await db
						.select({
							id: actors.id,
							handle: actors.handle,
							name: actors.name,
							kind: actors.kind,
							avatarUrl: actors.avatarUrl,
						})
						.from(actors)
						.where(inArray(actors.id, ids))
				).map(({ id, ...ref }) => [id, ref])
			: [],
	);
	const moderations: HostModeration[] = [];
	const gone: string[] = [];
	for (const { row, moderation } of opened) {
		const a = refs.get(moderation.a);
		const b = moderation.b ? refs.get(moderation.b) : null;
		// 相手のページが消えたメモは、ここで消す（封じてあるので、DB の側では相手を追えない）
		if (!a || b === undefined) gone.push(row.id);
		else
			moderations.push({
				id: row.id,
				kind: moderation.kind,
				a,
				b,
				createdAt: row.createdAt,
			});
	}
	if (gone.length)
		await db.delete(hostModerations).where(inArray(hostModerations.id, gone));
	return moderations;
}

// 相手にできるのは、もう主催として載っているページだけ: ハコ・団体か、会を主催したことのある人。
// ログインしただけの人（客かもしれない）は相手にできない
async function resolveHost(
	db: Db,
	handle: string,
): Promise<string | { error: string }> {
	const [actor] = await db
		.select({ id: actors.id, kind: actors.kind })
		.from(actors)
		.where(eq(actors.handle, handle))
		.limit(1);
	if (!actor) return { error: `@${handle} というページはありません` };
	if (actor.kind !== "person") return actor.id;
	const [hosted] = await db
		.select({ eventId: eventHosts.eventId })
		.from(eventHosts)
		.where(eq(eventHosts.actorId, actor.id))
		.limit(1);
	return hosted
		? actor.id
		: { error: `@${handle} は、会を主催していないので書けません` };
}

export async function addHostModeration(
	db: Db,
	secret: string,
	ownerActorId: string,
	authorUserId: string,
	values: ParsedModeration,
): Promise<{ ok: true } | { error: string }> {
	const count = await db.$count(
		hostModerations,
		eq(hostModerations.ownerActorId, ownerActorId),
	);
	if (count >= MAX_MODERATIONS)
		return { error: `${MAX_MODERATIONS} 件までです` };
	const a = await resolveHost(db, values.a);
	if (typeof a !== "string") return a;
	const b = values.b ? await resolveHost(db, values.b) : null;
	if (b !== null && typeof b !== "string") return b;
	const moderation: Sealed = { kind: values.kind, a, b };
	await db.insert(hostModerations).values({
		ownerActorId,
		sealed: await seal(secret, ownerActorId, moderation),
		authorUserId,
	});
	return { ok: true };
}

export async function deleteHostModeration(
	db: Db,
	ownerActorId: string,
	id: string,
) {
	await db
		.delete(hostModerations)
		.where(
			and(
				eq(hostModerations.id, id),
				eq(hostModerations.ownerActorId, ownerActorId),
			),
		);
}

// 運営の操作: そのページの管理者が書いたメモを、読まずにすべて消す。ページが無ければ null
export async function purgeHostModerations(
	db: Db,
	ownerHandle: string,
): Promise<number | null> {
	const [owner] = await db
		.select({ id: actors.id })
		.from(actors)
		.where(eq(actors.handle, ownerHandle))
		.limit(1);
	if (!owner) return null;
	const removed = await db
		.delete(hostModerations)
		.where(eq(hostModerations.ownerActorId, owner.id))
		.returning({ id: hostModerations.id });
	return removed.length;
}
