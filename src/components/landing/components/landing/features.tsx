import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Trophy,
  Zap,
  Users,
  BarChart3,
  PhoneCall
} from "lucide-react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Smart Dashboard",
    description: "Everything an agent needs in one view—cases, targets, and performance metrics all in one place.",
    color: "bg-purple-100 text-brand-purple",
  },
  {
    icon: Trophy,
    title: "Gamification",
    description: "Celebrate every win. Trigger animations and alerts when payments are collected to boost morale.",
    color: "bg-orange-100 text-brand-orange",
  },
  {
    icon: Zap,
    title: "One-Click Actions",
    description: "Call, update status, and log payments instantly without switching tabs or windows.",
    color: "bg-blue-100 text-brand-blue",
  },
  {
    icon: Users,
    title: "Team Insights",
    description: "Managers get a bird's-eye view of team performance and collection trends in real-time.",
    color: "bg-green-100 text-green-600",
  },
  {
    icon: BarChart3,
    title: "Smart Allocation",
    description: "Automatically distribute cases based on agent expertise, language, and past performance.",
    color: "bg-pink-100 text-pink-600",
  },
  {
    icon: PhoneCall,
    title: "Integrated Calling",
    description: "Click-to-call directly from the browser with automatic call recording and logging.",
    color: "bg-indigo-100 text-indigo-600",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-display font-bold mb-6 text-gray-900">
            Everything you need to <br />
            <span className="text-brand-purple">maximize recovery</span>
          </h2>
          <p className="text-xl text-gray-600 mb-4">
            Powerful tools designed specifically for modern debt collection teams to work faster and smarter.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 text-brand-purple text-sm font-bold border border-purple-100">
            All this at a simple ₹10 per telecaller per day. No hidden charges.
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-brand-purple/20 transition-all duration-300 group"
            >
              <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
