import { z } from 'zod';

export const registryFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  executable: z.boolean().optional()
});

export const registryItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  files: z.array(registryFileSchema).min(1),
  dependencies: z.array(z.string().min(1)).optional(),
  devDependencies: z.array(z.string().min(1)).optional()
});

export const registryManifestSchema = z.object({
  items: z.array(registryItemSchema)
});

export const registryCacheRecordSchema = z.object({
  url: z.string().min(1),
  fetchedAt: z.number().int().nonnegative(),
  items: z.array(registryItemSchema)
});
