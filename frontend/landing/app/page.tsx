import { AntiPositioning } from '@/components/sections/AntiPositioning';
import { BuildAPlate } from '@/components/sections/BuildAPlate';
import { Footer } from '@/components/sections/Footer';
import { Hero } from '@/components/sections/Hero';
import { Metrics } from '@/components/sections/Metrics';
import { PeakMoments } from '@/components/sections/PeakMoments';
import { Pillars } from '@/components/sections/Pillars';
import { Waitlist } from '@/components/sections/Waitlist';

export default function HomePage() {
  return (
    <main id="top">
      <Hero />
      <AntiPositioning />
      <Pillars />
      <BuildAPlate />
      <Metrics />
      <PeakMoments />
      <Waitlist />
      <Footer />
    </main>
  );
}
