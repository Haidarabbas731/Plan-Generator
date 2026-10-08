import { EMAIL_CODE, PASSWORD_RESET_EXPIRY_MINUTES } from '#lib/server/config.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => ({
	codeMinutes: Math.round(EMAIL_CODE.expiresSeconds / 60),
	resetMinutes: PASSWORD_RESET_EXPIRY_MINUTES
});
