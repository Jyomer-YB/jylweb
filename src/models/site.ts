
import { z } from 'zod';
export const SitePlanSchema = z.object({
  locale: z.enum(['fr','en']).default('fr'),
  site: z.object({
    name: z.string(),
    tagline: z.string().optional(),
    description: z.string(),
    primaryColor: z.string().default('#2563EB'),
    theme: z.enum(['classic','agency','artisan','restaurant','saas']).default('classic'),
  }),
  business: z.object({
    sector: z.string(),
    offers: z.array(z.object({ title: z.string(), desc: z.string() })).optional(),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  }).optional(),
  media: z.object({ logoUrl: z.string().optional(), heroUrl: z.string().optional() }).optional(),
  contact: z.object({ city: z.string().optional(), phone: z.string().optional(), email: z.string().optional() }).optional(),
  pages: z.array(z.object({
    slug: z.string(),
    title: z.string(),
    blocks: z.array(z.object({
      type: z.enum(['hero','services','about','contact','faq','cta']),
      data: z.record(z.any()).optional()
    }))
  }))
});
export type SitePlan = z.infer<typeof SitePlanSchema>;
