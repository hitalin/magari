// 会の公開範囲と、それぞれがどこまで流れるか。SNS（Misskey）の公開範囲と同じく、
// 1 つの値で、載る所と共有（RN に当たる）の可否をまとめて決める。各所はここの答えを見る。
//   public   公開。一覧・カレンダー・壁と、主催とハコのページに出る
//   home     ページだけ（Misskey のホーム）。一覧には出さず、主催とハコのページ・feed.ics にだけ出る
//   unlisted URL を知っている人だけ。どこにも載せず、共有ボタンもリンクカードの中身も出さない
// フォロワー限定と指名は持たない（フォローや宛先の名簿は、人を会に結びつける情報なので預からない）
export const VISIBILITIES = ["public", "home", "unlisted"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export type Reach = {
	// 一覧・カレンダー・壁
	lists: boolean;
	// 主催とハコのページ（/@handle、/@handle/past、/@handle/feed.ics）
	pages: boolean;
	// 共有ボタンと、リンクカード（og:title・説明・カード画像）の中身
	share: boolean;
	// 検索エンジン（noindex と sitemap）
	index: boolean;
};

export function reach(v: Visibility): Reach {
	const shown = v !== "unlisted";
	return { lists: v === "public", pages: shown, share: shown, index: shown };
}

// その出口に出る公開範囲（SQL の絞り込みに使う）
export const visibilitiesWhere = (exit: keyof Reach): Visibility[] =>
	VISIBILITIES.filter((v) => reach(v)[exit]);
