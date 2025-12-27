import React from 'react';
import { X, MessageCircle, Phone } from 'lucide-react';
import { CustomerCase } from './types';

interface WhatsAppModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseData: CustomerCase | null;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose, caseData }) => {
    if (!isOpen || !caseData) return null;

    const getAllMobileNumbers = () => {
        const numbers: { label: string; value: string }[] = [];

        // Primary mobile number
        if (caseData.mobileNo) {
            numbers.push({ label: 'Primary Mobile', value: caseData.mobileNo });
        }

        // Alternate number if exists exactly in the type
        if (caseData.alternateNumber) {
            numbers.push({ label: 'Alternate Number', value: caseData.alternateNumber });
        }

        // Additional numbers from custom_fields
        const customFields = (caseData.custom_fields || {}) as Record<string, unknown>;
        Object.entries(customFields).forEach(([key, value]) => {
            const normalizedKey = key.toLowerCase();
            if ((normalizedKey.includes('mobile') || normalizedKey.includes('phone')) && value) {
                numbers.push({ label: key, value: String(value) });
            }
        });

        // Numbers from case_data (sometimes imported from Excel)
        const case_data = (caseData.case_data || {}) as Record<string, unknown>;
        Object.entries(case_data).forEach(([key, value]) => {
            const normalizedKey = key.toLowerCase();
            if ((normalizedKey.includes('mobile') || normalizedKey.includes('phone')) && value) {
                // Avoid duplicates if already added
                if (!numbers.some(n => n.value === String(value))) {
                    numbers.push({ label: key, value: String(value) });
                }
            }
        });

        return numbers;
    };

    const mobileNumbers = getAllMobileNumbers();

    const getWhatsAppLink = (number: string) => {
        // Clean all non-digits
        const cleaned = number.replace(/\D/g, '');
        // If 10 digits, add country code 91
        const finalNumber = cleaned.length === 10 ? `91${cleaned}` : cleaned;
        return `https://wa.me/${finalNumber}`;
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all animate-in zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="bg-white/20 p-2 rounded-lg mr-3">
                            <MessageCircle className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Select WhatsApp Number</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors focus:outline-none"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-6">
                        Choose a mobile number to start a chat on WhatsApp with <strong>{caseData.customerName || 'Customer'}</strong>.
                    </p>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {mobileNumbers.length > 0 ? (
                            mobileNumbers.map((num, index) => (
                                <a
                                    key={index}
                                    href={getWhatsAppLink(num.value)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-200 rounded-xl transition-all group"
                                    onClick={onClose}
                                >
                                    <div className="flex items-center">
                                        <div className="bg-white p-2 rounded-lg mr-4 border border-gray-100 group-hover:border-green-100 shadow-sm group-hover:shadow transition-all text-green-600">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                                                {num.label}
                                            </div>
                                            <div className="text-base font-bold text-gray-900 group-hover:text-green-700 transition-colors">
                                                {num.value}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-green-500 text-white p-2 rounded-full transform group-hover:scale-110 group-hover:rotate-12 transition-all shadow-md group-hover:shadow-lg">
                                        <MessageCircle className="w-5 h-5 fill-current" />
                                    </div>
                                </a>
                            ))
                        ) : (
                            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Phone className="w-8 h-8 text-gray-400" />
                                </div>
                                <p className="text-gray-500 font-medium">No mobile numbers found</p>
                                <p className="text-xs text-gray-400 mt-1">Add a number to use WhatsApp feature</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex space-x-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors focus:outline-none"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
