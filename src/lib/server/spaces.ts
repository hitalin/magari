// 場（ハコ）・団体のページ: 作成、管理者判定、プロフィール・プラン・お知らせ・問い合わせの読み書き。
import { and, asc, count, desc, eq, gte } from "drizzle-orm";
import { compareArea, detectArea } from "#lib/area.ts";
import type {
	ParsedInquiry,
	ParsedPlan,
	ParsedSpace,
} from "#lib/space-form.ts";
import {
	mediaUrl,
	type Post,
	type SpacePlan,
	type SpaceSummary,
} from "#lib/types.ts";
import type { Db } from "./db/index.ts";
import {
	actorMembers,
	actors,
	events,
	inquiries,
	posts,
	spacePlans,
} from "./db/schema.ts";

export type ManagedActor = typeof actors.$inferSelect;
export type ManagedRef = {
	id: string;
	handle: string;
	name: string;
	kind: ManagedActor["kind"];
};

export async function listPlans(db: Db, actorId: string): Promise<SpacePlan[]> {
	return db
		.select({
			id: spacePlans.id,
			name: spacePlans.name,
			kind: spacePlans.kind,
			priceText: spacePlans.priceText,
			description: spacePlans.description,
		})
		.from(spacePlans)
		.where(eq(spacePlans.actorId, actorId))
		.orderBy(asc(spacePlans.sortOrder), asc(spacePlans.id));
}

export async function listPosts(
	db: Db,
	actorId: string,
	limit = 20,
): Promise<Post[]> {
	const rows = await db
		.select({
			id: posts.id,
			title: posts.title,
			body: posts.body,
			publishedAt: posts.publishedAt,
		})
		.from(posts)
		.where(and(eq(posts.actorId, actorId), eq(posts.status, "published")))
		.orderBy(desc(posts.publishedAt))
		.limit(limit);
	return rows.map((r) => ({ ...r, publishedAt: r.publishedAt.toISOString() }));
}

// ハコ一覧。エリア順（region の都道府県）、同じエリアでは今から先の間が多い順。
export async function listSpaces(db: Db): Promise<SpaceSummary[]> {
	const upcoming = db
		.select({ actorId: events.spaceActorId, n: count().as("n") })
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
		})
		.from(actors)
		.leftJoin(upcoming, eq(upcoming.actorId, actors.id))
		.leftJoin(managers, eq(managers.actorId, actors.id))
		.where(eq(actors.kind, "space"));
	return rows
		.map(({ region, headerKey, managerId, upcoming, ...r }) => ({
			...r,
			area: detectArea(region),
			headerUrl: mediaUrl(headerKey),
			hasManager: managerId !== null,
			upcoming: upcoming ?? 0,
		}))
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
		.set({ ...values, updatedAt: new Date() })
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

export async function createPlan(
	db: Db,
	actorId: string,
	values: ParsedPlan,
): Promise<void> {
	const existing = await listPlans(db, actorId);
	await db
		.insert(spacePlans)
		.values({ ...values, actorId, sortOrder: existing.length });
}

export async function updatePlan(
	db: Db,
	actorId: string,
	id: string,
	values: ParsedPlan,
) {
	await db
		.update(spacePlans)
		.set(values)
		.where(and(eq(spacePlans.id, id), eq(spacePlans.actorId, actorId)));
}

export async function deletePlan(
	db: Db,
	actorId: string,
	id: string,
): Promise<void> {
	await db
		.delete(spacePlans)
		.where(and(eq(spacePlans.id, id), eq(spacePlans.actorId, actorId)));
}

export async function createPost(
	db: Db,
	actorId: string,
	values: { title: string; body: string | null },
): Promise<void> {
	await db.insert(posts).values({ ...values, actorId });
}

export async function deletePost(
	db: Db,
	actorId: string,
	id: string,
): Promise<void> {
	await db
		.delete(posts)
		.where(and(eq(posts.id, id), eq(posts.actorId, actorId)));
}

export async function createInquiry(
	db: Db,
	actorId: string,
	values: ParsedInquiry,
) {
	await db.insert(inquiries).values({ ...values, actorId });
}

export type Inquiry = typeof inquiries.$inferSelect;

export async function listInquiries(
	db: Db,
	actorId: string,
	limit = 100,
): Promise<Inquiry[]> {
	return db
		.select()
		.from(inquiries)
		.where(eq(inquiries.actorId, actorId))
		.orderBy(desc(inquiries.createdAt))
		.limit(limit);
}

export async function deleteInquiry(
	db: Db,
	actorId: string,
	id: string,
): Promise<void> {
	await db
		.delete(inquiries)
		.where(and(eq(inquiries.id, id), eq(inquiries.actorId, actorId)));
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
