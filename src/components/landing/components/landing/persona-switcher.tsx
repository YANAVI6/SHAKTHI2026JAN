import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout, BarChart, Users, Zap, ShieldCheck, Trophy } from "lucide-react";

// Moved components outside
const AgentMockup = () => (
  <div className="w-full bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden">
    <div className="bg-gray-50 border-b border-gray-100 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">RS</div>
        <span className="text-xs font-bold text-gray-700">Rahul's Dashboard</span>
      </div>
      <div className="flex gap-2">
        <div className="w-16 h-4 bg-emerald-100 rounded-full" />
        <div className="w-4 h-4 rounded-full bg-gray-200" />
      </div>
    </div>
    <div className="p-6 space-y-6">
      <div className="h-32 bg-indigo-50/50 rounded-2xl border border-dashed border-indigo-200 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Next Best Action</p>
          <p className="text-sm font-bold text-gray-900">Call: Customer #1284 (High Priority)</p>
          <div className="flex gap-2 mt-4 justify-center">
            <div className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-200">Dial Now</div>
            <div className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold">Skip</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">PTP Goal</p>
          <div className="w-full h-1 bg-gray-200 rounded-full mt-2">
            <div className="w-3/4 h-full bg-emerald-500 rounded-full" />
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Rank</p>
          <p className="font-black text-indigo-600 text-lg">#3</p>
        </div>
      </div>
    </div>
  </div>
);

const ManagerMockup = () => (
  <div className="w-full bg-[#0F172A] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
    <div className="bg-white/5 border-b border-white/5 p-4 flex items-center justify-between">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Floor Monitoring</span>
      <div className="flex gap-1">
        {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />)}
      </div>
    </div>
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Floor Efficiency", val: "94%", color: "text-emerald-400" },
          { label: "Critical Cases", val: "12", color: "text-red-400" },
        ].map((item, i) => (
          <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{item.label}</p>
            <p className={`text-xl font-black ${item.color}`}>{item.val}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[
          { name: "Team Apollo", status: "82% Goal", color: "bg-indigo-500" },
          { name: "Team Zenith", status: "64% Goal", color: "bg-blue-500" },
        ].map((team, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${team.color}`} />
              <span className="text-xs font-bold text-gray-300">{team.name}</span>
            </div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase">{team.status}</span>
          </div>
        ))}
      </div>
      <div className="h-20 bg-gradient-to-t from-indigo-500/10 to-transparent rounded-xl border border-white/5 border-b-0" />
    </div>
  </div>
);

export default function PersonaSwitcher() {
  const [activeTab, setActiveTab] = useState<"agent" | "manager">("agent");

  return (
    <section className="py-24 bg-white overflow-hidden uppercase-none">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black tracking-widest mb-6 border border-indigo-100 uppercase"
          >
            Symmetry in Software
          </motion.div>
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gray-900 tracking-tight">
            Built for <span className="text-indigo-600">Every Perspective</span>
          </h2>

          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => setActiveTab("agent")}
              className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black tracking-widest uppercase transition-all duration-300 border-2 ${activeTab === "agent"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-200"
                : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
                }`}
            >
              <Zap className="w-5 h-5" />
              For Agents
            </button>
            <button
              onClick={() => setActiveTab("manager")}
              className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black tracking-widest uppercase transition-all duration-300 border-2 ${activeTab === "manager"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-200"
                : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
                }`}
            >
              <Layout className="w-5 h-5" />
              For Managers
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto rounded-[3rem] p-4 md:p-12 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24 relative z-10">
            <div className="lg:w-1/2">
              <AnimatePresence mode="wait">
                {activeTab === "agent" ? (
                  <motion.div
                    key="agent"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h3 className="text-3xl font-black text-gray-900 mb-6 tracking-tight">Precision Closing, <br /><span className="text-indigo-600">Minimial Friction</span></h3>
                    <p className="text-lg text-gray-500 font-medium mb-10 leading-relaxed">
                      Telecallers are guided by a "Next Best Action" engine. No more guesswork or manual dialing—just a focused recovery path that maximizes their daily output.
                    </p>
                    <div className="grid grid-cols-2 gap-6">
                      {[
                        { icon: Zap, text: "Click-to-Call Speed" },
                        { icon: BarChart, text: "Live Daily Targets" },
                        { icon: Trophy, text: "Instant Badge Payouts" },
                        { icon: Users, text: "Social Team Feed" }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100">
                            <item.icon className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span className="text-sm font-bold text-gray-700">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="manager"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h3 className="text-3xl font-black text-gray-900 mb-6 tracking-tight">Global Visibility, <br /><span className="text-indigo-600">Zero Floor Chaos</span></h3>
                    <p className="text-lg text-gray-500 font-medium mb-10 leading-relaxed">
                      Managers get absolute oversight of their collection floor. Spot bottlenecks in seconds, re-allocate cases on the fly, and ensure audit-ready compliance at all times.
                    </p>
                    <div className="grid grid-cols-2 gap-6">
                      {[
                        { icon: Layout, text: "Floor Map View" },
                        { icon: BarChart, text: "PTP Heatmaps" },
                        { icon: ShieldCheck, text: "Compliance Vault" },
                        { icon: Users, text: "Team Performance" }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100">
                            <item.icon className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span className="text-sm font-bold text-gray-700">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="lg:w-1/2 w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-indigo-500/10 blur-[100px] -z-10" />
                  {activeTab === "agent" ? <AgentMockup /> : <ManagerMockup />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
