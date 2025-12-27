import Hero from "@/components/landing/components/landing/hero";
import Navbar from "@/components/landing/components/landing/navbar";
import Comparison from "@/components/landing/components/landing/comparison";
import Footer from "@/components/landing/components/landing/footer";
import BentoFeatures from "@/components/landing/components/landing/bento-features";
import PersonaSwitcher from "@/components/landing/components/landing/persona-switcher";
import Testimonials from "@/components/landing/components/landing/testimonials";
import FAQ from "@/components/landing/components/landing/faq";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white selection:bg-brand-purple/20 selection:text-brand-purple">
      <Navbar />
      <Hero />

      <BentoFeatures />

      <PersonaSwitcher />

      <Comparison />

      <Testimonials />

      {/* CTA Strip */}
      <section className="bg-gradient-to-r from-sky-500 to-blue-600 py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

        {/* Animated background shapes */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -left-40 -top-40 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            rotate: [0, -45, 0]
          }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute -right-20 -bottom-40 w-[500px] h-[500px] bg-blue-700/20 rounded-full blur-3xl"
        />

        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-6 tracking-tight">
              Ready to transform <br /> your collections?
            </h2>
            <p className="text-white/80 text-xl mb-10 max-w-2xl mx-auto font-light">
              Join hundreds of agencies maximizing their recovery rates with Shakti's intelligent platform.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="bg-white text-sky-600 hover:bg-gray-50 text-lg px-8 h-14 rounded-2xl shadow-xl shadow-black/10 font-bold transition-transform hover:-translate-y-1">
                Get Started Now
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white text-lg px-8 h-14 rounded-2xl backdrop-blur-sm">
                Schedule Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <FAQ />

      <Footer />
    </div>
  );
}
