const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export const formatUSD = (n: number) => usd.format(n);

export const formatRate = (v: string | number | undefined): string => {
  if (v === undefined || v === '' || v === 'N/A') return '—';
  if (v === 'FOC') return 'FOC';
  if (typeof v === 'string' && Number.isNaN(Number(v))) return v;
  return `$${v}`;
};