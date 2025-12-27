import React from 'react';
import { X, AlertCircle, Download, FileText, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface UploadError {
    row: number;
    error: string;
    data?: unknown;
}

interface UploadErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalRows: number;
    successCount: number;
    failureCount: number;
    errors: UploadError[];
    onRetry?: () => void;
}

export const UploadErrorModal: React.FC<UploadErrorModalProps> = ({
    isOpen,
    onClose,
    totalRows,
    successCount,
    failureCount,
    errors,
    onRetry
}) => {
    if (!isOpen) return null;

    const handleDownloadErrorReport = () => {
        // Group errors by error message
        const errorGroups = new Map<string, number[]>();
        errors.forEach(err => {
            const msg = err.error;
            if (!errorGroups.has(msg)) {
                errorGroups.set(msg, []);
            }
            errorGroups.get(msg)!.push(err.row);
        });

        // Create error report data
        const reportData = Array.from(errorGroups.entries()).map(([error, rows]) => ({
            'Error Message': error,
            'Affected Rows': rows.join(', '),
            'Count': rows.length,
            'First Row': rows[0],
            'Last Row': rows[rows.length - 1]
        }));

        // Create detailed error list
        const detailedErrors = errors.map(err => ({
            'Row Number': err.row,
            'Error Message': err.error,
            'Data': JSON.stringify(err.data || {})
        }));

        // Create workbook with multiple sheets
        const wb = XLSX.utils.book_new();

        // Summary sheet
        const summaryData = [
            { Metric: 'Total Rows', Value: totalRows },
            { Metric: 'Successful Uploads', Value: successCount },
            { Metric: 'Failed Uploads', Value: failureCount },
            { Metric: 'Success Rate', Value: `${((successCount / totalRows) * 100).toFixed(2)}%` },
            { Metric: 'Failure Rate', Value: `${((failureCount / totalRows) * 100).toFixed(2)}%` }
        ];
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

        // Error groups sheet
        const groupsSheet = XLSX.utils.json_to_sheet(reportData);
        XLSX.utils.book_append_sheet(wb, groupsSheet, 'Error Groups');

        // Detailed errors sheet
        const detailsSheet = XLSX.utils.json_to_sheet(detailedErrors);
        XLSX.utils.book_append_sheet(wb, detailsSheet, 'Detailed Errors');

        // Download
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        XLSX.writeFile(wb, `upload_error_report_${timestamp}.xlsx`);
    };

    // Group errors by type
    const errorGroups = new Map<string, number[]>();
    errors.forEach(err => {
        const msg = err.error;
        if (!errorGroups.has(msg)) {
            errorGroups.set(msg, []);
        }
        errorGroups.get(msg)!.push(err.row);
    });

    const sortedErrorGroups = Array.from(errorGroups.entries())
        .sort((a, b) => b[1].length - a[1].length);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-red-50 to-orange-50">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900">Upload Completed with Errors</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                {successCount} succeeded, {failureCount} failed out of {totalRows} total rows
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Stats Bar */}
                <div className="p-6 bg-gray-50 border-b">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Rows</p>
                                    <p className="text-2xl font-bold text-gray-900">{totalRows}</p>
                                </div>
                                <FileText className="w-8 h-8 text-gray-400" />
                            </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-700">Successful</p>
                                    <p className="text-2xl font-bold text-green-900">{successCount}</p>
                                </div>
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-red-700">Failed</p>
                                    <p className="text-2xl font-bold text-red-900">{failureCount}</p>
                                </div>
                                <AlertCircle className="w-8 h-8 text-red-500" />
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Success Rate</span>
                            <span>{((successCount / totalRows) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${(successCount / totalRows) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Error Groups */}
                <div className="flex-1 overflow-y-auto p-6">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                        Error Summary ({sortedErrorGroups.length} unique error types)
                    </h4>

                    <div className="space-y-3">
                        {sortedErrorGroups.map(([errorMsg, rows], index) => (
                            <div
                                key={index}
                                className="bg-red-50 border border-red-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center mb-2">
                                            <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
                                                {rows.length} {rows.length === 1 ? 'row' : 'rows'}
                                            </span>
                                            <span className="ml-2 text-sm text-red-700 font-medium">
                                                Error #{index + 1}
                                            </span>
                                        </div>
                                        <p className="text-sm text-red-900 font-medium mb-2">{errorMsg}</p>
                                        <div className="text-xs text-red-700">
                                            <span className="font-semibold">Affected rows:</span>{' '}
                                            {rows.length <= 10 ? (
                                                rows.join(', ')
                                            ) : (
                                                <>
                                                    {rows.slice(0, 10).join(', ')}
                                                    <span className="ml-1 text-red-600">
                                                        ... and {rows.length - 10} more
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Common Solutions */}
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="font-semibold text-blue-900 mb-2">💡 Common Solutions</h5>
                        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                            <li>Ensure all required fields (Loan ID, Customer Name) are filled</li>
                            <li>Check for duplicate Loan IDs in your Excel file</li>
                            <li>Verify that the product and team are correctly selected</li>
                            <li>Make sure date fields are in the correct format (YYYY-MM-DD)</li>
                            <li>Ensure numeric fields contain only numbers</li>
                            <li>Contact support if the error persists</li>
                        </ul>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                    <button
                        onClick={handleDownloadErrorReport}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download Error Report
                    </button>
                    <div className="flex space-x-3">
                        {onRetry && failureCount > 0 && (
                            <button
                                onClick={onRetry}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                            >
                                Retry Failed Rows
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
