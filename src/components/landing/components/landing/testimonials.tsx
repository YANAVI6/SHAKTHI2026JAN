import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { ReviewModal } from "../../ReviewModal";
import { Button } from "@/components/ui/button";
import { PenTool } from "lucide-react";

const DEFAULT_REVIEWS = [
  {
    content: "Recovery rates went up by 35% in just two months. The live floor tracking actually keeps the team focused and motivated.",
    name: "Rahul Sharma",
    role: "Collection Head, FinTech One",
    initials: "RS",
    color: "bg-indigo-600"
  },
  {
    content: "Finally, a CRM that doesn't feel like a spreadsheet from 1990. The automated PTP extraction is a game changer.",
    name: "Priya Mehta",
    role: "Director, Mehta Agencies",
    initials: "PM",
    color: "bg-emerald-600"
  },
  {
    content: "The automated allocation saved us 2 hours of manual work every single morning. Zero case loss since implementation.",
    name: "Amit Verma",
    role: "Ops Manager, Swift Loans",
    initials: "AV",
    color: "bg-blue-600"
  },
  {
    content: "Enterprise-grade software with absolute transparency. The audit logs keep us 100% compliant with RBI standards.",
    name: "Sneha Reddy",
    role: "CTO, CreditFlow",
    initials: "SR",
    color: "bg-indigo-500"
  },
];

interface Review {
  content?: string;
  quote?: string;
  name?: string;
  author?: string;
  role: string;
  initials: string;
  color: string;
  rating?: number;
}

export default function Testimonials() {
  const [reviews, setReviews] = useState<Review[]>(DEFAULT_REVIEWS);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const { data, error } = await supabase
          .from('testimonials')
          .select('*')
          .eq('approved', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching testimonials:', error);
          return;
        }

        if (data && data.length > 0) {
          const formattedReviews = data.map(review => ({
            ...review,
            initials: review.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
            color: 'bg-indigo-600' // Default color, could be randomized or stored
          }));
          // Combine with default reviews if needed, or just replace. 
          // For now, let's prepend fetched reviews to defaults so the marquee isn't empty initially.
          setReviews([...formattedReviews, ...DEFAULT_REVIEWS]);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
      }
    };

    fetchTestimonials();
  }, []);

  return (
    <section id="testimonials" className="py-24 bg-white overflow-hidden relative">
      <div className="container mx-auto px-4 mb-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black tracking-widest mb-6 border border-emerald-100 uppercase"
        >
          Social Proof
        </motion.div>
        <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gray-900 tracking-tight">
          Trusted by <span className="text-indigo-600">Industry Leaders</span>
        </h2>
        <p className="text-gray-500 font-medium max-w-2xl mx-auto mb-8">
          Shakthi is the backbone for India's most efficient debt recovery operations.
        </p>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={() => setIsReviewModalOpen(true)}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 rounded-full px-8 py-6 text-lg font-semibold"
          >
            <PenTool className="w-5 h-5 mr-3" />
            Write a Review
          </Button>
        </motion.div>
      </div>

      {/* Marquee Effect */}
      <div className="relative flex overflow-hidden group py-10">
        <div className="flex animate-marquee space-x-8 whitespace-nowrap">
          {[...reviews, ...reviews].map((review, index) => (
            <div
              key={index}
              className="w-[450px] bg-[#F8FAFC] p-8 lg:p-10 rounded-[2.5rem] border border-gray-100 flex-shrink-0 mx-4 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 group/card"
            >
              <div className="flex gap-1 mb-8 opacity-40 group-hover/card:opacity-100 transition-opacity">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className={`w-4 h-4 ${star <= (review.rating || 5) ? 'text-emerald-500' : 'text-gray-300'} fill-current`} viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 text-xl font-bold mb-10 whitespace-normal leading-relaxed tracking-tight italic">
                "{review.content || review.quote}"
              </p>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl ${review.color || 'bg-indigo-600'} flex items-center justify-center text-white font-black text-lg shadow-lg`}>
                  {review.initials}
                </div>
                <div>
                  <p className="font-black text-gray-900 tracking-tight">{review.name || review.author}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{review.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute top-0 bottom-0 left-0 w-64 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none"></div>
        <div className="absolute top-0 bottom-0 right-0 w-64 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none"></div>
      </div>

      <ReviewModal open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen} />
    </section>
  );
}
