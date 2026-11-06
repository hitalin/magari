import type { StoreHours } from './normalize';

// 取り込み元。各団体は今のカレンダー（Google カレンダー、フリカレ）で運用を続け、まがりが鏡写しにする。
// URL が freecalend.com/open/mem… ならフリカレとして読み、それ以外は公開 iCal として読む（run.ts）。

export type SourceActor = {
	handle: string;
	kind: 'space' | 'group';
	name: string;
	summary: string;
	url: string;
	xHandle?: string;
};

export type Source = {
	id: string;
	actor: SourceActor;
	// space: 会の「場」として付く / host: 会の「主催」として付く
	role: 'space' | 'host';
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
		id: 'eden',
		area: '東京',
		actor: {
			handle: 'eden',
			kind: 'space',
			name: 'イベントバーエデン本店',
			summary:
				'誰でも1日店長になれるイベントバー。予定は店舗の Google カレンダーから取り込んでいます。',
			url: 'https://eventbareden.com/bar-list/toshima/',
			xHandle: 'Eventbar_Eden'
		},
		role: 'space',
		calendars: [{ id: 'main', url: gcal('jjl7dmes381n9kt27u225g6lr0@group.calendar.google.com') }],
		tags: ['間借り'],
		storeHours: { hours: ['18:00', '23:00'] }
	},
	{
		id: 'eden-kanda',
		area: '東京',
		actor: {
			handle: 'eden_kanda',
			kind: 'space',
			name: 'イベントバーエデン神田',
			summary:
				'誰でも1日店長になれるイベントバー。予定は店舗の Google カレンダーから取り込んでいます。',
			url: 'https://eventbareden.com/bar-list/kanda/',
			xHandle: 'eden_kanda'
		},
		role: 'space',
		calendars: [{ id: 'main', url: gcal('baredenkanda@gmail.com') }],
		tags: ['間借り'],
		storeHours: { hours: ['17:00', '23:00'] }
	},
	{
		id: 'eden-nippori',
		area: '東京',
		actor: {
			handle: 'eden_nippori',
			kind: 'space',
			name: 'イベントバーエデン日暮里',
			summary:
				'誰でも1日店長になれるイベントバー。予定は店舗の Google カレンダーから取り込んでいます。',
			url: 'https://eventbareden.com/bar-list/nippori/',
			xHandle: 'EBE_Nippori'
		},
		role: 'space',
		calendars: [{ id: 'main', url: gcal('ebe.nippori@gmail.com') }],
		tags: ['間借り'],
		storeHours: { hours: ['18:00', '23:00'] }
	},
	{
		id: 'eden-yokohama',
		area: '神奈川',
		actor: {
			handle: 'eden_yokohama',
			kind: 'space',
			name: 'イベントバーエデン横浜',
			summary:
				'誰でも1日店長になれるイベントバー。予定は店舗の Google カレンダーから取り込んでいます。',
			url: 'https://eventbareden.com/bar-list/yokohama/',
			xHandle: 'eden_yokohama'
		},
		role: 'space',
		calendars: [{ id: 'main', url: gcal('eden.yokohama@gmail.com') }],
		tags: ['間借り'],
		storeHours: { hours: ['18:00', '23:00'] }
	},
	{
		id: 'eden-nagoya',
		area: '愛知',
		actor: {
			handle: 'eden_nagoya',
			kind: 'space',
			name: 'イベントバーエデン名古屋',
			summary:
				'誰でも1日店長になれるイベントバー。予定は店舗の Google カレンダーから取り込んでいます。',
			url: 'https://eventbareden.com/bar-list/nagoya/',
			xHandle: 'EBE_Nagoya'
		},
		role: 'space',
		calendars: [{ id: 'main', url: gcal('edenstoneee@gmail.com') }],
		tags: ['間借り'],
		storeHours: { hours: ['18:00', '23:00'] }
	},
	{
		id: 'eden-kyoto',
		area: '京都',
		actor: {
			handle: 'eden_kyoto',
			kind: 'space',
			name: 'イベントバーエデン京都',
			summary:
				'誰でも1日店長になれるイベントバー。予定は店舗の Google カレンダーから取り込んでいます。',
			url: 'https://eventbareden.com/bar-list/kyoto/',
			xHandle: 'EBE_Kyoto'
		},
		role: 'space',
		calendars: [
			{
				id: 'main',
				url: gcal(
					'749335330c9086df78a7b71da0baa4ae4dd4e7968ee0b6b307e91743946be5d1@group.calendar.google.com'
				)
			}
		],
		tags: ['間借り'],
		storeHours: { hours: ['18:00', '23:00'] }
	},
	{
		id: 'eden-namba',
		area: '大阪',
		actor: {
			handle: 'eden_namba',
			kind: 'space',
			name: 'イベントバーエデン難波',
			summary:
				'誰でも1日店長になれるイベントバー。予定は店舗の Google カレンダーから取り込んでいます。',
			url: 'https://eventbareden.com/bar-list/namba/',
			xHandle: 'eden_namba'
		},
		role: 'space',
		calendars: [{ id: 'main', url: gcal('baredennamba@gmail.com') }],
		tags: ['間借り'],
		storeHours: { hours: ['17:30', '23:00'], dayHours: ['13:00', '17:00'] }
	},
	{
		id: 'eden-kobe',
		area: '兵庫',
		actor: {
			handle: 'eden_kobe',
			kind: 'space',
			name: 'イベントバーエデン神戸',
			summary:
				'誰でも1日店長になれるイベントバー。予定は店舗のフリカレ（freecalend）から取り込んでいます。',
			url: 'https://eventbareden.com/bar-list/kobe/',
			xHandle: 'ebe_kobe'
		},
		role: 'space',
		calendars: [{ id: 'main', url: 'https://freecalend.com/open/mem317765' }],
		tags: ['間借り'],
		storeHours: { hours: ['18:00', '23:00'] }
	},
	{
		id: 'eden-fukuoka',
		area: '福岡',
		actor: {
			handle: 'eden_fukuoka',
			kind: 'space',
			name: 'イベントバーエデン福岡',
			summary:
				'誰でも1日店長になれるイベントバー。予定は店舗の Google カレンダーから取り込んでいます。',
			url: 'https://eventbareden.com/bar-list/fukuoka/',
			xHandle: 'EBE_Fukuoka'
		},
		role: 'space',
		calendars: [{ id: 'main', url: gcal('ebe.fukuoka@gmail.com') }],
		tags: ['間借り'],
		storeHours: { hours: ['17:00', '23:00'] }
	},
	{
		id: 'hattatsu',
		actor: {
			handle: 'hattatsu2',
			kind: 'group',
			name: '発達障害2.0 イベントまとめ',
			summary:
				'発達障害の当事者会・自助会のイベントまとめ。地域別の Google カレンダーから取り込んでいます。',
			url: 'https://www.hattatsu-event.com/'
		},
		role: 'host',
		calendars: [
			{
				id: 'online',
				region: 'オンライン',
				url: gcal('cqp41k973nrmpphbqj7egjj9ck@group.calendar.google.com')
			},
			{
				id: 'chubu',
				region: '中部・北陸',
				url: gcal('r3d3hif45ihd8e919tj8r80838@group.calendar.google.com')
			},
			{
				id: 'kinki',
				region: '近畿',
				url: gcal('mbq0t8m85r8t29re64et538olc@group.calendar.google.com')
			},
			{
				id: 'kanto',
				region: '関東',
				url: gcal('4hhn37p7r0u80g3frhjsl4crsc@group.calendar.google.com')
			},
			{
				id: 'chugoku',
				region: '中国・四国',
				url: gcal('75ppudkmqgfq9932qj67p1lvi4@group.calendar.google.com')
			},
			{
				id: 'kyushu',
				region: '九州・沖縄',
				url: gcal('l44am40hjbu10o6v8slr8h3a7o@group.calendar.google.com')
			},
			{
				id: 'hokkaido',
				region: '北海道・東北',
				url: gcal('5k57ctv9j01r0ga6t2hldigjpg@group.calendar.google.com')
			}
		],
		tags: ['自助会']
	}
];
