import { z } from "zod";

/** Standard list query: `?page=1&pageSize=20&sort=createdAt&order=desc&q=honda`. Extend it per module. */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  q: z.string().trim().min(1).optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export function offsetOf({ page, pageSize }: Pick<ListQuery, "page" | "pageSize">): number {
  return (page - 1) * pageSize;
}

/** Shape every list endpoint returns: `{ data: [...], meta: { page, pageSize, total } }`. */
export function paginated<T>(rows: T[], total: number, { page, pageSize }: ListQuery) {
  return { data: rows, meta: { page, pageSize, total } };
}
