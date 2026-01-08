import Hero from "@/components/landing/components/landing/hero";
import Navbar from "@/components/landing/components/landing/navbar";
import Comparison from "@/components/landing/components/landing/comparison";
import Footer from "@/components/landing/components/landing/footer";
import BentoFeatures from "@/components/landing/components/landing/bento-features";
import PersonaSwitcher from "@/components/landing/components/landing/persona-switcher";
import Testimonials from "@/components/landing/components/landing/testimonials";
import FAQ from "@/components/landing/components/landing/faq";
import PricingMicro from "@/components/landing/components/landing/pricing-micro";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useState } from "react";
import { EnquiryModal } from "@/components/landing/EnquiryModal";

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);

  const handleEnquiryClick = () => {
    setIsEnquiryModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white selection:bg-sky-500/20 selection:text-sky-600 relative overflow-x-hidden">
      {/* Dynamic Background Pattern with 3D Perspective */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white [perspective:1000px]">
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [transform:rotateX(20deg)_scale(1.5)] origin-top"
          style={{ height: '200%' }}
        />
        <motion.div
          style={{ opacity }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.4, 0.3],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute left-0 right-0 top-0 -z-10 m-auto h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-3xl will-change-transform"
        ></motion.div>

        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute right-0 top-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-blue-500/5 blur-3xl will-change-transform"
        />

        <motion.div
          animate={{
            x: [0, -30, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute left-0 bottom-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-indigo-500/5 blur-3xl will-change-transform"
        />
      </div>

      <Navbar onEnquiryClick={handleEnquiryClick} />
      <Hero onEnquiryClick={handleEnquiryClick} />

      <BentoFeatures />

      <PersonaSwitcher />

      <Comparison />

      <Testimonials />

      {/* CTA Strip */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-blue-600"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>

        {/* Animated background shapes */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 45, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -left-40 -top-40 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl will-change-transform"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, -25, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -right-20 -bottom-40 w-[500px] h-[500px] bg-blue-700/20 rounded-full blur-3xl will-change-transform"
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
              Start today at just ₹10 per telecaller per day. <br className="hidden sm:block" />
              Recover more without increasing manpower.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" onClick={handleEnquiryClick} className="bg-white text-indigo-600 hover:bg-gray-50 text-lg px-10 h-16 rounded-2xl shadow-xl shadow-black/10 font-bold transition-transform hover:-translate-y-1">
                Get Started Now
              </Button>
              <Button size="lg" variant="outline" onClick={handleEnquiryClick} className="border-white/30 text-white hover:bg-white/10 hover:text-white text-lg px-10 h-16 rounded-2xl backdrop-blur-sm">
                Schedule Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 2 }}
        >
          <Button onClick={handleEnquiryClick} className="w-full h-14 bg-indigo-600 text-white rounded-2xl shadow-2xl font-bold text-lg border-2 border-white/20">
            Start Free – ₹10/Day
          </Button>
        </motion.div>
      </div>

      <PricingMicro onEnquiryClick={handleEnquiryClick} />

      <FAQ />

      <Footer onEnquiryClick={handleEnquiryClick} />

      {/* Persistent Floating Pricing Bubble (Desktop Only) */}
      <div className="fixed bottom-10 right-10 z-40 hidden lg:block">
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 3, duration: 0.8, type: "spring" }}
          whileHover={{ scale: 1.05 }}
          className="relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-3xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative px-6 py-4 bg-white ring-1 ring-gray-900/5 rounded-3xl leading-none flex items-center gap-4 shadow-2xl">
            <div className="flex flex-col">
              <span className="text-2xl font-black text-gray-900 leading-none">₹10</span>
              <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest mt-1">/day/agent</span>
            </div>
            <div className="h-8 w-px bg-gray-100" />
            <Button size="sm" onClick={handleEnquiryClick} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-4">
              Get Started
            </Button>
          </div>
        </motion.div>
      </div>

      <EnquiryModal isOpen={isEnquiryModalOpen} onClose={() => setIsEnquiryModalOpen(false)} />
    </div>
  );
}
