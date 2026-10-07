import { ENCRYPTION_KEY } from '$app/env/private';
import { createVault } from './vault.js';

export const vault = createVault(ENCRYPTION_KEY);
