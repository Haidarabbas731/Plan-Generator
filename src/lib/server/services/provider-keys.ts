import { vault } from '../crypto/index.js';
import { db } from '../db/index.js';
import { createKeyStore } from './key-store.js';

export const { listKeys, saveKey, getKey, deleteKey } = createKeyStore(db, vault);
