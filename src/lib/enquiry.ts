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

type LeadKind = 'enquiry' | 'newsletter' | 'booking';

const ENDPOINT = (): string =>
  String((import.meta.env as Record<string, string | undefined>).VITE_ENQUIRY_ENDPOINT ?? '').trim();

/** True when a real endpoint is configured; forms can warn before submitting. */
export const isLeadCaptureConfigured = (): boolean => ENDPOINT().length > 0;

const UNCONFIGURED =
  'Enquiries are not configured on this build. Please email us directly and we will reply shortly.';

/** Field name the endpoint uses for "which form was this". */
const KIND_FIELD = 'kind';

/**
 * POST a lead to the configured endpoint.
 *
 * Uses `Accept: application/json` so form backends (Formspree, Basin, Getform,
 * Web3Forms, a custom handler) return a JSON acknowledgement rather than an
 * HTML page. Never reports success unless the server actually accepted it —
 * these are real enquiries and real bookings, so a silent fake-success loses
 * the customer.
 */
async function postLead(
  kind: LeadKind,
  fields: Record<string, unknown>,
  successMessage: string
): Promise<EnquiryResult> {
  const endpoint = ENDPOINT();
  if (!endpoint) return { ok: false, message: UNCONFIGURED };

  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') continue;
    body.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
  body.set(KIND_FIELD, kind);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' },
      body: body.toString(),
    });

    if (!res.ok) {
      return {
        ok: false,
        message:
          res.status === 429
            ? 'Too many attempts from this device. Please try again later.'
            : `We could not send that (server replied ${res.status}). Please try again, or email us directly.`,
      };
    }

    return { ok: true, message: successMessage };
  } catch {
    return {
      ok: false,
      message: 'We could not reach the server. Check your connection and try again, or email us directly.',
    };
  }
}

export async function submitEnquiry(payload: EnquiryPayload): Promise<EnquiryResult> {
  return postLead(
    'enquiry',
    { ...payload, subject: 'Website enquiry' },
    `Thank you, ${payload.name.split(' ')[0] || 'traveller'}! A travel expert will reach out shortly.`
  );
}

export async function subscribeNewsletter(email: string): Promise<EnquiryResult> {
  return postLead('newsletter', { email }, 'You’re on the list — don’t miss the next great escape.');
}

export async function submitBooking(payload: BookingPayload): Promise<EnquiryResult> {
  return postLead(
    'booking',
    {
      ...payload,
      addons: payload.addons.map((a) => a.name).join(', '),
      subject: `Booking request — ${payload.propertyName}`,
    },
    `Request received for ${payload.propertyName} — ${payload.roomName}. Your estimate is around USD ${
      payload.estimateUSD?.toLocaleString('en-US') ?? 'on request'
    }; a travel expert will confirm availability and pricing shortly.`
  );
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