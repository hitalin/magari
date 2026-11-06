// API（/api/*）が返す DTO。サーバーとクライアントで共有する。

export type ActorRef = { handle: string; name: string; kind: 'person' | 'space' | 'group' };

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
	locationVisibility: 'public' | 'attendees';
	capacity: number | null;
	feeText: string | null;
	status: 'draft' | 'published' | 'cancelled';
	visibility: 'public' | 'unlisted' | 'private';
};

export type ActorProfile = ActorRef & {
	id: string;
	avatarUrl: string | null;
	summary: string | null;
	url: string | null;
	xHandle: string | null;
	address: string | null;
	region: string | null;
};

export const KIND_LABEL: Record<ActorRef['kind'], string> = {
	person: '人',
	space: '場',
	group: '団体'
};
