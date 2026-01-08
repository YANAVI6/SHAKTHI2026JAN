import React, { useState } from 'react';
import { Calculator, X, RefreshCw } from 'lucide-react';

interface DiscountCalculatorProps {
    onClose: () => void;
}

export const DiscountCalculator: React.FC<DiscountCalculatorProps> = ({ onClose }) => {
    const [principal, setPrincipal] = useState<string>('');
    const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
    const [discountValue, setDiscountValue] = useState<string>('');
    // Derived state calculation
    const calculateResults = () => {
        const p = parseFloat(principal);
        const d = parseFloat(discountValue);

        if (isNaN(p) || p < 0) {
            return { waiver: null, settlement: null };
        }

        if (isNaN(d) || d < 0) {
            if (discountValue === '') {
                return { waiver: 0, settlement: p };
            }
            return { waiver: 0, settlement: p };
        }

        let waiver = 0;
        let settlement = p;

        if (discountType === 'percent') {
            waiver = p * (d / 100);
            settlement = p - waiver;
        } else {
            waiver = d;
            settlement = p - waiver;
        }

        return {
            waiver: Math.round(waiver * 100) / 100,
            settlement: Math.round(settlement * 100) / 100
        };
    };

    const { waiver: waiverAmount, settlement: settlementAmount } = calculateResults();

    const reset = () => {
        setPrincipal('');
        setDiscountValue('');
        // No need to reset derived state
    };

    return (
        <div className="flex flex-col h-full bg-white text-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex-shrink-0 drag-handle cursor-move">
                <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    <h3 className="font-semibold tracking-wide text-sm">Discount Calculator</h3>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={reset}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                        title="Reset"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 overflow-y-auto space-y-5 bg-gray-50/50">

                {/* Inputs */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Principal Amount (POS)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                            <input
                                type="number"
                                value={principal}
                                onChange={(e) => setPrincipal(e.target.value)}
                                placeholder="0"
                                className="w-full pl-7 pr-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-gray-900"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Discount
                        </label>
                        <div className="flex rounded-xl bg-gray-200 p-1 mb-2">
                            <button
                                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${discountType === 'percent' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setDiscountType('percent')}
                            >
                                Percentage (%)
                            </button>
                            <button
                                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${discountType === 'amount' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setDiscountType('amount')}
                            >
                                Flat Amount (₹)
                            </button>
                        </div>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                                {discountType === 'amount' ? '₹' : '%'}
                            </span>
                            <input
                                type="number"
                                value={discountValue}
                                onChange={(e) => setDiscountValue(e.target.value)}
                                placeholder="0"
                                className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-gray-900"
                            />
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-200 w-full"></div>

                {/* Results */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                        <p className="text-xs text-red-500 font-bold uppercase tracking-wider mb-1">Waived</p>
                        <p className="text-lg font-bold text-red-700">
                            ₹{waiverAmount?.toLocaleString('en-IN') || '0'}
                        </p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                        <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Settlement</p>
                        <p className="text-lg font-bold text-green-700">
                            ₹{settlementAmount?.toLocaleString('en-IN') || '0'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
