// API（/api/*）が返す DTO。サーバーとクライアントで共有する。
import type { FlyerLook } from "./flyer";

export type ActorRef = {
	handle: string;
	name: string;
	kind: "person" | "space" | "group";
	// 一覧で名前の横に出す顔
	avatarUrl?: string | null;
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
	space: ActorRef | null;
	hosts: ActorRef[];
	// 主催が上げたフライヤー。無ければ自動のビラを描く
	flyerUrl: string | null;
	// 自動のビラの型と差し色（開けた人が選んだもの）。無ければ ID から決まる
	flyerLook: FlyerLook | null;
};

// 題などに書かれた @name のうち、まがりにいる人。Misskey で共有するときの宛先に使う
export type ShareMention = {
	handle: string;
	// X の ID（@ なし）
	x: string | null;
	// @name@host
	fediverse: string | null;
};

export type EventDetail = EventSummary & {
	description: string | null;
	url: string | null;
	source: string | null;
	locationAddress: string | null;
	locationVisibility: "public" | "attendees";
	feeText: string | null;
	status: "draft" | "published" | "cancelled";
	visibility: "public" | "unlisted";
	// 運営が非表示にしている（主催にだけ見える）
	hidden: boolean;
	mentions: ShareMention[];
	// 繰り返しの中の回なら、その決まりと前後の回
	series: EventSeriesInfo | null;
};

export type SeriesOccurrence = {
	id: string;
	startsAt: string;
	cancelled: boolean;
};

export type EventSeriesInfo = {
	// 「毎週火曜」
	label: string;
	// 最後の回の日（決めていなければ null）
	until: string | null;
	prev: SeriesOccurrence | null;
	// この先の回（近い順に 4 つまで）
	next: SeriesOccurrence[];
};

export type ActorProfile = ActorRef & {
	id: string;
	// 管理者（人なら本人、ハコ・団体なら actor_members）がいるか。いなければ非公式のページとして名前だけを出す
	hasManager: boolean;
	avatarUrl: string | null;
	headerUrl: string | null;
	summary: string | null;
	url: string | null;
	xHandle: string | null;
	// "name@host"。人はログインでつないだもの全部、ハコ・団体は欄の 1 つ
	misskey: string[];
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

export type ActorPage = {
	actor: ActorProfile;
	events: EventSummary[];
	// これまでの間の新しいほうから数件（ページの下に出す）と、まだ先があるか
	past: EventSummary[];
	morePast: boolean;
};

// /@handle/past の 1 ページぶん。next は続きを取るときの before
export type ActorPast = {
	actor: ActorRef;
	// 管理者のいないハコ・団体のページか（検索に載せない）
	unofficial: boolean;
	events: EventSummary[];
	next: string | null;
};

// 「これから」と「これまで」の境目。始まってから 1 日は「これから」に残す
export const pastBefore = () => new Date(Date.now() - 86_400_000);

// ハコ一覧（/spaces）の 1 行
export type SpaceSummary = {
	handle: string;
	name: string;
	catch: string | null;
	summary: string | null;
	area: string | null;
	headerUrl: string | null;
	avatarUrl: string | null;
	// 管理者がいるか。いなければ一覧で「非公式」と出す
	hasManager: boolean;
	// 今から先の公開の間の数
	upcoming: number;
	// 今から先でいちばん近い公開の間の開始（ISO）。無ければ null
	nextAt: string | null;
	// ハコを載せた日時（ISO）
	createdAt: string;
};

// R2 に置いた画像の公開 URL
export const mediaUrl = (key: string | null | undefined): string | null =>
	key ? `/i/${key}` : null;

export const KIND_LABEL: Record<ActorRef["kind"], string> = {
	person: "人",
	space: "場",
	group: "団体",
};
