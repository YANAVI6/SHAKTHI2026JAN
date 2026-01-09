import React, { useState, useRef } from 'react';
import {
    X,
    Upload,
    Download,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2,
    Search,
    Loader2,
    FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { customerCaseService } from '../../services/customerCaseService';
import { useNotification, notificationHelpers } from '../shared/Notification';

interface CallResponseUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: {
        id: string;
        tenantId: string;
        name: string;
    };
    onSuccess?: () => void;
}

interface RowData {
    loan_id: string;
    call_status: string;
    remarks?: string;
    ptp_date?: string;
    ptp_amount?: number;
}

interface PreviewItem extends RowData {
    customer_name?: string;
    verificationStatus: 'found' | 'not_found' | 'not_assigned' | 'pending';
}

export const CallResponseUploadModal: React.FC<CallResponseUploadModalProps> = ({
    isOpen,
    onClose,
    user,
    onSuccess
}) => {
    const { showNotification } = useNotification();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewData, setPreviewData] = useState<PreviewItem[]>([]);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [step, setStep] = useState<'upload' | 'verify'>('upload');

    if (!isOpen) return null;

    const downloadDemoFile = () => {
        const demoData = [
            {
                loan_id: 'LOAN123456',
                call_status: 'PTP',
                remarks: 'Customer promised to pay by 15th',
                ptp_date: '2026-01-15',
                ptp_amount: 5000
            },
            {
                loan_id: 'LOAN789012',
                call_status: 'RNR',
                remarks: 'Ringing but no response',
                ptp_date: '',
                ptp_amount: 0
            }
        ];

        const ws = XLSX.utils.json_to_sheet(demoData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Call Updates');

        XLSX.writeFile(wb, 'Bulk_Call_Update_Demo.xlsx');

        showNotification(notificationHelpers.success('Demo File Downloaded', 'Use this format for your bulk upload.'));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
        if (fileExt !== 'xlsx' && fileExt !== 'xls' && fileExt !== 'csv') {
            showNotification(notificationHelpers.error('Invalid File', 'Please upload an Excel or CSV file.'));
            return;
        }

        parseFile(selectedFile);
    };

    const parseFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

                if (json.length === 0) {
                    showNotification(notificationHelpers.warning('Empty File', 'The uploaded file contains no data.'));
                    return;
                }

                const mappedData: PreviewItem[] = json.map(row => {
                    const findKey = (keys: string[]) => {
                        const rowKeys = Object.keys(row);
                        return rowKeys.find(rk => keys.includes(rk.toLowerCase().replace(/[\s_]/g, '')));
                    };

                    const loanKey = findKey(['loanid', 'loan_id', 'loannumber']);
                    const statusKey = findKey(['callstatus', 'call_status', 'status']);
                    const remarksKey = findKey(['remarks', 'notes', 'comment']);
                    const ptpDateKey = findKey(['ptpdate', 'ptp_date', 'promise_date']);
                    const ptpAmountKey = findKey(['ptpamount', 'ptp_amount', 'amount']);

                    return {
                        loan_id: String(row[loanKey || 'loan_id'] || ''),
                        call_status: String(row[statusKey || 'call_status'] || ''),
                        remarks: row[remarksKey || 'remarks'] ? String(row[remarksKey || 'remarks']) : undefined,
                        ptp_date: row[ptpDateKey || 'ptp_date'] ? String(row[ptpDateKey || 'ptp_date']) : undefined,
                        ptp_amount: Number(row[ptpAmountKey || 'ptp_amount']) || 0,
                        verificationStatus: 'pending' as const
                    };
                }).filter(item => item.loan_id && item.call_status);

                if (mappedData.length === 0) {
                    showNotification(notificationHelpers.error('Invalid Format', 'Could not find Loan ID and Call Status columns.'));
                    return;
                }

                setPreviewData(mappedData);
                setStep('verify');
            } catch (err) {
                console.error('File parsing error:', err);
                showNotification(notificationHelpers.error('Parsing Error', 'Failed to read the file.'));
            }
        };

        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    };

    const verifyData = async () => {
        setIsVerifying(true);
        try {
            const loanIds = previewData.map(d => d.loan_id);
            const results = await customerCaseService.previewBulkUpdates(user.tenantId, user.id, loanIds);

            const updatedPreview = previewData.map(item => {
                const result = results.find(r => r.loan_id === item.loan_id);
                return {
                    ...item,
                    customer_name: result?.customer_name,
                    verificationStatus: result?.status || 'not_found'
                };
            });

            setPreviewData(updatedPreview);
        } catch (err) {
            console.error('Verification failed:', err);
            showNotification(notificationHelpers.error('Verification Failed', 'Could not verify Loan IDs with the database.'));
        } finally {
            setIsVerifying(false);
        }
    };

    const handleUpload = async () => {
        const validUpdates = previewData.filter(d => d.verificationStatus === 'found');
        if (validUpdates.length === 0) {
            showNotification(notificationHelpers.warning('No Valid Data', 'No records are ready for upload.'));
            return;
        }

        setIsUploading(true);
        try {
            const result = await customerCaseService.bulkUpdateCallResponses(user.tenantId, user.id, validUpdates);

            showNotification(notificationHelpers.success(
                'Upload Complete',
                `Successfully updated ${result.success} cases. ${result.failed} failed.`
            ));

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Upload failed:', err);
            showNotification(notificationHelpers.error('Upload Failed', 'Failed to process bulk updates.'));
        } finally {
            setIsUploading(false);
        }
    };

    const reset = () => {
        setPreviewData([]);
        setStep('upload');
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">

                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <FileSpreadsheet className="w-6 h-6" />
                            Bulk Call Response Update
                        </h3>
                        <p className="text-indigo-100 text-sm mt-1">Update multiple cases at once using Loan IDs</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {step === 'upload' ? (
                        <div className="space-y-8">
                            <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                <div className="p-2 bg-blue-600 rounded-lg text-white">
                                    <Download className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-blue-900">Download Demo File First</h4>
                                    <p className="text-blue-700 text-sm mt-1">
                                        Download our sample format to ensure your Loan IDs and Status codes match correctly.
                                    </p>
                                    <button
                                        onClick={downloadDemoFile}
                                        className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                        Download Demo Excel (.xlsx)
                                    </button>
                                </div>
                            </div>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-3xl p-12 text-center hover:border-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept=".xlsx,.xls,.csv"
                                />
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <Upload className="w-8 h-8 text-gray-400 group-hover:text-indigo-600" />
                                </div>
                                <h4 className="text-lg font-semibold text-gray-900">Click or Drag to Upload</h4>
                                <p className="text-gray-500 mt-2">Support Excel (.xlsx) and CSV files</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-2xl">
                                    <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Required Columns
                                    </h5>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                        <li>• loan_id</li>
                                        <li>• call_status (e.g., PTP, RNR, Callback)</li>
                                    </ul>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl">
                                    <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-orange-500" />
                                        Optional Columns
                                    </h5>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                        <li>• remarks</li>
                                        <li>• ptp_date (YYYY-MM-DD)</li>
                                        <li>• ptp_amount</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-lg font-bold text-gray-900">Verify Matched Cases</h4>
                                    <p className="text-sm text-gray-500">Checking Loan IDs against your assigned cases...</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={reset}
                                        className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        Change File
                                    </button>
                                    <button
                                        onClick={verifyData}
                                        disabled={isVerifying}
                                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                                    >
                                        {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        {isVerifying ? 'Verifying...' : 'Verify with Database'}
                                    </button>
                                </div>
                            </div>

                            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3">Loan ID</th>
                                            <th className="px-4 py-3">Customer</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">PTP</th>
                                            <th className="px-4 py-3">Verification</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {previewData.map((row, idx) => (
                                            <tr key={idx} className="text-sm hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-mono font-medium">{row.loan_id}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {row.customer_name ? (
                                                        <span className="font-medium text-gray-900">{row.customer_name}</span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium text-xs">
                                                        {row.call_status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {row.ptp_date ? (
                                                        <div className="text-xs">
                                                            <p className="font-medium">{row.ptp_date}</p>
                                                            <p className="text-gray-500">₹{row.ptp_amount?.toLocaleString()}</p>
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {row.verificationStatus === 'found' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                                                            <CheckCircle2 className="w-3 h-3" /> Ready
                                                        </span>
                                                    ) : row.verificationStatus === 'not_found' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold" title="Loan ID not found">
                                                            <AlertCircle className="w-3 h-3" /> Missing
                                                        </span>
                                                    ) : row.verificationStatus === 'not_assigned' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold" title="Assigned to someone else">
                                                            <AlertCircle className="w-3 h-3" /> Wrong User
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {step === 'verify' && (
                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                        <div className="flex gap-4 text-sm font-medium">
                            <span className="text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                {previewData.filter(d => d.verificationStatus === 'found').length} Ready
                            </span>
                            <span className="text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {previewData.filter(d => d.verificationStatus !== 'found' && d.verificationStatus !== 'pending').length} Blocked
                            </span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={reset}
                                className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={isUploading || isVerifying || previewData.filter(d => d.verificationStatus === 'found').length === 0}
                                className="flex items-center gap-2 px-8 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200"
                            >
                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {isUploading ? 'Uploading...' : 'Confirm Bulk Update'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
