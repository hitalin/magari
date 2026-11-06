import { env } from "cloudflare:workers";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.session) redirect(303, "/me");
	return { xEnabled: !!env.X_CLIENT_ID, error: url.searchParams.get("error") };
};
