import { ArrowLeft, Compass } from 'lucide-react';
import { Button, SectionHeading } from '@/components/ui';

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center px-5 py-24 text-center">
      <p className="font-display text-[7rem] font-semibold leading-none text-brand-700/15 sm:text-[10rem]">404</p>
      <SectionHeading align="center" eyebrow="Lost at sea" title="That page drifted off with the tide." />
      <p className="mt-4 max-w-md text-ink-600">
        The itinerary you’re looking for doesn’t exist — or moved. Let’s get you back to land.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button to="/" variant="dark" size="lg">
          <ArrowLeft size={16} /> Back home
        </Button>
        <Button to="/explore-maldives" variant="outline" size="lg">
          <Compass size={16} /> Explore Maldives
        </Button>
      </div>
    </section>
  );
}