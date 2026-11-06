import type { StoreHours } from "./normalize";

// 取り込み元。各団体は今のカレンダー（Google カレンダー、フリカレ）で運用を続け、まがりが鏡写しにする。
// URL が freecalend.com/open/mem… ならフリカレとして読み、それ以外は公開 iCal として読む（run.ts）。

export type SourceActor = {
	handle: string;
	kind: "space" | "group";
	name: string;
	summary: string;
	url?: string;
	xHandle?: string;
	// ハコ一覧のバナー（公式ページの og:image など）。取り込みのときに R2 へ写す
	photo?: string;
	// ハコのページで名前の左に丸く出すアイコン（X のアイコン）。取り込みのときに R2 へ写す
	icon?: string;
};

export type Source = {
	id: string;
	actor: SourceActor;
	// space: 会の「場」として付く / host: 会の「主催」として付く
	role: "space" | "host";
	// 場の所在エリア（都道府県名）。会のエリアに使う
	area?: string;
	calendars: { id: string; url: string; region?: string }[];
	tags: string[];
	// 店の営業時間（公式の店舗ページから）。時刻の無い 1 日の会をこの時間に置く
	storeHours?: StoreHours;
};

const gcal = (cid: string) =>
	`https://calendar.google.com/calendar/ical/${encodeURIComponent(cid)}/public/basic.ics`;

