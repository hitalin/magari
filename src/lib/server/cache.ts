// 公開 JSON 用。ブラウザには持たせず、毎回取り直させる（中止や変更をすぐ見せるため）。
// stale-while-revalidate は付けない: purge が未実装なので、直した直後に古い内容が先に出てしまう。
// s-maxage は CDN に載せたとき用。いまは Worker の応答を CDN に載せていないので効いていない。
export const CACHE_PUBLIC = "public, max-age=0, s-maxage=60";
