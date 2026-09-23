export type ModuleId = 'outbound' | 'flights' | 'visa' | 'corporate' | 'insurance';

export interface ModuleDef {
  id: ModuleId;
  label: string;
  description: string;
}

export const MODULES: ModuleDef[] = [
  {
    id: 'outbound',
    label: 'Outbound Travel',
    description: 'International holidays — Japan, Dubai, Thailand, Europe, holiday packages and promotions.',
  },
  {
    id: 'flights',
    label: 'Flight Booking',
    description: 'International & domestic flight arrangements from Malé.',
  },
  {
    id: 'visa',
    label: 'Visa Assistance',
    description: 'Documentation support for international travel.',
  },
  {
    id: 'corporate',
    label: 'Corporate Travel',
    description: 'Business travel management for Maldivian companies.',
  },
  {
    id: 'insurance',
    label: 'Travel Insurance',
    description: 'Insurance recommendations and arrangements for every journey.',
  },
];

export const MODULE_LABELS: Record<ModuleId, string> = Object.fromEntries(
  MODULES.map((m) => [m.id, m.label])
) as Record<ModuleId, string>;