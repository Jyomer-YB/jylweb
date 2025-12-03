export type TemplateId = 'artisan' | 'restaurant' | 'coach' | 'saas';

export const TEMPLATES: { id: TemplateId; label: string; description: string; demoColor: string; }[] = [
  {
    id: 'artisan',
    label: 'Artisan / Atelier',
    description: 'Menu simple, page services, à propos, contact.',
    demoColor: '#1D4ED8',
  },
  {
    id: 'restaurant',
    label: 'Restaurant / Café',
    description: 'Page menu, horaires, réservation.',
    demoColor: '#B91C1C',
  },
  {
    id: 'coach',
    label: 'Coach / Consultant',
    description: 'Offres, témoignages, prise de rendez-vous.',
    demoColor: '#0F766E',
  },
  {
    id: 'saas',
    label: 'Application / SaaS',
    description: 'Hero produit, fonctionnalités, tarifs.',
    demoColor: '#7C3AED',
  },
];
