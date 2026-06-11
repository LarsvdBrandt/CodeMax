// Home page — assembles all one-page sections in order.
// Reorder, add, or remove sections here.

import { HeroSection }        from '@/sections/HeroSection'
import { FeaturesSection }    from '@/sections/FeaturesSection'
import { AboutSection }       from '@/sections/AboutSection'
import { WorkSection }        from '@/sections/WorkSection'
import { TestimonialsSection }from '@/sections/TestimonialsSection'
import { ContactSection }     from '@/sections/ContactSection'

export default function Home() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <AboutSection />
      <WorkSection />
      <TestimonialsSection />
      <ContactSection />
    </>
  )
}
