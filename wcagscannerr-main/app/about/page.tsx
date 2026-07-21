import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AboutContent from '@/components/about/AboutContent';

export const metadata = {
  title: 'About | WCAG Scanner',
  description: 'Learn about WCAG Scanner — built by a solo developer and student passionate about real, code-level web accessibility.',
  openGraph: {
    title: 'About | WCAG Scanner',
    description: 'Learn about WCAG Scanner — built by a solo developer and student passionate about real, code-level web accessibility.',
    url: 'https://www.wcagscannerr.com/about',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-20 bg-background">
        <AboutContent />
      </main>
      <Footer />
    </>
  );
}