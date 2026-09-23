import type { ReactNode } from 'react';
import { ArrowRight, Hammer } from 'lucide-react';
import { MODULE_LABELS, type ModuleId } from '@/config/modules';
import { isModuleEnabled } from '@/lib/modules';
import { Button } from '@/components/ui';

function enabledFor(id: ModuleId | 'services'): boolean {
  if (id === 'services') {
    return (['flights', 'visa', 'corporate', 'insurance'] as ModuleId[]).some((m) => isModuleEnabled(m));
  }
  return isModuleEnabled(id);
}

export function ModuleGate({ id, children }: { id: ModuleId | 'services'; children: ReactNode }) {
  const on = enabledFor(id);
  if (on) return <>{children}</>;

  const label = id === 'services' ? 'Travel Services' : MODULE_LABELS[id];

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-5 py-24 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-sand-100 text-brand-700">
        <Hammer size={28} />
      </span>
      <h1 className="font-display mt-7 text-4xl font-semibold">{label} — coming soon</h1>
      <p className="mt-4 max-w-md text-ink-600">
        This module is part of our roadmap and isn’t live yet. Today we’re focused on Maldivian stays — resorts,
        hotels and guest houses.
      </p>
      <div className="mt-8">
        <Button to="/explore" variant="dark" size="lg">
          Explore stays <ArrowRight size={16} />
        </Button>
      </div>
    </section>
  );
}