import React, { useState, useEffect } from 'react';
import { X, Target, TrendingUp, DollarSign } from 'lucide-react';
import { TelecallerTargetService, TargetInput } from '../../../services/telecallerTargetService';
import { TelecallerTarget } from '../../../types';

interface SetTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  telecallerId: string;
  telecallerName: string;
  teamName: string;
  existingTarget?: TelecallerTarget;
  onSuccess: () => void;
}

export const SetTargetModal: React.FC<SetTargetModalProps> = ({
  isOpen,
  onClose,
  telecallerId,
  telecallerName,
  teamName,
  existingTarget,
  onSuccess
}) => {
  const [formData, setFormData] = useState<TargetInput>({
    daily_calls_target: 0,
    weekly_calls_target: 0,
    monthly_calls_target: 0,
    daily_collections_target: 0,
    weekly_collections_target: 0,
    monthly_collections_target: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && existingTarget) {
      setFormData({
        daily_calls_target: existingTarget.daily_calls_target,
        weekly_calls_target: existingTarget.weekly_calls_target,
        monthly_calls_target: existingTarget.monthly_calls_target,
        daily_collections_target: existingTarget.daily_collections_target,
        weekly_collections_target: existingTarget.weekly_collections_target,
        monthly_collections_target: existingTarget.monthly_collections_target
      });
    } else if (isOpen) {
      setFormData({
        daily_calls_target: 0,
        weekly_calls_target: 0,
        monthly_calls_target: 0,
        daily_collections_target: 0,
        weekly_collections_target: 0,
        monthly_collections_target: 0
      });
    }
    setError(null);
  }, [isOpen, existingTarget]);

  const handleChange = (field: keyof TargetInput, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0) {
      setFormData(prev => ({ ...prev, [field]: numValue }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await TelecallerTargetService.setTarget(telecallerId, formData);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error setting target:', err);
      setError(err instanceof Error ? err.message : 'Failed to set target');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Target className="w-7 h-7" />
                Set Performance Targets
              </h2>
              <p className="text-green-100 mt-1">
                {telecallerName} - {teamName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">Call Targets</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Calls
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.daily_calls_target}
                  onChange={(e) => handleChange('daily_calls_target', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weekly Calls
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.weekly_calls_target}
                  onChange={(e) => handleChange('weekly_calls_target', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Calls
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.monthly_calls_target}
                  onChange={(e) => handleChange('monthly_calls_target', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 1200"
                />
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-green-900">Collection Targets</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Collections (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.daily_collections_target}
                  onChange={(e) => handleChange('daily_collections_target', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 50000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weekly Collections (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.weekly_collections_target}
                  onChange={(e) => handleChange('weekly_collections_target', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 300000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Collections (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthly_collections_target}
                  onChange={(e) => handleChange('monthly_collections_target', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 1200000"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : existingTarget ? 'Update Targets' : 'Set Targets'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
