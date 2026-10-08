import { authErrorCopy } from '#lib/auth-error-copy.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => authErrorCopy(url.searchParams.get('error'));
