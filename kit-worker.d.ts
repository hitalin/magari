// pnpm build が .svelte-kit/cloudflare-tmp/_worker.js に書く Worker の型。
// 生成物はビルドの前には無いので、型はここで宣言し、package.json の imports（#kit-worker）で
// TypeScript にはこのファイル、wrangler（esbuild）には生成物を見せる。
declare const worker: ExportedHandler<Env>;
export default worker;
