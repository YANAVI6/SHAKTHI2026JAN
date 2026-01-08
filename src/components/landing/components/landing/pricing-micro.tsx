import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { motion, useSpring, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";

interface PricingMicroProps {
    onEnquiryClick?: () => void;
}

export default function PricingMicro({ onEnquiryClick }: PricingMicroProps) {
    const features = [
        "Live Analytics & Monitoring",
        "Smart Gamification Engine",
        "PTP & Follow-up Tracking",
        "Team Leader Dashboard",
        "Case Allocation & Recycle Bin",
        "Unlimited Cases & History"
    ];

    const Counter = ({ value, className }: { value: number; className?: string }) => {
        const count = useSpring(0, {
            stiffness: 100,
            damping: 30,
            restDelta: 0.001
        });
        const display = useTransform(count, (latest) => Math.round(latest));
        const ref = useRef(null);

        useEffect(() => {
            const controls = animate(count, value, {
                duration: 2,
                delay: 0.5,
                ease: [0.16, 1, 0.3, 1] // Custom easeOutExpo
            });
            return controls.stop;
        }, [count, value]);

        return <motion.span ref={ref} className={className}>{display}</motion.span>;
    };

    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl font-display font-bold mb-6 text-gray-900">
                        Simple, Transparent Pricing
                    </h2>
                    <p className="text-xl text-gray-600">
                        Everything you need for a modern collection team, with no hidden costs.
                    </p>
                </div>

                <div className="max-w-xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="relative p-8 lg:p-12 rounded-[2rem] bg-gradient-to-b from-gray-50 to-white border-2 border-indigo-500/20 shadow-xl overflow-hidden group"
                    >
                        {/* Decoration */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-bl-full -mr-20 -mt-20 transition-transform group-hover:scale-110 duration-700" />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Professional Plan</h3>
                                    <p className="text-gray-500 mt-1">Best for collection agencies</p>
                                </div>
                                <div className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-200">
                                    Most Popular
                                </div>
                            </div>

                            <div className="flex flex-col mb-10">
                                <div className="flex items-baseline gap-2">
                                    <div className="flex items-baseline">
                                        <span className="text-6xl lg:text-7xl font-black text-gray-900 tracking-tighter">₹</span>
                                        <Counter value={10} className="text-6xl lg:text-7xl font-black text-gray-900 tracking-tighter" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-500 font-bold text-sm">per telecaller / day</span>
                                        <span className="text-emerald-600 text-[10px] font-black uppercase tracking-wider">Paid Monthly</span>
                                    </div>
                                </div>

                                {/* Value Counter Reveal */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.5 }}
                                    className="mt-6 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between"
                                >
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest leading-none">Monthly Value</span>
                                        </div>
                                        <div className="flex items-baseline gap-1 mt-1">
                                            <span className="text-2xl font-black text-gray-900">₹300</span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">per month</span>
                                        </div>
                                    </div>
                                    <div className="h-8 w-px bg-indigo-100" />
                                    <div className="flex flex-col text-right">
                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">ROI Guarantee</span>
                                        <span className="text-xs font-bold text-gray-900 mt-0.5">Less than one missed PTP</span>
                                    </div>
                                </motion.div>
                            </div>

                            <div className="space-y-4 mb-10">
                                {features.map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-3 text-gray-700 font-medium text-sm">
                                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                            <Check className="w-3 h-3 text-emerald-600" strokeWidth={3} />
                                        </div>
                                        {feature}
                                    </div>
                                ))}
                            </div>

                            <Button onClick={onEnquiryClick} className="w-full h-16 bg-gradient-to-r from-indigo-500 to-blue-600 hover:opacity-90 active:scale-[0.98] text-white text-lg font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2">
                                Start 7-Day Free Trial
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Button>

                            <div className="mt-8 flex items-center justify-center gap-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                <span className="flex items-center gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-gray-300" />
                                    No Setup Fee
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-gray-300" />
                                    No Contracts
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
