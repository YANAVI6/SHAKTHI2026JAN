import React from 'react';
import { X, CheckCircle, AlertCircle, Loader2, Upload, TrendingUp } from 'lucide-react';

interface UploadProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalCases: number;
    uploadedCases: number;
    errorCount: number;
    progress: number;
    isComplete: boolean;
    errors?: Array<{ row: number; error: string; data?: unknown }>;
}

export const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
    isOpen,
    onClose,
    totalCases,
    uploadedCases,
    errorCount,
    progress,
    isComplete,
    errors = []
}) => {
    if (!isOpen) return null;

    const successRate = totalCases > 0 ? Math.round((uploadedCases / totalCases) * 100) : 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden transform transition-all duration-300 scale-100 border border-gray-100">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                {isComplete ? (
                                    <CheckCircle className="w-7 h-7 text-white" />
                                ) : (
                                    <Loader2 className="w-7 h-7 text-white animate-spin" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    {isComplete ? 'Upload Complete!' : 'Uploading Cases...'}
                                </h3>
                                <p className="text-blue-100 text-sm">
                                    {isComplete ? 'Processing finished' : 'Please wait while we process your data'}
                                </p>
                            </div>
                        </div>
                        {isComplete && (
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress Content */}
                <div className="p-6 space-y-6">
                    {/* Main Progress Bar */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700">Overall Progress</span>
                            <span className="font-bold text-blue-600">{Math.round(progress)}%</span>
                        </div>
                        <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        {/* Total Cases */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                            <div className="flex items-center justify-between mb-2">
                                <Upload className="w-5 h-5 text-blue-600" />
                                <div className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                    Total
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-blue-900 mb-1 animate-pulse">
                                {totalCases.toLocaleString()}
                            </div>
                            <div className="text-xs text-blue-600 font-medium">Cases to Upload</div>
                        </div>

                        {/* Uploaded Cases */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                            <div className="flex items-center justify-between mb-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <div className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                    Success
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-green-900 mb-1 transition-all duration-300">
                                {uploadedCases.toLocaleString()}
                            </div>
                            <div className="text-xs text-green-600 font-medium">
                                Uploaded ({successRate}%)
                            </div>
                        </div>

                        {/* Error Count */}
                        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-100">
                            <div className="flex items-center justify-between mb-2">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <div className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
                                    Errors
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-red-900 mb-1 transition-all duration-300">
                                {errorCount.toLocaleString()}
                            </div>
                            <div className="text-xs text-red-600 font-medium">Failed Cases</div>
                        </div>
                    </div>

                    {/* Success Rate Indicator */}
                    {isComplete && (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-700">Success Rate</div>
                                        <div className="text-xs text-gray-500">Upload completion percentage</div>
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-purple-600">{successRate}%</div>
                            </div>
                        </div>
                    )}

                    {/* Error Preview */}
                    {errorCount > 0 && isComplete && (
                        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-red-900 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    Error Summary
                                </h4>
                                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full font-medium">
                                    {errorCount} {errorCount === 1 ? 'error' : 'errors'}
                                </span>
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-2">
                                {errors.slice(0, 3).map((error, index) => (
                                    <div key={index} className="text-sm bg-white rounded-lg p-2 border border-red-100">
                                        <span className="font-medium text-red-800">Row {error.row}:</span>{' '}
                                        <span className="text-red-600">{error.error}</span>
                                    </div>
                                ))}
                                {errorCount > 3 && (
                                    <div className="text-xs text-red-600 text-center py-1">
                                        ... and {errorCount - 3} more errors
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Loading Animation */}
                    {!isComplete && (
                        <div className="flex items-center justify-center space-x-2 text-gray-500 py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                            <span className="text-sm font-medium">Processing batches...</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {isComplete && (
                        <div className="flex justify-end space-x-3 pt-4 border-t">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg font-medium"
                            >
                                {errorCount > 0 ? 'View Details' : 'Done'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
