import { Check, X } from "lucide-react";
import { motion } from "framer-motion";

export default function Comparison() {
  return (
    <section id="comparison" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block px-4 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black tracking-widest mb-4 border border-indigo-100 uppercase">
            Operational Shift
          </div>
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gray-900 tracking-tight">
            Stop Chasing <span className="text-indigo-600">Spreadsheets</span>
          </h2>
          <p className="text-xl text-gray-500 font-medium leading-relaxed">
            Transition from fragmented manual tracking to a unified, technical recovery ecosystem.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Old Way */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 lg:p-10 rounded-[2.5rem] bg-gray-50 border border-gray-100"
          >
            <h3 className="text-2xl font-black text-gray-400 mb-8 flex items-center gap-3">
              <div className="w-1.5 h-8 bg-gray-200 rounded-full" />
              Legacy Systems
            </h3>
            <ul className="space-y-6">
              {[
                "Manual Excel logging with 25%+ data error rates",
                "Zero visibility into real-time agent activity",
                "Fragmented PTP tracking across sticky notes",
                "Opaque performance metrics and ROI reporting"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-4 text-gray-500 font-medium text-sm">
                  <div className="min-w-6 min-h-6 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mt-0.5">
                    <X className="w-3.5 h-3.5 text-gray-400" strokeWidth={3} />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Shakti Way */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 lg:p-10 rounded-[2.5rem] bg-indigo-600 text-white relative overflow-hidden shadow-2xl shadow-indigo-200"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full -mr-10 -mt-10" />

            <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3 relative z-10">
              <div className="w-1.5 h-8 bg-white/20 rounded-full" />
              The Shakti Protocol
            </h3>
            <ul className="space-y-6 relative z-10">
              {[
                "Automated allocation with verified data integrity",
                "Live status dashboard for instant floor oversight",
                "Smart PTP alerts with automated follow-ups",
                "High-fidelity analytics for peak recovery ROI"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-4 text-indigo-50 font-medium text-sm">
                  <div className="min-w-6 min-h-6 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mt-0.5">
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-8 border-t border-white/10 relative z-10">
              <p className="text-white font-black text-lg">
                Included at just ₹10/day per agent.
              </p>
              <p className="text-indigo-200 text-xs font-bold mt-1 uppercase tracking-widest">
                Recover more. Manage less.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
