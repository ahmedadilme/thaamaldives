import {
  Hero,
  JourneySelector,
  FeaturedStays,
  StayKinds,
  SpecialOffers,
  ServicesSection,
  WhyAce,
  StoriesSection,
  TestimonialsSection,
  HowItWorks,
  NewsletterSection,
  PromoBanner,
} from '@/components/home-sections';
import { Marquee } from '@/components/ui';
import { getContent } from '@/content/client';

export default function Home() {
  const marquee = getContent().home.marquee;
  return (
    <>
      <Hero />
      <JourneySelector />
      <FeaturedStays />
      <Marquee items={marquee} />
      <StayKinds />
      <SpecialOffers />
      <ServicesSection />
      <WhyAce />
      <StoriesSection />
      <TestimonialsSection />
      <HowItWorks />
      <NewsletterSection />
      <PromoBanner />
    </>
  );
}