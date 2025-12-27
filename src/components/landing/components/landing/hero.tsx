import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, Clock, TrendingUp, CheckCircle2 } from "lucide-react";

const DashboardMockup = () => {
  return (
    <div className="w-full bg-[#0F172A] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl relative">
      {/* Chrome Style Top Bar */}
      <div className="h-10 bg-white/5 border-b border-white/10 flex items-center px-6 gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
        </div>
        <div className="mx-auto bg-white/5 px-4 py-1 rounded-md text-[10px] text-gray-400 font-mono">
          shakti-crm.app/live-monitor
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Active Cases", value: "1,284", color: "text-indigo-400", bg: "bg-indigo-500/10" },
            { label: "Live Agents", value: "42", color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "PTP Today", value: "₹4.2L", color: "text-blue-400", bg: "bg-blue-500/10" },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} p-4 rounded-2xl border border-white/5`}>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Live Activity Chart Area */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 h-48 relative overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs font-bold text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Recovery Stream
            </p>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />)}
            </div>
          </div>

          <div className="flex items-end justify-between h-24 gap-1.5">
            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 80, 45].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: i * 0.05, duration: 1, repeat: Infinity, repeatType: "reverse" }}
                className="flex-1 bg-gradient-to-t from-indigo-500/40 to-indigo-400/10 rounded-t-sm"
              />
            ))}
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent h-full mt-24" />
        </div>

        {/* Floating PTP Alert (Simulated) */}
        <motion.div
          animate={{ scale: [1, 1.02, 1], y: [0, -2, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="bg-emerald-500/20 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-400 uppercase leading-none">PTP Confirmed</p>
              <p className="text-sm font-bold text-white mt-1">₹12,450 • Agent: Rahul S.</p>
            </div>
          </div>
          <div className="text-[10px] text-emerald-400/60 font-mono">Just Now</div>
        </motion.div>
      </div>

      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
    </div>
  );
};

const PTPAlertPopup = () => (
  <motion.div
    initial={{ x: 100, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ delay: 2, duration: 0.5, type: "spring" }}
    className="absolute -right-12 top-20 z-30 bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 flex items-center gap-4 w-64"
  >
    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
      <TrendingUp className="w-6 h-6 text-indigo-600" />
    </div>
    <div>
      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">Peak Performance</p>
      <p className="text-sm font-bold text-gray-900 mt-1">+24% Recovery Rate</p>
    </div>
  </motion.div>
);

export default function Hero() {
  return (
    <section className="pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] -z-10" />

      <div className="container mx-auto px-4 relative">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          {/* Left Content */}
          <div className="lg:w-1/2 z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold mb-8 border border-indigo-100 shadow-sm">
                <Zap className="w-4 h-4" />
                Enterprise Grade Collection Software
              </div>

              <h1 className="text-5xl lg:text-7xl font-display font-bold leading-[1.1] mb-6 text-gray-900 tracking-tight">
                Control Every <br />
                <span className="text-indigo-600">Recovery Stream</span>
              </h1>

              <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-xl">
                The high-performance CRM built for large-scale collection agencies. Real-time monitoring, automated PTP extraction, and elite team governance.
              </p>

              {/* Simplified Price Badge with Motion Animation */}
              <div className="flex items-center gap-6 mb-10">
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative group cursor-default"
                >
                  <div className="flex flex-col relative z-10">
                    <span className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tighter">₹10</span>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mt-1">per agent / day</span>
                  </div>
                  {/* Decorative glow behind price */}
                  <div className="absolute -inset-4 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors duration-500" />

                  {/* Shine effect overlay */}
                  <motion.div
                    animate={{
                      left: ["-100%", "200%"],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 2,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full skew-x-[-20deg] pointer-events-none mix-blend-overlay"
                  />
                </motion.div>

                <div className="w-px h-12 bg-gray-200" />

                <div className="flex flex-col">
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-sm font-bold text-emerald-600 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Unlimited Cases
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="text-sm font-bold text-indigo-600 flex items-center gap-1 mt-1"
                  >
                    <Zap className="w-4 h-4" />
                    Instant PTP Alerts
                  </motion.span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button
                  size="lg"
                  className="h-16 px-10 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all hover:scale-[1.02]"
                >
                  Start 7-Day Free Trial
                  <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
                <Button size="lg" variant="outline" className="h-16 px-10 text-lg font-bold rounded-2xl border-2">
                  View Enterprise Scale
                </Button>
              </div>

              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-none">ISO 27001</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Data Secured</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-none">99.9% Uptime</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Enterprise SLA</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Content / Functional Mockups (No Photos) */}
          <div className="lg:w-1/2 relative mt-12 lg:mt-0">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
              className="relative z-10"
            >
              <DashboardMockup />
              <PTPAlertPopup />

              {/* Secondary Element - Case Distribution Mockup */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="absolute -bottom-10 -left-12 z-20 bg-white p-5 rounded-2xl shadow-2xl border border-gray-100 w-64"
              >
                <p className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Agent Allocation</p>
                <div className="space-y-3">
                  {[
                    { name: "Team North", value: 85, color: "bg-indigo-500" },
                    { name: "Team South", value: 62, color: "bg-blue-500" },
                    { name: "Team West", value: 45, color: "bg-emerald-500" },
                  ].map((team, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span>{team.name}</span>
                        <span>{team.value}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${team.value}%` }}
                          transition={{ delay: 2 + (i * 0.2), duration: 1 }}
                          className={`h-full ${team.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-500/5 rounded-full blur-[80px] -z-20" />
          </div>
        </div>
      </div>
    </section>
  );
}
