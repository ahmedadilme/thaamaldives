import type { Addon } from '@/types';

export const RESORT_ADDONS: Record<string, Addon[]> = {
  'anantara-dhigu': [
    { id: 'spa', name: 'Balance Wellness Spa session', description: '60-minute signature massage for two at the spa.', price: 160, unit: 'per person', perPerson: true, category: 'Spa' },
    { id: 'sandbank', name: 'Private sandbank picnic', description: 'Private sandbank lunch or dinner for two, with chef and waiter.', price: 420, unit: 'per booking', category: 'Celebration' },
    { id: 'sunset-cruise', name: 'Sunset cruise', description: 'Traditional dhoni with drinks and canapés as the sun drops.', price: 95, unit: 'per person', perPerson: true, category: 'Excursion' },
    { id: 'dive-intro', name: 'Introductory dive', description: 'Guided first dive with a PADI instructor in the house reef.', price: 120, unit: 'per person', perPerson: true, category: 'Diving' },
    { id: 'honeymoon', name: 'Honeymoon staging', description: 'Villa décor, a framed photograph and a bottle of bubbles.', price: 89, unit: 'per booking', category: 'Celebration' },
  ],
  'atmosphere-kanifushi': [
    { id: 'spa', name: 'Spa session', description: 'One hour of pampering for two at the overwater spa.', price: 140, unit: 'per person', perPerson: true, category: 'Spa' },
    { id: 'fish', name: 'Traditional fishing trip', description: 'Sunset line fishing on a Maldivian dhoni, bait included.', price: 55, unit: 'per person', perPerson: true, category: 'Excursion' },
    { id: 'sandbank', name: 'Sandbank barbecue', description: 'An evening on your own sandbank, grilled dinner included.', price: 350, unit: 'per booking', category: 'Celebration' },
    { id: 'island-hop', name: 'Island hopping', description: 'Visit a local island and a picnic island in the atoll.', price: 75, unit: 'per person', perPerson: true, category: 'Excursion' },
    { id: 'kayak', name: 'Guided kayak safari', description: 'Paddle the lagoon and channels with a marine guide.', price: 45, unit: 'per person', perPerson: true, category: 'Water sports' },
  ],
  'constance-halaveli': [
    { id: 'spa', name: 'Spa journey', description: '90-minute journey at U Spa, one of the Maldives’ best.', price: 175, unit: 'per person', perPerson: true, category: 'Spa' },
    { id: 'sandbank', name: 'Private sandbank lunch', description: 'Tables on the sand for a completely private lunch.', price: 450, unit: 'per booking', category: 'Celebration' },
    { id: 'sunset-cruise', name: 'Sunset cruise', description: 'Dhoni cruise with bubbles and canapés at golden hour.', price: 110, unit: 'per person', perPerson: true, category: 'Excursion' },
    { id: 'dive-pack', name: 'Night dive', description: 'Dive the house reef after dark with a guide and torch.', price: 95, unit: 'per person', perPerson: true, category: 'Diving' },
    { id: 'floating', name: 'Floating breakfast', description: 'Breakfast served on a tray that floats in your pool.', price: 65, unit: 'per booking', perPerson: false, category: 'Dining' },
  ],
  dhigali: [
    { id: 'spa', name: 'Spa session', description: '60-minute massage for two at Dhiyawaru Spa.', price: 120, unit: 'per person', perPerson: true, category: 'Spa' },
    { id: 'sandbank', name: 'Desert island picnic', description: 'Private sandbank escape with lunch and a speaker on board.', price: 380, unit: 'per booking', category: 'Celebration' },
    { id: 'sunset-cruise', name: 'Sunset dolphin cruise', description: 'Chase dolphins just before sunset with refreshments.', price: 70, unit: 'per person', perPerson: true, category: 'Excursion' },
    { id: 'dive-intro', name: 'Introductory dive', description: 'First dive introduction with a certified instructor.', price: 110, unit: 'per person', perPerson: true, category: 'Diving' },
    { id: 'catamaran', name: 'Catamaran trip', description: 'Sail the lagoon on a shared or private catamaran.', price: 60, unit: 'per person', perPerson: true, category: 'Water sports' },
  ],
};

export function getAddons(slug: string, inline?: Addon[]): Addon[] {
  return [...(inline ?? []), ...(RESORT_ADDONS[slug] ?? [])];
}