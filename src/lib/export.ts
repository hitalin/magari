// 自分のデータの書き出し（/me/export.json）の形。内部の ID と運営の印は出さない。

type Row = Record<string, unknown>;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : null);

export function toExport(input: {
	origin: string;
	exportedAt: Date;
	logins: { providerId: string; accountId: string }[];
	// actors の行
	pages: Row[];
	// events の行に、ハコの handle・繰り返しの決まり・主催の handle を足したもの
	events: Row[];
}) {
	const media = (key: unknown) => (key ? `${input.origin}/i/${key}` : null);
	return {
		exportedAt: input.exportedAt.toISOString(),
		site: input.origin,
		logins: input.logins.map((a) => ({
			provider: a.providerId,
			id: a.accountId,
		})),
		pages: input.pages.map((a) => ({
			url: `${input.origin}/@${a.handle}`,
			handle: a.handle,
			kind: a.kind,
			name: a.name,
			summary: a.summary ?? null,
			catch: a.catch ?? null,
			body: a.body ?? null,
			avatar: a.avatarUrl ?? null,
			header: media(a.headerKey),
			website: a.url ?? null,
			x: a.xHandle ?? null,
			misskey: a.misskey ?? null,
			instagram: a.instagram ?? null,
			links: a.links ?? [],
			address: a.address ?? null,
			region: a.region ?? null,
			access: a.access ?? null,
			hours: a.hours ?? null,
			closedDays: a.closedDays ?? null,
			operator: a.operator ?? null,
			facilities: a.facilities ?? [],
			createdAt: iso(a.createdAt),
			updatedAt: iso(a.updatedAt),
		})),
		events: input.events.map((e) => ({
			url: `${input.origin}/e/${e.id}`,
			id: e.id,
			title: e.title,
			description: e.description ?? null,
			startsAt: iso(e.startsAt),
			endsAt: iso(e.endsAt),
			allDay: e.allDay ?? false,
			status: e.status,
			visibility: e.visibility,
			// 繰り返しの決まり（iCal の RRULE）。単発なら null
			repeat: e.repeat ?? null,
			hosts: e.hosts ?? [],
			space: e.spaceHandle ?? null,
			locationName: e.locationName ?? null,
			locationAddress: e.locationAddress ?? null,
			locationVisibility: e.locationVisibility,
			area: e.area ?? null,
			onlineUrl: e.onlineUrl ?? null,
			announceUrl: e.url ?? null,
			fee: e.feeText ?? null,
			flyer: media(e.coverKey),
			flyerVariant: e.flyerVariant ?? null,
			flyerColor: e.flyerColor ?? null,
			createdAt: iso(e.createdAt),
			updatedAt: iso(e.updatedAt),
		})),
	};
}
