import { motion, Variants } from "framer-motion";
import {
  Trophy,
  BarChart3,
  ShieldCheck,
  Activity,
  UserCheck2,
} from "lucide-react";

export default function BentoFeatures() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <section id="features" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-indigo-100"
          >
            Functional Excellence
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gray-900 tracking-tight"
          >
            Built for <span className="text-indigo-600">Enterprise Control</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-500 font-medium"
          >
            Ditch the spreadsheets. Shakti provides the high-fidelity oversight required for modern debt recovery operations.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {/* Main Card - Live Tracking */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -8 }}
            className="md:col-span-2 bg-[#F8FAFC] p-8 lg:p-10 rounded-[2.5rem] border border-gray-100 relative overflow-hidden group transition-all duration-500"
          >
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-8 shadow-xl shadow-indigo-200">
                <Activity className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black mb-4 text-gray-900 tracking-tight">Real-Time Floor Tracking</h3>
              <p className="text-gray-500 font-medium max-w-md leading-relaxed">
                Monitor every agent's live status. See exactly who is on a call, who is in wrap-up, and which cases are being moved in real-time.
              </p>

              <div className="flex gap-4 mt-10">
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Live Agents</p>
                  <p className="text-xl font-black text-indigo-600 tracking-tighter">42 Online</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current PTP</p>
                  <p className="text-xl font-black text-emerald-600 tracking-tighter">₹2.8L</p>
                </div>
              </div>
            </div>

            {/* Abstract UI Element */}
            <div className="absolute right-0 bottom-0 top-0 w-1/2 bg-gradient-to-l from-indigo-50/50 to-transparent flex items-center justify-end p-8 translate-x-10 group-hover:translate-x-0 transition-transform duration-700">
              <div className="w-64 h-80 bg-white rounded-3xl border border-gray-100 shadow-2xl p-6 space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                      <div className="w-20 h-2 bg-gray-100 rounded-full" />
                    </div>
                    <div className="w-8 h-2 bg-indigo-100 rounded-full" />
                  </div>
                ))}
                <div className="pt-4">
                  <div className="w-full h-24 bg-indigo-50 rounded-xl relative overflow-hidden">
                    <motion.div
                      animate={{ x: [-100, 100] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-1/2 skew-x-12"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Gamification / ROI */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -8 }}
            className="md:row-span-2 bg-[#0F172A] text-white p-8 lg:p-10 rounded-[2.5rem] relative overflow-hidden group shadow-2xl shadow-indigo-900/20"
          >
            <div className="relative z-10 h-full flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center mb-8 shadow-xl shadow-indigo-500/20">
                <Trophy className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black mb-4 tracking-tight">Performance Fuel</h3>
              <p className="text-gray-400 font-medium leading-relaxed mb-10">
                Incentivize your force with real-time leaderboards. Convert mundane collection tasks into a competitive, high-output mission.
              </p>

              <div className="mt-auto space-y-4">
                {[
                  { name: "Top Recovers", val: 92 },
                  { name: "Call Efficiency", val: 84 },
                  { name: "PTP Conversion", val: 78 },
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-400">
                      <span>{item.name}</span>
                      <span className="text-indigo-400">{item.val}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${item.val}%` }}
                        transition={{ delay: 0.5 + (i * 0.1), duration: 1 }}
                        className="h-full bg-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Background Blob */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -z-0" />
          </motion.div>

          {/* Precision Allocation */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -8 }}
            className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm group hover:shadow-xl transition-all duration-500"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 border border-emerald-100 tracking-tight">
              <UserCheck2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black mb-2 text-gray-900 tracking-tight">AI Case Allocation</h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">
              Automatically route cases to the most efficient agents based on historical recovery scores and case complexity.
            </p>
          </motion.div>

          {/* Compliance Card */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -8 }}
            className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm group hover:shadow-xl transition-all duration-500"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-6 border border-orange-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black mb-2 text-gray-900 tracking-tight">Compliance Shield</h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">
              End-to-end call recording, audit logs, and data encryption. Fully compliant with RBI and internal regulatory standards.
            </p>
          </motion.div>

          {/* Manager Command Center */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -8 }}
            className="md:col-span-2 bg-[#F8FAFC] p-8 lg:p-10 rounded-[2.5rem] border border-gray-100 flex flex-col md:flex-row items-center gap-10 group overflow-hidden transition-all duration-500"
          >
            <div className="flex-1 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 border border-indigo-100">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black mb-3 text-gray-900 tracking-tight">Live PTP Analytics</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                A birds-eye view for managers to spot collection trends instantly. Track every PTP from generation to settlement without missing a beat.
              </p>
            </div>

            <div className="flex-1 w-full bg-white rounded-3xl p-6 border border-gray-200 relative shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
              <div className="flex items-end gap-2 h-32 w-full justify-between px-2">
                {[40, 70, 50, 90, 60, 80, 95].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    transition={{ delay: 0.2 + (i * 0.1), duration: 0.5 }}
                    viewport={{ once: true }}
                    className="w-full bg-indigo-500 rounded-t-lg relative group-hover:bg-indigo-600 transition-colors duration-500"
                  />
                ))}
              </div>
              <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-bounce">
                +24% PTP
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
