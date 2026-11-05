// 公開 JSON/HTML 用。CDN で 60 秒キャッシュし、更新は purge by URL で消す。
export const CACHE_PUBLIC = 'public, max-age=0, s-maxage=60, stale-while-revalidate=600';
