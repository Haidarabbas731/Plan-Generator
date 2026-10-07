import type { z } from 'zod';
import type { blockOutputSchema, daySchema, outlineBlockSchema, outlineSchema } from './schemas.js';

export type OutlineBlock = z.infer<typeof outlineBlockSchema>;
export type Outline = z.infer<typeof outlineSchema>;
export type DayOutput = z.infer<typeof daySchema>;
export type BlockOutput = z.infer<typeof blockOutputSchema>;
