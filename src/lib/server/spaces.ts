// 場（ハコ）・団体のページ: 作成、管理者判定、プロフィールの読み書き。
import { and, asc, count, eq, gte, isNull, min } from "drizzle-orm";
import { nameOnlyIfUnmanaged } from "#lib/actor.ts";
import { compareArea, detectArea } from "#lib/area.ts";
import type { ParsedSpace } from "#lib/space-form.ts";
import { mediaUrl, type SpaceSummary } from "#lib/types.ts";
import type { Db } from "./db/index.ts";
import { actorMembers, actors, events } from "./db/schema.ts";
import { isBlockedHandle } from "./moderation.ts";

export type ManagedActor = typeof actors.$inferSelect;
export type ManagedRef = {
	id: string;
	handle: string;
	name: string;
	kind: ManagedActor["kind"];
};

// ハコ一覧。エリア順（region の都道府県）、同じエリアでは今から先の間が多い順。
// showSamples: 開発環境で、取り込んだ見本のハコを紹介文つきで出す（nameOnlyIfUnmanaged）
export async function listSpaces(
	db: Db,
	showSamples = false,
): Promise<SpaceSummary[]> {
	const upcoming = db
		.select({
			actorId: events.spaceActorId,
			n: count().as("n"),
			nextAt: min(events.startsAt).as("next_at"),
		})
		.from(events)
		.where(
			and(
				eq(events.status, "published"),
				eq(events.visibility, "public"),
				gte(events.startsAt, new Date()),
			),
		)
		.groupBy(events.spaceActorId)
		.as("upcoming");
	const managers = db
		.select({ actorId: actorMembers.actorId })
		.from(actorMembers)
		.groupBy(actorMembers.actorId)
		.as("managers");
	const rows = await db
		.select({
			handle: actors.handle,
			name: actors.name,
			catch: actors.catch,
			summary: actors.summary,
			region: actors.region,
			headerKey: actors.headerKey,
			avatarUrl: actors.avatarUrl,
			managerId: managers.actorId,
			upcoming: upcoming.n,
			nextAt: upcoming.nextAt,
			createdAt: actors.createdAt,
		})
		.from(actors)
		.leftJoin(upcoming, eq(upcoming.actorId, actors.id))
		.leftJoin(managers, eq(managers.actorId, actors.id))
		.where(and(eq(actors.kind, "space"), isNull(actors.hiddenAt)));
	return rows
		.map(
			({ region, headerKey, managerId, upcoming, nextAt, createdAt, ...r }) =>
				nameOnlyIfUnmanaged(
					{
						...r,
						area: detectArea(region),
						headerUrl: mediaUrl(headerKey),
						hasManager: managerId !== null,
						upcoming: upcoming ?? 0,
						nextAt: nextAt?.toISOString() ?? null,
						createdAt: createdAt.toISOString(),
					},
					showSamples,
				),
		)
		.sort(
			(a, b) =>
				compareArea(a.area, b.area) ||
				b.upcoming - a.upcoming ||
				a.name.localeCompare(b.name, "ja"),
		);
}

// ユーザーが管理している場・団体（本人の person は含まない）
export async function listManagedActors(
	db: Db,
	userId: string,
): Promise<ManagedRef[]> {
	return db
		.select({
			id: actors.id,
			handle: actors.handle,
			name: actors.name,
			kind: actors.kind,
		})
		.from(actorMembers)
		.innerJoin(actors, eq(actorMembers.actorId, actors.id))
		.where(eq(actorMembers.userId, userId))
		.orderBy(asc(actors.name));
}

// handle のアクターを、そのユーザーが編集できるなら返す（本人の person か、メンバーの場・団体）
export async function getManagedActor(
	db: Db,
	handle: string,
	userId: string,
): Promise<ManagedActor | null> {
	const [actor] = await db
		.select()
		.from(actors)
		.where(eq(actors.handle, handle))
		.limit(1);
	if (!actor) return null;
	if (actor.userId === userId) return actor;
	const [member] = await db
		.select({ role: actorMembers.role })
		.from(actorMembers)
		.where(
			and(eq(actorMembers.actorId, actor.id), eq(actorMembers.userId, userId)),
		)
		.limit(1);
	return member ? actor : null;
}

export async function createManagedActor(
	db: Db,
	input: {
		userId: string;
		handle: string;
		name: string;
		kind: "space" | "group";
	},
): Promise<{ handle: string } | { error: string }> {
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
		.values({ handle: input.handle, kind: input.kind, name: input.name })
		.returning({ id: actors.id, handle: actors.handle });
	await db
		.insert(actorMembers)
		.values({ actorId: row.id, userId: input.userId, role: "owner" });
	return { handle: row.handle };
}

export async function updateActorPage(
	db: Db,
	actorId: string,
	values: ParsedSpace,
): Promise<void> {
	await db
		.update(actors)
		// Instagram の欄はやめた。前の値は編集画面がリンクへ移して送ってくる
		.set({ ...values, instagram: null, updatedAt: new Date() })
		.where(eq(actors.id, actorId));
}

export async function setHeaderKey(
	db: Db,
	actorId: string,
	headerKey: string | null,
) {
	await db
		.update(actors)
		.set({ headerKey, updatedAt: new Date() })
		.where(eq(actors.id, actorId));
}

// 会をハコに紐づけるときの解決。handle が空なら null、場でなければ error
export async function resolveSpace(
	db: Db,
	handle: string | null,
): Promise<{ id: string | null; region: string | null } | { error: string }> {
	if (!handle) return { id: null, region: null };
	const [row] = await db
		.select({ id: actors.id, kind: actors.kind, region: actors.region })
		.from(actors)
		.where(eq(actors.handle, handle))
		.limit(1);
	if (row?.kind !== "space")
		return { error: `@${handle} というハコは見つかりません` };
	return { id: row.id, region: row.region };
}

// ハコ・団体の管理者。全員が同じ権限（ページの編集）を持つ
export type Member = {
	userId: string;
	handle: string;
	name: string;
	role: "owner" | "editor";
};

export async function listMembers(db: Db, actorId: string): Promise<Member[]> {
	return db
		.select({
			userId: actorMembers.userId,
			handle: actors.handle,
			name: actors.name,
			role: actorMembers.role,
		})
		.from(actorMembers)
		.innerJoin(
			actors,
			and(eq(actors.userId, actorMembers.userId), eq(actors.kind, "person")),
		)
		.where(eq(actorMembers.actorId, actorId))
		.orderBy(asc(actorMembers.createdAt));
}

// 管理者を外す。最後の 1 人は外せない（外せたら true）
export async function removeMember(
	db: Db,
	actorId: string,
	userId: string,
): Promise<boolean> {
	const members = await db
		.select({ userId: actorMembers.userId })
		.from(actorMembers)
		.where(eq(actorMembers.actorId, actorId));
	if (members.length <= 1 || !members.some((m) => m.userId === userId))
		return false;
	await db
		.delete(actorMembers)
		.where(
			and(eq(actorMembers.actorId, actorId), eq(actorMembers.userId, userId)),
		);
	return true;
}
