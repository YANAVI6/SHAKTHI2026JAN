import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Star, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import ConfettiExplosion from 'react-confetti-explosion';

interface ReviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ReviewModal({ open, onOpenChange }: ReviewModalProps) {
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        role: '',
        company: '',
        content: '',
        rating: 5
    });
    const [hoverRating, setHoverRating] = useState(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('testimonials')
                .insert([
                    {
                        name: formData.name,
                        role: formData.role,
                        company: formData.company,
                        content: formData.content,
                        rating: formData.rating,
                        approved: false
                    }
                ]);

            if (error) throw error;
            setSubmitted(true);
            setTimeout(() => {
                onOpenChange(false);
                setSubmitted(false);
                setFormData({ name: '', role: '', company: '', content: '', rating: 5 });
            }, 3500);

        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Failed to submit review. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[2rem]">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                <AnimatePresence mode="wait">
                    {submitted ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex flex-col items-center justify-center p-12 text-center bg-gradient-to-b from-white to-gray-50 min-h-[400px]"
                        >
                            <ConfettiExplosion force={0.8} duration={3000} particleCount={250} width={1600} />
                            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-6 shadow-green-200 shadow-lg">
                                <CheckCircle2 className="w-12 h-12 text-green-600" />
                            </div>
                            <DialogTitle className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Review Submitted!</DialogTitle>
                            <DialogDescription className="text-lg text-gray-600 max-w-xs mx-auto">
                                Thank you for your feedback. We'll review it shortly before publishing.
                            </DialogDescription>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="p-8 pb-0">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <DialogTitle className="text-2xl font-bold text-gray-900 tracking-tight">Write a Review</DialogTitle>
                                        <DialogDescription className="text-gray-500 mt-1">
                                            How was your experience with Shakthi?
                                        </DialogDescription>
                                    </div>
                                </div>
                            </div>

                            <div className="px-8 pb-8">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Rating Section */}
                                    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border border-gray-100 mb-6">
                                        <Label className="text-gray-500 font-medium mb-3 uppercase tracking-wider text-xs">Tap to Rate</Label>
                                        <div className="flex gap-2" onMouseLeave={() => setHoverRating(0)}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <motion.button
                                                    key={star}
                                                    type="button"
                                                    whileHover={{ scale: 1.2 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onMouseEnter={() => setHoverRating(star)}
                                                    onClick={() => setFormData({ ...formData, rating: star })}
                                                    className="focus:outline-none transition-transform"
                                                >
                                                    <Star
                                                        className={`w-10 h-10 transition-colors duration-200 ${star <= (hoverRating || formData.rating)
                                                            ? 'fill-amber-400 text-amber-400 drop-shadow-md'
                                                            : 'fill-gray-200 text-gray-200'
                                                            }`}
                                                    />
                                                </motion.button>
                                            ))}
                                        </div>
                                        <p className="h-5 mt-2 text-sm font-medium text-indigo-600">
                                            {hoverRating === 5 || (hoverRating === 0 && formData.rating === 5) ? "Excellent!" :
                                                hoverRating === 4 || (hoverRating === 0 && formData.rating === 4) ? "Very Good" :
                                                    hoverRating === 3 || (hoverRating === 0 && formData.rating === 3) ? "Good" :
                                                        hoverRating === 2 || (hoverRating === 0 && formData.rating === 2) ? "Fair" :
                                                            hoverRating === 1 || (hoverRating === 0 && formData.rating === 1) ? "Poor" : ""}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Full Name</Label>
                                            <Input
                                                id="name"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="e.g. Rahul Sharma"
                                                className="h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="company" className="text-sm font-semibold text-gray-700">Company</Label>
                                            <Input
                                                id="company"
                                                required
                                                value={formData.company}
                                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                                placeholder="e.g. FinTech One"
                                                className="h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="role" className="text-sm font-semibold text-gray-700">Job Title</Label>
                                        <Input
                                            id="role"
                                            required
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            placeholder="e.g. Collection Head"
                                            className="h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="content" className="text-sm font-semibold text-gray-700">Your Review</Label>
                                        <Textarea
                                            id="content"
                                            required
                                            value={formData.content}
                                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                            placeholder="Share your experience working with Shakthi..."
                                            rows={4}
                                            className="min-h-[120px] rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium resize-none text-base"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-12 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 hover:text-gray-900">
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={loading} className="flex-[2] h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Review"}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}
