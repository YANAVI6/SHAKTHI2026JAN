import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#0F172A] text-white pt-20 pb-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full"></div>
                  <Zap className="w-5 h-5 text-white relative z-10" strokeWidth={2.5} />
                </div>
              </div>
              <span className="text-2xl font-black text-white">
                Shakti
              </span>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              The high-performance CRM built for enterprise-scale collection agencies. Control every recovery stream with precision.
            </p>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-indigo-500 transition-all cursor-pointer border border-white/10" />
              <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-indigo-500 transition-all cursor-pointer border border-white/10" />
              <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-indigo-500 transition-all cursor-pointer border border-white/10" />
            </div>
          </div>

          <div>
            <h4 className="font-black text-sm uppercase tracking-widest mb-8 text-gray-500">Protocol</h4>
            <ul className="space-y-4 text-gray-400 text-sm font-bold">
              <li><a href="#features" className="hover:text-indigo-400 transition-colors">Core Features</a></li>
              <li><a href="#comparison" className="hover:text-indigo-400 transition-colors">The Protocol</a></li>
              <li><a href="#testimonials" className="hover:text-indigo-400 transition-colors">Industry Proof</a></li>
              <li><a href="/pricing" className="hover:text-indigo-400 transition-colors">Scale Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-sm uppercase tracking-widest mb-8 text-gray-500">Corporate</h4>
            <ul className="space-y-4 text-gray-400 text-sm font-bold">
              <li><a href="#" className="hover:text-indigo-400 transition-colors">About Shakti</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition-colors">Security Vault</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition-colors">API Docs</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition-colors">Contact Support</a></li>
            </ul>
          </div>

          <div className="bg-indigo-900/20 p-8 rounded-3xl border border-indigo-500/20">
            <h4 className="font-black text-lg mb-4 text-white">Ready for Scale?</h4>
            <p className="text-indigo-200 text-sm mb-6 font-medium">Deploy the Shakti Protocol to your floor today.</p>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest py-6 rounded-xl">
              Book Command Demo
            </Button>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-600">
          <p>&copy; 2025 Shakti CRM • Enterprise Grade Recovery</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-indigo-400 transition-colors">Data Privacy</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Internal Compliance</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
