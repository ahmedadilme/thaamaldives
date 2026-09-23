import { getContent } from '@/content/client';

export interface EnquiryPayload {
  name: string;
  email: string;
  phone?: string;
  interest?: string;
  travelDates?: string;
  travellers?: string;
  message?: string;
}

export interface EnquiryResult {
  ok: boolean;
  message: string;
}

export async function submitEnquiry(payload: EnquiryPayload): Promise<EnquiryResult> {
  await new Promise((r) => setTimeout(r, 700));
  console.info('[Thaa Maldives · enquiry]', payload);
  return {
    ok: true,
    message: `Thank you, ${payload.name.split(' ')[0] || 'traveller'}! A travel expert will reach out shortly.`,
  };
}

export async function subscribeNewsletter(email: string): Promise<EnquiryResult> {
  await new Promise((r) => setTimeout(r, 500));
  console.info('[Thaa Maldives · newsletter]', email);
  return { ok: true, message: 'You’re on the list — don’t miss the next great escape.' };
}

export interface BookingPayload extends EnquiryPayload {
  propertySlug: string;
  propertyName: string;
  roomCode: string;
  roomName: string;
  board: string;
  checkIn: string;
  nights: number;
  adults: number;
  children: number;
  addons: Pick<AddonDto, 'id' | 'name'>[];
  transferType?: string;
  estimateUSD?: number;
}

interface AddonDto {
  id: string;
  name: string;
}

export async function submitBooking(payload: BookingPayload): Promise<EnquiryResult> {
  await new Promise((r) => setTimeout(r, 900));
  console.info('[Thaa Maldives · booking request]', payload);
  return {
    ok: true,
    message: `Request received for ${payload.propertyName} — ${payload.roomName}. Your estimate is around USD ${payload.estimateUSD?.toLocaleString('en-US') ?? 'on request'}; a travel expert will confirm availability and pricing shortly.`,
  };
}

const site = () => getContent().site;

export const CONTACT = {
  get phone() {
    return site().phone;
  },
  get phoneHref() {
    return 'tel:' + site().phone.replace(/\s+/g, '');
  },
  get email() {
    return site().email;
  },
  get emailHref() {
    return 'mailto:' + site().email;
  },
  get whatsapp() {
    return site().whatsapp;
  },
  get address() {
    return site().address;
  },
};