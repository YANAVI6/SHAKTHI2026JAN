import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle2, Building2, Phone, MapPin, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EnquiryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function EnquiryModal({ isOpen, onClose }: EnquiryModalProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        contactNumber: '',
        address: '',
        pincode: '',
        remarks: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Artificial delay to show smooth loading state if network is too fast
            // await new Promise(resolve => setTimeout(resolve, 800));

            // Combine address and pincode for storage if schema doesn't have pincode column
            // Or ideally store strictly if we updated schema. reliable fallback is concatenation.
            const fullAddress = formData.pincode
                ? `${formData.address}, Pincode: ${formData.pincode}`
                : formData.address;

            const { error: insertError } = await supabase
                .from('enquiries')
                .insert([
                    {
                        name: formData.name,
                        company_name: formData.companyName,
                        contact_number: formData.contactNumber,
                        address: fullAddress,
                        remarks: formData.remarks,
                        status: 'new'
                    }
                ]);

            if (insertError) throw insertError;

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setFormData({
                    name: '',
                    companyName: '',
                    contactNumber: '',
                    address: '',
                    pincode: '',
                    remarks: ''
                });
                onClose();
            }, 3000);

        } catch (err: unknown) {
            console.error('Error submitting enquiry:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to submit enquiry. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const formFields = [
        { id: 'name', label: 'Full Name', icon: User, type: 'text', placeholder: 'John Doe', required: true },
        { id: 'companyName', label: 'Company Name', icon: Building2, type: 'text', placeholder: 'Acme Corp', required: true },
        { id: 'contactNumber', label: 'Contact Number', icon: Phone, type: 'tel', placeholder: '+91 98765 43210', required: true },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden bg-transparent border-none shadow-2xl">
                <div className="flex flex-col md:flex-row bg-white rounded-2xl overflow-hidden h-[600px]">
                    {/* Left Panel - Branding */}
                    <div className="hidden md:flex w-2/5 bg-gradient-to-br from-indigo-600 to-blue-700 p-8 flex-col justify-between text-white relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                        <div className="absolute -bottom-24 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute top-10 right-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl"></div>

                        <div className="relative z-10">
                            <h2 className="text-3xl font-display font-bold mb-4">Transform Your Collections</h2>
                            <p className="text-indigo-100/90 text-lg leading-relaxed">
                                Join hundreds of companies recovering more with Shakthi's AI-powered platform.
                            </p>
                        </div>

                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-4 text-sm font-medium text-indigo-100">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <span className="flex-1">Smart Auto-dialing</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm font-medium text-indigo-100">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <span className="flex-1">Real-time Analytics</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm font-medium text-indigo-100">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <span className="flex-1">Data Security First</span>
                            </div>
                        </div>

                        <div className="relative z-10 text-xs text-indigo-200 mt-8">
                            © 2024 Shakthi Tech. All rights reserved.
                        </div>
                    </div>

                    {/* Right Panel - Form */}
                    <div className="flex-1 bg-white p-8 overflow-y-auto relative">
                        <AnimatePresence mode="wait">
                            {success ? (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="h-full flex flex-col items-center justify-center text-center p-6"
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", damping: 15, delay: 0.1 }}
                                        className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"
                                    >
                                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                                    </motion.div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Request Sent!</h3>
                                    <p className="text-gray-500 max-w-xs">
                                        We've received your enquiry. Our team will contact you within 24 hours.
                                    </p>
                                    <Button onClick={onClose} variant="outline" className="mt-8">
                                        Close
                                    </Button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="form"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex flex-col"
                                >
                                    <div className="mb-8 md:hidden">
                                        <h2 className="text-2xl font-bold text-gray-900">Get Started</h2>
                                        <p className="text-gray-500 text-sm">Fill in your details to begin.</p>
                                    </div>

                                    <div className="hidden md:block mb-8">
                                        <h2 className="text-2xl font-bold text-gray-900">Let's Get Started</h2>
                                        <p className="text-gray-500">Tell us a bit about yourself and your company.</p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
                                        {/* Input Fields with specific icons */}
                                        {formFields.map((field, idx) => (
                                            <motion.div
                                                key={field.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="space-y-1.5"
                                            >
                                                <Label htmlFor={field.id} className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                    {field.label} {field.required && <span className="text-indigo-600">*</span>}
                                                </Label>
                                                <div className="relative">
                                                    <div className="absolute left-3 top-2.5 text-gray-400">
                                                        <field.icon className="w-5 h-5" />
                                                    </div>
                                                    <Input
                                                        id={field.id}
                                                        name={field.id}
                                                        type={field.type}
                                                        value={formData[field.id as keyof typeof formData]}
                                                        onChange={handleChange}
                                                        required={field.required}
                                                        placeholder={field.placeholder}
                                                        className="pl-10 h-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-indigo-500 transition-all rounded-lg"
                                                    />
                                                </div>
                                            </motion.div>
                                        ))}

                                        <div className="grid grid-cols-2 gap-4">
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 }}
                                                className="space-y-1.5"
                                            >
                                                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                    City/State
                                                </Label>
                                                <div className="relative">
                                                    <div className="absolute left-3 top-2.5 text-gray-400">
                                                        <MapPin className="w-5 h-5" />
                                                    </div>
                                                    <Input
                                                        name="address"
                                                        value={formData.address}
                                                        onChange={handleChange}
                                                        placeholder="City/State"
                                                        className="pl-10 h-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-indigo-500 transition-all rounded-lg"
                                                    />
                                                </div>
                                            </motion.div>

                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.35 }}
                                                className="space-y-1.5"
                                            >
                                                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                    Pincode
                                                </Label>
                                                <div className="relative">
                                                    <div className="absolute left-3 top-2.5 text-gray-400">
                                                        <MapPin className="w-5 h-5" />
                                                    </div>
                                                    <Input
                                                        name="pincode"
                                                        value={formData.pincode}
                                                        onChange={handleChange}
                                                        placeholder="000 000"
                                                        className="pl-10 h-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-indigo-500 transition-all rounded-lg"
                                                    />
                                                </div>
                                            </motion.div>
                                        </div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 }}
                                            className="space-y-1.5"
                                        >
                                            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                Remarks
                                            </Label>
                                            <div className="relative">
                                                <Textarea
                                                    name="remarks"
                                                    value={formData.remarks}
                                                    onChange={handleChange}
                                                    placeholder="Optional notes"
                                                    className="min-h-[100px] bg-gray-50 border-gray-200 focus:bg-white focus:border-indigo-500 transition-all rounded-lg resize-none"
                                                />
                                            </div>
                                        </motion.div>

                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                                {error}
                                            </motion.div>
                                        )}

                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <Button
                                                type="submit"
                                                className="w-full h-11 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] text-base"
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <span className="flex items-center gap-2">
                                                        <Loader2 className="h-5 w-5 animate-spin" />
                                                        Sending Details...
                                                    </span>
                                                ) : (
                                                    "Submit Enquiry"
                                                )}
                                            </Button>
                                            <p className="text-xs text-center text-gray-400 mt-3">
                                                By clicking submit, you agree to our Terms & Privacy Policy.
                                            </p>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
