import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface SplashScreenProps {
    onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
    const [show, setShow] = useState(true);
    const [particles, setParticles] = useState<Array<{ x: number, y: number, targetY: number, duration: number, delay: number }>>([]);

    useEffect(() => {
        // Generate random particles after mount to avoid purity issues during render
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setParticles([...Array(20)].map(() => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            targetY: Math.random() * window.innerHeight,
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 2
        })));

        // Auto-hide splash screen after animation completes
        const timer = setTimeout(() => {
            setShow(false);
            setTimeout(onComplete, 500); // Wait for fade out animation
        }, 3000); // Show for 3 seconds

        return () => clearTimeout(timer);
    }, [onComplete]);

    if (!show) {
        return (
            <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="fixed inset-0 z-50 bg-gradient-to-br from-sky-500 via-blue-600 to-blue-700 flex items-center justify-center"
            />
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-gradient-to-br from-sky-500 via-blue-600 to-blue-700 flex items-center justify-center overflow-hidden"
        >
            {/* Animated background particles */}
            <div className="absolute inset-0">
                {particles.map((p, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-white/20 rounded-full"
                        initial={{
                            x: p.x,
                            y: p.y,
                            scale: 0,
                        }}
                        animate={{
                            y: [null, p.targetY],
                            scale: [0, 1, 0],
                            opacity: [0, 1, 0],
                        }}
                        transition={{
                            duration: p.duration,
                            repeat: Infinity,
                            delay: p.delay,
                        }}
                    />
                ))}
            </div>

            {/* Main logo container */}
            <div className="relative z-10 flex flex-col items-center">
                {/* Animated logo */}
                {/* Growing Chart Animation */}
                <div className="relative h-40 w-64 flex items-end justify-center gap-4 mb-8 p-4">
                    {/* Chart Grid Lines (Background) */}
                    <div className="absolute inset-0 flex flex-col justify-between opacity-20 pointer-events-none">
                        <div className="w-full h-px bg-white" />
                        <div className="w-full h-px bg-white" />
                        <div className="w-full h-px bg-white" />
                        <div className="w-full h-px bg-white" />
                    </div>

                    {/* Bar 1 */}
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "40%", opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                        className="w-8 bg-white/30 rounded-t-md backdrop-blur-sm"
                    />

                    {/* Bar 2 */}
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "65%", opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
                        className="w-8 bg-white/50 rounded-t-md backdrop-blur-sm"
                    />

                    {/* Bar 3 */}
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "55%", opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
                        className="w-8 bg-white/70 rounded-t-md backdrop-blur-sm"
                    />

                    {/* Bar 4 (Growth/Success) */}
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "90%", opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.8, type: "spring", bounce: 0.4 }}
                        className="w-8 bg-white rounded-t-md relative shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                    >
                        {/* Logo popping up on top */}
                        <motion.div
                            initial={{ scale: 0, y: 10, opacity: 0 }}
                            animate={{ scale: 1, y: -24, opacity: 1 }}
                            transition={{ delay: 1.4, type: "spring", stiffness: 300, damping: 15 }}
                            className="absolute left-1/2 -translate-x-1/2 w-12 h-12 flex items-center justify-center"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-yellow-400/30 blur-lg rounded-full" />
                                <Zap className="w-8 h-8 text-yellow-300 fill-yellow-300 drop-shadow-md relative z-10" strokeWidth={3} />
                            </div>
                        </motion.div>
                    </motion.div>
                </div>

                {/* Brand name */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    className="text-center"
                >
                    <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
                        Shakthi
                    </h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2, duration: 0.6 }}
                        className="text-white/80 text-lg font-medium"
                    >
                        Empowering Collections
                    </motion.p>
                </motion.div>

                {/* Loading indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="mt-12"
                >
                    <div className="flex gap-2">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-3 h-3 bg-white rounded-full"
                                animate={{
                                    scale: [1, 1.5, 1],
                                    opacity: [0.5, 1, 0.5],
                                }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                }}
                            />
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-900/50 to-transparent" />
        </motion.div>
    );
}
