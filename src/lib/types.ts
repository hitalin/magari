// API（/api/*）が返す DTO。サーバーとクライアントで共有する。

export type ActorRef = {
	handle: string;
	name: string;
	kind: "person" | "space" | "group";
};

export type EventSummary = {
	id: string;
	title: string;
	startsAt: string;
	endsAt: string | null;
	allDay: boolean;
	area: string | null;
	locationName: string | null;
	onlineUrl: string | null;
	tags: string[];
	space: ActorRef | null;
	hosts: ActorRef[];
};

export type EventDetail = EventSummary & {
	description: string | null;
	url: string | null;
	source: string | null;
	locationAddress: string | null;
	locationVisibility: "public" | "attendees";
	capacity: number | null;
	feeText: string | null;
	status: "draft" | "published" | "cancelled";
	visibility: "public" | "unlisted" | "private";
};

export type ActorProfile = ActorRef & {
	id: string;
	// 取り込み元（sources.ts）のハコ・団体。header は一覧用のバナーなので、ページの上部には出さない
	imported: boolean;
	avatarUrl: string | null;
	headerUrl: string | null;
	summary: string | null;
	url: string | null;
	xHandle: string | null;
	instagram: string | null;
	address: string | null;
	region: string | null;
	// 場のホームページ相当
	catch: string | null;
	body: string | null;
	facilities: string[];
	hours: string | null;
	closedDays: string | null;
	access: string | null;
	operator: string | null;
	links: { label: string; url: string }[];
};

export type SpacePlan = {
	id: string;
	name: string;
	kind: "spot" | "weekly" | "exclusive" | "other";
	priceText: string | null;
	description: string | null;
};

export type Post = {
	id: string;
	title: string;
	body: string | null;
	publishedAt: string;
};

export type ActorPage = {
	actor: ActorProfile;
	plans: SpacePlan[];
	posts: Post[];
	events: EventSummary[];
};

// ハコ一覧（/spaces）の 1 行
export type SpaceSummary = {
	handle: string;
	name: string;
	catch: string | null;
	summary: string | null;
	area: string | null;
	headerUrl: string | null;
	avatarUrl: string | null;
	// 今から先の公開の間の数
	upcoming: number;
};

// R2 に置いた画像の公開 URL
export const mediaUrl = (key: string | null | undefined): string | null =>
	key ? `/i/${key}` : null;

export const KIND_LABEL: Record<ActorRef["kind"], string> = {
	person: "人",
	space: "場",
	group: "団体",
};
