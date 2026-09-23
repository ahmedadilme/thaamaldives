export type RateValue = string | number | undefined;

export interface RateRow {
  period: string;
  code: string;
  meal: string;
  sgl?: RateValue;
  dbl?: RateValue;
  tpl?: RateValue;
  qtrp?: RateValue;
  ext?: RateValue;
  child?: RateValue;
  infant?: RateValue;
}

export type PropertyKind = 'resort' | 'hotel' | 'guesthouse';

export type AddonUnit = 'per night' | 'per person' | 'per booking';

export interface Addon {
  id: string;
  name: string;
  description?: string;
  price: number;
  unit: AddonUnit;
  perPerson?: boolean;
  category: string;
  note?: string;
}

export interface RoomSpec {
  code: string;
  name: string;
  detail?: string;
}

export interface TransferOption {
  type: string;
  adult: string;
  child?: string;
  oneWay?: { adult: string; child?: string };
  note?: string;
}

export interface Offer {
  title: string;
  details: string[];
}

export interface PolicyGroup {
  title: string;
  items: string[];
}

export interface MealPlan {
  code: string;
  name: string;
  notes?: string[];
}

export interface Contract {
  label: string;
  valid: string;
  markets: string;
  currency: string;
  rateNote: string;
  periods: string[];
  rates: RateRow[];
  rooms: RoomSpec[];
  mealPlans: MealPlan[];
  transfers: TransferOption[];
  offers: Offer[];
  policies: PolicyGroup[];
  amenities: {
    complimentary?: string[];
    chargeable?: string[];
    inclusive?: string[];
  };
}

export interface Property {
  slug: string;
  name: string;
  kind: PropertyKind;
  atoll: string;
  stars?: number;
  honeymoon?: boolean;
  diving?: boolean;
  houseReef?: boolean | string;
  family?: boolean | string;
  surfing?: boolean | string;
  kidsClub?: boolean;
  doctor?: boolean | string;
  tagline: string;
  description: string;
  transfer: string;
  transferNote?: string;
  image: string;
  gallery?: string[];
  addons?: Addon[];
  contract: Contract;
}

export type Resort = Omit<Property, 'kind'>;

export interface PackageOffer {
  id: string;
  title: string;
  category: 'Maldives' | 'Outbound' | 'Specials';
  region: string;
  nights: string;
  from: number;
  label?: string;
  inclusions: string[];
  image: string;
  badge?: string;
}

export interface OutboundDestination {
  slug: string;
  name: string;
  eyebrow: string;
  cities: string[];
  image: string;
  blurb: string;
  fromPrice: number;
}

export interface Service {
  slug: string;
  name: string;
  blurb: string;
  long: string;
  image: string;
  module?: import('@/config/modules').ModuleId;
}

export interface Story {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  image: string;
  readMins: number;
  module?: import('@/config/modules').ModuleId;
}

export interface Testimonial {
  quote: string;
  name: string;
  trip: string;
  rating: number;
}