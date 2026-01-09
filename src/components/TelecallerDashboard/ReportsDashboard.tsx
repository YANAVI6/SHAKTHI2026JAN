import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TelecallerTargetService } from '../../services/telecallerTargetService';
import { supabase } from '../../lib/supabase';
import { DailyPerformanceCard } from './reports/DailyPerformanceCard';
import { WeeklySummaryCard } from './reports/WeeklySummaryCard';
import { MonthlyReportCard } from './reports/MonthlyReportCard';
import { CollectionsReportCard } from './reports/CollectionsReportCard';
import { Download, FileSpreadsheet, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { customerCaseService } from '../../services/customerCaseService';
import type { TeamInchargeCase } from '../../types/caseManagement';

export const ReportsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [data, setData] = useState({
    daily: { totalCalls: 0, hourlyTrend: [] as number[] },
    weekly: { totalCalls: 0, dailyCalls: [] as number[] },
    monthly: { totalCalls: 0, monthlyTrend: [] as number[] },
    collections: { collectedToday: 0, collectedMonth: 0, targetMonth: 0, progressPercent: 0 }
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        // Fetch targets
        const target = await TelecallerTargetService.getTargetByTelecallerId(user.id);

        // Fetch call logs
        const { data: logs, error } = await supabase
          .from('case_call_logs')
          .select('created_at, amount_collected')
          .eq('employee_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Process Daily (Hourly Trend - Last 8 hours)
        const todayLogs = logs.filter(l => new Date(l.created_at) >= today);
        const last8Hours = new Array(8).fill(0);
        for (let i = 0; i < 8; i++) {
          const hStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
          const hEnd = new Date(now.getTime() - i * 60 * 60 * 1000);
          last8Hours[7 - i] = logs.filter(l => {
            const d = new Date(l.created_at);
            return d >= hStart && d < hEnd;
          }).length;
        }

        // Process Weekly (Current Week Mon-Sun)
        const currentDay = now.getDay(); // 0=Sun, 1=Mon...
        const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - daysSinceMonday);

        const weeklyCalls = new Array(7).fill(0);
        for (let i = 0; i < 7; i++) {
          const dStart = new Date(monday);
          dStart.setDate(monday.getDate() + i);
          const dEnd = new Date(dStart);
          dEnd.setDate(dStart.getDate() + 1);

          weeklyCalls[i] = logs.filter(l => {
            const d = new Date(l.created_at);
            return d >= dStart && d < dEnd;
          }).length;
        }
        const totalWeeklyCalls = weeklyCalls.reduce((a, b) => a + b, 0);

        // Process Monthly (Last 30 days trend)
        const monthlyTrend = new Array(30).fill(0);
        for (let i = 0; i < 30; i++) {
          const dStart = new Date(today);
          dStart.setDate(today.getDate() - (29 - i));
          const dEnd = new Date(dStart);
          dEnd.setDate(dStart.getDate() + 1);

          monthlyTrend[i] = logs.filter(l => {
            const d = new Date(l.created_at);
            return d >= dStart && d < dEnd;
          }).length;
        }
        const totalMonthlyCalls = monthlyTrend.reduce((a, b) => a + b, 0);

        // Collections
        const collectedToday = todayLogs.reduce((sum, log) => sum + (Number(log.amount_collected) || 0), 0);

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthLogs = logs.filter(l => new Date(l.created_at) >= monthStart);
        const collectedMonth = monthLogs.reduce((sum, log) => sum + (Number(log.amount_collected) || 0), 0);

        const targetMonth = target?.monthly_collections_target || 0;
        const progressPercent = targetMonth > 0 ? Math.min(Math.round((collectedMonth / targetMonth) * 100), 100) : 0;

        setData({
          daily: { totalCalls: todayLogs.length, hourlyTrend: last8Hours },
          weekly: { totalCalls: totalWeeklyCalls, dailyCalls: weeklyCalls },
          monthly: { totalCalls: totalMonthlyCalls, monthlyTrend },
          collections: { collectedToday, collectedMonth, targetMonth, progressPercent }
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const downloadReport = async (period: 'daily' | 'weekly' | 'monthly') => {
    if (!user?.id) return;
    setDownloading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      let fileNamePrefix = 'Daily';

      if (period === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        fileNamePrefix = 'Daily';
      } else if (period === 'weekly') {
        const currentDay = now.getDay();
        const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
        startDate = new Date(now);
        startDate.setDate(now.getDate() - daysSinceMonday);
        startDate.setHours(0, 0, 0, 0);
        fileNamePrefix = 'Weekly';
      } else if (period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        fileNamePrefix = 'Monthly';
      }

      const { data: logs, error } = await supabase
        .from('case_call_logs')
        .select(`
          *,
          customer_cases (*)
        `)
        .eq('employee_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!logs || logs.length === 0) {
        alert(`No data found for this ${period} report`);
        setDownloading(false);
        return;
      }

      // Flatten and sanitize data
      const flattenedData = logs.map(log => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const caseData: any = log.customer_cases || {};

        // Helper to safely get nested values (case insensitive checks)
        const getValue = (keys: string[]) => {
          for (const key of keys) {
            // Check top level
            if (caseData[key] !== undefined && caseData[key] !== null && caseData[key] !== '') return caseData[key];

            // Check in case_data
            if (caseData.case_data) {
              if (caseData.case_data[key] !== undefined && caseData.case_data[key]) return caseData.case_data[key];
              if (caseData.case_data[key.toLowerCase()] !== undefined && caseData.case_data[key.toLowerCase()]) return caseData.case_data[key.toLowerCase()];
              if (caseData.case_data[key.toUpperCase()] !== undefined && caseData.case_data[key.toUpperCase()]) return caseData.case_data[key.toUpperCase()];
            }
          }
          return 0; // Default to 0 for numbers
        };

        // Try to find Employment Type in various locations
        let employmentType = '';
        if (caseData.loan_type) employmentType = caseData.loan_type;

        // Deep search for Employment Type
        // User specifically mentioned 'employmentType'
        const empKeys = ['Employment Type', 'EMPLOYMENT TYPE', 'employment_type', 'employmentType'];
        for (const key of empKeys) {
          if (caseData.custom_fields && caseData.custom_fields[key]) {
            employmentType = caseData.custom_fields[key];
            break;
          }
          if (caseData.case_data && caseData.case_data[key]) {
            employmentType = caseData.case_data[key];
            break;
          }
        }

        // Deep search for Outstanding Amount
        // User specifically mentioned 'totalOutstanding'
        const getOutstanding = () => {
          const keys = ['outstanding_amount', 'total_outstanding', 'TOTAL OUTSTANDING', 'total_due', 'pending_dues', 'totalOutstanding'];
          for (const key of keys) {
            if (caseData[key]) return caseData[key];
            if (caseData.case_data) {
              if (caseData.case_data[key]) return caseData.case_data[key];
            }
          }
          return 0;
        };

        // Format dates helper
        const formatDate = (dateStr: string) => {
          if (!dateStr) return '';
          return new Date(dateStr).toLocaleDateString('en-IN');
        };

        // Create custom row with requested columns
        return {
          'EMPID': `${user.name} (${user.empId || user.id})`, // Updated to show Name + ID
          'Customer Name': caseData.customer_name || '',
          'Loan ID': caseData.loan_id || '',
          'Mobile Number': caseData.mobile_no || '',
          'Address': caseData.address || '',
          'DPD': getValue(['dpd', 'DPD']),
          'POS': getValue(['pos_amount', 'pos', 'POS']),
          'EMI': getValue(['emi_amount', 'emi', 'EMI']),
          'TOTAL OUTSTANDING': getOutstanding(),
          'EMPLOYMENT TYPE': employmentType,
          'Payment Link': caseData.payment_link || '',
          'Loan Amount': caseData.loan_amount || 0,
          'Last Payment Date': formatDate(caseData.last_paid_date),
          'Last Payment Amount': caseData.last_paid_amount || 0,
          'Loan Created At': formatDate(caseData.created_at),
          'Call Status': log.call_status || '',
          'Status Remarks': log.call_notes || '',
          'PTP Date': log.ptp_datetime ? formatDate(log.ptp_datetime) : '',
          'Total Collected Amount': log.amount_collected || 0
        };
      });

      const ws = XLSX.utils.json_to_sheet(flattenedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, `Telecaller_${fileNamePrefix}_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Performance Reports</h2>
        <p className="text-gray-600">View your personal performance analytics and insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <DailyPerformanceCard data={data.daily} />
        <WeeklySummaryCard data={data.weekly} />
        <MonthlyReportCard data={data.monthly} />
        <CollectionsReportCard data={data.collections} />
      </div>

      {/* Download Reports Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-green-100 rounded-lg mr-3">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Download Detailed Reports</h3>
            <p className="text-sm text-gray-600">Export your activity logs and case details</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => downloadReport('daily')}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Daily Report
          </button>
          <button
            onClick={() => downloadReport('weekly')}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Weekly Report
          </button>
          <button
            onClick={() => downloadReport('monthly')}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Monthly Report
          </button>
          {downloading && <span className="text-sm text-gray-500 self-center animate-pulse">Generating report...</span>}
        </div>
      </div>

      {/* Download Retained Cases Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-purple-100 rounded-lg mr-3">
            <RotateCcw className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Retained Cases Report</h3>
            <p className="text-sm text-gray-600">Export cases marked for retention (next month payment)</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={async () => {
              if (!user?.id || !user?.tenantId) return;
              setDownloading(true);
              try {
                const retainedCases = await customerCaseService.getRetainedCases(user.tenantId, user.id);

                if (retainedCases.length === 0) {
                  alert('No retained cases found to download');
                  return;
                }

                // Flatten and sanitize data for Excel
                const flattenedData = retainedCases.map(caseData => {
                  const getValue = (keys: string[]) => {
                    for (const key of keys) {
                      if (caseData[key as keyof TeamInchargeCase] !== undefined && caseData[key as keyof TeamInchargeCase] !== null && caseData[key as keyof TeamInchargeCase] !== '') return String(caseData[key as keyof TeamInchargeCase]);
                      const nested = (caseData.case_data as Record<string, unknown> || {});
                      if (nested[key] !== undefined && nested[key] !== null && nested[key] !== '') return String(nested[key]);
                    }
                    return '0';
                  };

                  return {
                    'Customer Name': caseData.customer_name || '',
                    'Loan ID': caseData.loan_id || '',
                    'Mobile Number': caseData.mobile_no || '',
                    'Outstanding Amount': caseData.outstanding_amount || getValue(['totalOutstanding', 'outstanding_amount']),
                    'DPD': caseData.dpd || 0,
                    'Last Paid Date': caseData.last_paid_date ? new Date(caseData.last_paid_date).toLocaleDateString() : '',
                    'Retention Date': caseData.updated_at ? new Date(caseData.updated_at).toLocaleDateString() : '',
                    'Current Status': caseData.case_status || 'assigned'
                  };
                });

                const ws = XLSX.utils.json_to_sheet(flattenedData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Retained Cases");
                XLSX.writeFile(wb, `Retained_Cases_${new Date().toISOString().split('T')[0]}.xlsx`);

              } catch (error) {
                console.error('Error downloading retained report:', error);
                alert('Failed to download report');
              } finally {
                setDownloading(false);
              }
            }}
            disabled={downloading}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            <Download className="w-5 h-5" />
            Download Retained Cases (Excel)
          </button>
        </div>
      </div>
    </div>
  );
};