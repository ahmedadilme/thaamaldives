import type { Property } from '@/types';
import { IMG } from './images';

export const hotels: Property[] = [
  {
    slug: 'coral-sands-male',
    name: 'Coral Sands Hotel',
    kind: 'hotel',
    atoll: 'Kaafu Atoll · Malé',
    stars: 4,
    tagline: 'City comfort a water taxi ride from paradise',
    description:
      'A calm, modern base in the heart of Malé — polished rooms, a rooftop infinity pool and three restaurants. Perfect for a stopover, business stretch or a city-culture nightcap before the resort island leg.',
    transfer: 'Airport pickup via guest speedboat — approx. 15 minutes',
    transferNote: 'Return airport transfer by private speedboat from Velana International Airport, arranged around your flight time.',
    image: IMG.hotel,
    gallery: [IMG.hotel, IMG.beachChairs, IMG.maldivesResort],
    addons: [
      { id: 'pool-day', name: 'Rooftop pool day pass', description: 'Day access to the rooftop infinity pool and lounge.', price: 25, unit: 'per person', perPerson: true, category: 'Facilities' },
      { id: 'city-tour', name: 'Malé city tour', description: 'Two-hour guided walk through Malé’s markets, mosques and galleries.', price: 40, unit: 'per person', perPerson: true, category: 'Excursion' },
      { id: 'early', name: 'Early check-in', description: 'Guaranteed check-in from 08:00 on arrival day.', price: 45, unit: 'per booking', category: 'Add-ons' },
    ],
    contract: {
      label: '2026',
      valid: 'All year 2026',
      markets: 'All markets',
      currency: 'USD',
      rateNote: 'Rates are per room per night in USD including taxes. Breakfast supplement applies on Room Only rates.',
      periods: ['All year 2026'],
      rates: [
        { period: 'All year 2026', code: 'STD', meal: 'RO', sgl: '95', dbl: '110' },
        { period: 'All year 2026', code: 'STD', meal: 'BB', sgl: '115', dbl: '130' },
        { period: 'All year 2026', code: 'SUP', meal: 'RO', sgl: '125', dbl: '140' },
        { period: 'All year 2026', code: 'SUP', meal: 'BB', sgl: '145', dbl: '160' },
        { period: 'All year 2026', code: 'DEL', meal: 'BB', sgl: '175', dbl: '190' },
        { period: 'All year 2026', code: 'JR', meal: 'BB', sgl: '220', dbl: '240' },
      ],
      rooms: [
        { code: 'STD', name: 'Standard Room', detail: '22 m² · city view' },
        { code: 'SUP', name: 'Superior Room', detail: '24 m² · high floor' },
        { code: 'DEL', name: 'Deluxe Room', detail: '28 m² · with balcony' },
        { code: 'JR', name: 'Junior Suite', detail: '38 m² · with sitting area' },
      ],
      mealPlans: [
        { code: 'RO', name: 'Room Only' },
        { code: 'BB', name: 'Bed & Breakfast' },
      ],
      transfers: [{ type: 'Speedboat', adult: '55', child: '28', note: 'Return per person from airport.' }],
      offers: [],
      policies: [
        { title: 'Check-in & Check-out', items: ['Check-in 14:00 · Check-out 12:00.', 'Credit card required at check-in for incidentals.'] },
        { title: 'Cancellation', items: ['Free cancellation up to 48 hours before arrival.', 'No-show is charged the first night.'] },
      ],
      amenities: {
        complimentary: ['Rooftop infinity pool', 'High-speed Wi-Fi', 'Airport pickup coordination', 'Gym access 24/7'],
        chargeable: ['Laundry', 'In-room dining', 'City tours and spa'],
      },
    },
  },
  {
    slug: 'hulhumale-seafront',
    name: 'Hulhumalé Seafront Hotel',
    kind: 'hotel',
    atoll: 'Kaafu Atoll · Hulhumalé',
    stars: 4,
    tagline: 'Beachfront on the reclaimed city island',
    description:
      'A breezy beachfront address a short over-the-water bridge from Malé. Rooms face the lagoon, families like the pool, and the airport is seven minutes away — the practical choice for a first and last night.',
    transfer: 'Airport pickup via speedboat — approx. 7 minutes',
    transferNote: 'Complimentary return transfers from Velana International Airport.',
    image: IMG.maldivesResort,
    gallery: [IMG.maldivesResort, IMG.maldivesBeach, IMG.tropicalAerial],
    addons: [
      { id: 'beach-day', name: 'Beachfront daybed', description: 'Reserved daybed under a palm umbrella on the lagoon beach.', price: 20, unit: 'per booking', category: 'Facilities' },
      { id: 'bike', name: 'Bicycle rental (daily)', description: 'Best way around Hulhumalé — bike rack and lock included.', price: 10, unit: 'per night', perPerson: true, category: 'Facilities' },
      { id: 'kids', name: 'Kids club hour', description: 'Supervised play for ages 4–12, twice daily.', price: 12, unit: 'per booking', category: 'Family' },
    ],
    contract: {
      label: '2026',
      valid: 'All year 2026',
      markets: 'All markets',
      currency: 'USD',
      rateNote: 'Rates are per room per night in USD including taxes.',
      periods: ['Low season', 'High season'],
      rates: [
        { period: 'Low season', code: 'STD', meal: 'BB', sgl: '88', dbl: '99' },
        { period: 'Low season', code: 'OCV', meal: 'BB', sgl: '125', dbl: '138' },
        { period: 'Low season', code: 'FAM', meal: 'BB', sgl: '150', dbl: '165' },
        { period: 'High season', code: 'STD', meal: 'BB', sgl: '125', dbl: '140' },
        { period: 'High season', code: 'OCV', meal: 'BB', sgl: '170', dbl: '185' },
        { period: 'High season', code: 'FAM', meal: 'BB', sgl: '205', dbl: '220' },
      ],
      rooms: [
        { code: 'STD', name: 'Oceanview Standard', detail: '20 m² · lagoon view' },
        { code: 'OCV', name: 'Oceanview Deluxe', detail: '26 m² · private balcony' },
        { code: 'FAM', name: 'Family Suite', detail: '42 m² · two bedrooms' },
      ],
      mealPlans: [{ code: 'BB', name: 'Bed & Breakfast' }],
      transfers: [{ type: 'Speedboat', adult: '35', child: '18', note: 'Return per person.' }],
      offers: [
        { title: 'Stopover Special', details: ['Complimentary upgrade from Oceanview Standard to Oceanview Deluxe for stayovers of 1–2 nights, subject to availability.'] },
      ],
      policies: [
        { title: 'Check-in & Check-out', items: ['Check-in 14:00 · Check-out 11:30.', 'Early flights: early check-in on request.'] },
        { title: 'Children', items: ['Under 6 sharing the parents’ room stay free.', 'Kids club for ages 4–12 as an add-on.'] },
      ],
      amenities: {
        complimentary: ['Beach access', 'Pool', 'High-speed Wi-Fi', 'Complimentary airport transfers'],
        chargeable: ['Spa', 'Bicycle rental', 'In-room dining'],
      },
    },
  },
];