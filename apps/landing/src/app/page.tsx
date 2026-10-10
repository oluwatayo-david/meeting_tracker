import { Nav } from '@/components/nav';
import { Hero } from '@/components/hero';
import { Problem } from '@/components/problem';
import { HowItWorks } from '@/components/how-it-works';
import { Features } from '@/components/features';
import { Teams } from '@/components/teams';
import { Security } from '@/components/security';
import { Faq } from '@/components/faq';
import { Cta } from '@/components/cta';
import { Footer } from '@/components/footer';

/*
 * Page narrative:
 *   Hero (promise + product) → Problem (why it matters) → How it works (the loop)
 *   → Features (depth) → Teams (fit for each role) → Security (trust)
 *   → FAQ (objections) → CTA (act) → Footer
 */
export default function LandingPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <Teams />
        <Security />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