export const SOURCES: Source[] = [
	// イベントバーエデン各店。店舗ページに埋め込まれた Google カレンダーの公開 iCal（神戸だけフリカレ）。
	// Fu は予定なしのため未登録。
	{
		id: "eden",
		area: "東京",
		actor: {
			handle: "eden",
			kind: "space",
			name: "イベントバーエデン本店",
			summary: "誰でも1日店長になれるイベントバー。",
			url: "https://eventbareden.com/bar-list/toshima/",
			photo:
				"https://eventbareden.com/wp-content/uploads/2022/12/toshima-min.png",
			xHandle: "Eventbar_Eden",
			icon: "https://pbs.twimg.com/profile_images/1536944061898141696/Qm7wKaHz_400x400.jpg",
		},
		role: "space",
		calendars: [
			{
				id: "main",
				url: gcal("jjl7dmes381n9kt27u225g6lr0@group.calendar.google.com"),
			},
		],
		tags: ["間借り"],
		storeHours: { hours: ["18:00", "23:00"] },
	},
	{
		id: "eden-kanda",
		area: "東京",
		actor: {
			handle: "eden_kanda",
			kind: "space",
			name: "イベントバーエデン神田",
			summary: "誰でも1日店長になれるイベントバー。",
			url: "https://eventbareden.com/bar-list/kanda/",
			photo:
				"https://eventbareden.com/wp-content/uploads/2022/12/kanda-min.png",
			xHandle: "eden_kanda",
			icon: "https://pbs.twimg.com/profile_images/1138112108048990208/z9UgHlig_400x400.png",
		},
		role: "space",
		calendars: [{ id: "main", url: gcal("baredenkanda@gmail.com") }],
		tags: ["間借り"],
		storeHours: { hours: ["17:00", "23:00"] },
	},
	{
		id: "eden-nippori",
		area: "東京",
		actor: {
			handle: "eden_nippori",
			kind: "space",
			name: "イベントバーエデン日暮里",
			summary: "誰でも1日店長になれるイベントバー。",
			url: "https://eventbareden.com/bar-list/nippori/",
			photo:
				"https://eventbareden.com/wp-content/uploads/2022/12/nippori-min.png",
			xHandle: "EBE_Nippori",
			icon: "https://pbs.twimg.com/profile_images/1575890597432684544/b6RqcoEs_400x400.jpg",
		},
		role: "space",
		calendars: [{ id: "main", url: gcal("ebe.nippori@gmail.com") }],
		tags: ["間借り"],
		storeHours: { hours: ["18:00", "23:00"] },
	},
	{
		id: "eden-yokohama",
		area: "神奈川",
		actor: {
			handle: "eden_yokohama",
			kind: "space",
			name: "イベントバーエデン横浜",
			summary: "誰でも1日店長になれるイベントバー。",
			url: "https://eventbareden.com/bar-list/yokohama/",
			photo:
				"https://eventbareden.com/wp-content/uploads/2022/12/yokohama-min.png",
			xHandle: "eden_yokohama",
			icon: "https://pbs.twimg.com/profile_images/1598532315290144768/fbCb0rE1_400x400.jpg",
		},
		role: "space",
		calendars: [{ id: "main", url: gcal("eden.yokohama@gmail.com") }],
		tags: ["間借り"],
		storeHours: { hours: ["18:00", "23:00"] },
	},
	{
		id: "eden-nagoya",
		area: "愛知",
		actor: {
			handle: "eden_nagoya",
			kind: "space",
			name: "イベントバーエデン名古屋",
			summary: "誰でも1日店長になれるイベントバー。",
			url: "https://eventbareden.com/bar-list/nagoya/",
			photo:
				"https://eventbareden.com/wp-content/uploads/2022/12/64f2632f8c21e2fc9609a872562d16d1.jpg",
			xHandle: "EBE_Nagoya",
			icon: "https://pbs.twimg.com/profile_images/1402351276495572992/9TocAeGK_400x400.jpg",
		},
		role: "space",
		calendars: [{ id: "main", url: gcal("edenstoneee@gmail.com") }],
		tags: ["間借り"],
		storeHours: { hours: ["18:00", "23:00"] },
	},
	{
		id: "eden-kyoto",
		area: "京都",
		actor: {
			handle: "eden_kyoto",
			kind: "space",
			name: "イベントバーエデン京都",
			summary: "誰でも1日店長になれるイベントバー。",
			url: "https://eventbareden.com/bar-list/kyoto/",
			photo:
				"https://eventbareden.com/wp-content/uploads/2022/12/kyoto_1-100.jpg",
			xHandle: "EBE_Kyoto",
			icon: "https://pbs.twimg.com/profile_images/2070429086888214528/YzDMnuOd_400x400.jpg",
		},
		role: "space",
		calendars: [
			{
				id: "main",
				url: gcal(
					"749335330c9086df78a7b71da0baa4ae4dd4e7968ee0b6b307e91743946be5d1@group.calendar.google.com",
				),
			},
		],
		tags: ["間借り"],
		storeHours: { hours: ["18:00", "23:00"] },
	},
	{
		id: "eden-namba",
		area: "大阪",
		actor: {
			handle: "eden_namba",
			kind: "space",
			name: "イベントバーエデン難波",
			summary: "誰でも1日店長になれるイベントバー。",
			url: "https://eventbareden.com/bar-list/namba/",
			photo:
				"https://eventbareden.com/wp-content/uploads/2022/12/namba-min.png",
			xHandle: "eden_namba",
			icon: "https://pbs.twimg.com/profile_images/1363495601652965380/Y_6kamec_400x400.jpg",
		},
		role: "space",
		calendars: [{ id: "main", url: gcal("baredennamba@gmail.com") }],
		tags: ["間借り"],
		storeHours: { hours: ["17:30", "23:00"], dayHours: ["13:00", "17:00"] },
	},
	{
		id: "eden-kobe",
		area: "兵庫",
		actor: {
			handle: "eden_kobe",
			kind: "space",
			name: "イベントバーエデン神戸",
			summary: "誰でも1日店長になれるイベントバー。",
			url: "https://eventbareden.com/bar-list/kobe/",
			photo:
				"https://eventbareden.com/wp-content/uploads/2026/07/koube-100.jpg",
			xHandle: "ebe_kobe",
			icon: "https://pbs.twimg.com/profile_images/2068261297737936896/uVv8jPHb_400x400.jpg",
		},
		role: "space",
		calendars: [{ id: "main", url: "https://freecalend.com/open/mem317765" }],
		tags: ["間借り"],
		storeHours: { hours: ["18:00", "23:00"] },
	},
	{
		id: "eden-fukuoka",
		area: "福岡",
		actor: {
			handle: "eden_fukuoka",
			kind: "space",
			name: "イベントバーエデン福岡",
			summary: "誰でも1日店長になれるイベントバー。",
			url: "https://eventbareden.com/bar-list/fukuoka/",
			photo:
				"https://eventbareden.com/wp-content/uploads/2022/12/fukuoka-min.png",
			xHandle: "EBE_Fukuoka",
			icon: "https://pbs.twimg.com/profile_images/1054756806562467841/jAMgB2Ru_400x400.jpg",
		},
		role: "space",
		calendars: [{ id: "main", url: gcal("ebe.fukuoka@gmail.com") }],
		tags: ["間借り"],
		storeHours: { hours: ["17:00", "23:00"] },
	},
	// 京橋URA。サイトは無く、公開 Google カレンダーと X で告知している
	{
		id: "kyobashi-ura",
		area: "大阪",
		actor: {
			handle: "kyobashi_ura",
			kind: "space",
			name: "京橋URA",
			summary:
				"京橋駅から歩いて行ける多目的オルタナスペース。ボドゲ会、上映会、コワーク、ワークショップなど。",
			xHandle: "URA_Kyobashi",
			photo:
				"https://pbs.twimg.com/profile_images/1508651562658562049/d0D0eAkB_400x400.jpg",
			icon: "https://pbs.twimg.com/profile_images/1508651562658562049/d0D0eAkB_400x400.jpg",
		},
		role: "space",
		calendars: [{ id: "main", url: gcal("kyobashi.ura@gmail.com") }],
		tags: ["間借り"],
	},
	{
		id: "hattatsu",
		actor: {
			handle: "hattatsu2",
			kind: "group",
			name: "発達障害2.0 イベントまとめ",
			summary: "発達障害の当事者会・自助会のイベントまとめ。",
			url: "https://www.hattatsu-event.com/",
		},
		role: "host",
		calendars: [
			{
				id: "online",
				region: "オンライン",
				url: gcal("cqp41k973nrmpphbqj7egjj9ck@group.calendar.google.com"),
			},
			{
				id: "chubu",
				region: "中部・北陸",
				url: gcal("r3d3hif45ihd8e919tj8r80838@group.calendar.google.com"),
			},
			{
				id: "kinki",
				region: "近畿",
				url: gcal("mbq0t8m85r8t29re64et538olc@group.calendar.google.com"),
			},
			{
				id: "kanto",
				region: "関東",
				url: gcal("4hhn37p7r0u80g3frhjsl4crsc@group.calendar.google.com"),
			},
			{
				id: "chugoku",
				region: "中国・四国",
				url: gcal("75ppudkmqgfq9932qj67p1lvi4@group.calendar.google.com"),
			},
			{
				id: "kyushu",
				region: "九州・沖縄",
				url: gcal("l44am40hjbu10o6v8slr8h3a7o@group.calendar.google.com"),
			},
			{
				id: "hokkaido",
				region: "北海道・東北",
				url: gcal("5k57ctv9j01r0ga6t2hldigjpg@group.calendar.google.com"),
			},
		],
		tags: ["自助会"],
	},
];
