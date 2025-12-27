import React from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle, StopCircle } from 'lucide-react';
import { Progress } from '../ui/progress';

export interface ProgressModalProps {
  isOpen: boolean;
  title: string;
  operationType: 'assign' | 'unassign' | 'reassign' | 'processing';
  totalItems: number;
  currentItem: number;
  successCount: number;
  errorCount: number;
  currentItemName?: string;
  errors?: Array<{ id: string; name: string; error: string }>;
  onCancel?: () => void;
  onClose?: () => void;
  isComplete?: boolean;
  isCancelling?: boolean;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({
  isOpen,
  title,
  operationType,
  totalItems,
  currentItem,
  successCount,
  errorCount,
  currentItemName,
  errors = [],
  onCancel,
  onClose,
  isComplete = false,
  isCancelling = false
}) => {
  if (!isOpen) return null;

  const progress = totalItems > 0 ? (currentItem / totalItems) * 100 : 0;
  const isProcessing = currentItem < totalItems && !isComplete;

  const getOperationText = () => {
    switch (operationType) {
      case 'assign':
        return 'Assigning';
      case 'unassign':
        return 'Unassigning';
      case 'reassign':
        return 'Reassigning';
      default:
        return 'Processing';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>

        <div className="p-6 space-y-6">
          {isProcessing && (
            <div className="flex items-center gap-3">
              {isCancelling ? (
                <>
                  <StopCircle className="w-6 h-6 text-red-600 animate-pulse" />
                  <div>
                    <p className="font-semibold text-red-600">
                      Cancelling operation...
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Finishing current item, then stopping
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-600">
                      {getOperationText()} case {currentItem} of {totalItems}
                    </p>
                    {currentItemName && (
                      <p className="text-sm text-gray-600 mt-1">{currentItemName}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {isComplete && (
            <div className="flex items-center gap-3">
              {errorCount === 0 ? (
                <>
                  <CheckCircle className="w-8 h-8 text-green-600 animate-in zoom-in duration-300" />
                  <div>
                    <p className="font-semibold text-green-700 text-lg">Operation Completed Successfully!</p>
                    <p className="text-sm text-gray-600">All {totalItems} cases processed</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-8 h-8 text-yellow-600 animate-in zoom-in duration-300" />
                  <div>
                    <p className="font-semibold text-yellow-700 text-lg">Operation Completed with Errors</p>
                    <p className="text-sm text-gray-600">
                      {successCount} succeeded, {errorCount} failed
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium text-gray-700">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" indicatorClassName="bg-blue-600" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
              <div className="text-xs text-gray-600 mt-1">Total Cases</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div className="text-2xl font-bold text-green-700">{successCount}</div>
              </div>
              <div className="text-xs text-green-700 mt-1">Successful</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
              <div className="flex items-center justify-center gap-1">
                <XCircle className="w-5 h-5 text-red-600" />
                <div className="text-2xl font-bold text-red-700">{errorCount}</div>
              </div>
              <div className="text-xs text-red-700 mt-1">Failed</div>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                <h4 className="font-semibold text-red-900 text-sm">Error Details</h4>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {errors.map((error, index) => (
                  <div
                    key={index}
                    className="px-4 py-3 border-b border-red-100 last:border-b-0 hover:bg-red-50/50"
                  >
                    <div className="font-medium text-sm text-gray-900">{error.name}</div>
                    <div className="text-xs text-red-600 mt-1">{error.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {isProcessing && onCancel && (
              <button
                onClick={onCancel}
                disabled={isCancelling}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <StopCircle className="w-5 h-5" />
                {isCancelling ? 'Stopping...' : 'Stop Operation'}
              </button>
            )}
            {isComplete && onClose && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
