import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Download, Calendar } from 'lucide-react';
import { ReportService } from '../../../services/reportService';
import { ReportExportService } from '../../../utils/reportExport';
import { ReportFilters } from './ReportFilters';
import { CaseDetailsReportView } from './CaseDetailsReportView';
import { PaymentDetailsReportView } from './PaymentDetailsReportView';
import { PerformanceAnalyticsView } from './PerformanceAnalyticsView';
import { TeamPerformanceView } from './TeamPerformanceView';
import { TelecallerDetailedView } from './TelecallerDetailedView';
import type { ReportFilter, CaseReportData, PaymentReportData, TeamPerformanceData, TelecallerPerformanceData, PerformanceMetrics } from '../../../types/reports';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  userRole: 'super_admin' | 'company_admin' | 'team_incharge' | 'telecaller';
  userId?: string;
  companyName?: string;
  initialTab?: ReportTab;
}

type ReportTab = 'cases' | 'payments' | 'analytics' | 'team' | 'telecaller';

export const ReportsModal: React.FC<ReportsModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  userRole,
  userId,
  companyName,
  initialTab = 'analytics'
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>(initialTab);
  const [filters, setFilters] = useState<ReportFilter>({
    period: 'monthly',
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0]
  });

  const [cases, setCases] = useState<CaseReportData[]>([]);
  const [payments, setPayments] = useState<PaymentReportData[]>([]);
  const [teams, setTeams] = useState<TeamPerformanceData[]>([]);
  const [telecaller, setTelecaller] = useState<TelecallerPerformanceData | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  const canExport = userRole === 'company_admin' || userRole === 'team_incharge' || userRole === 'super_admin';
  const canViewTeams = userRole === 'company_admin' || userRole === 'team_incharge' || userRole === 'super_admin';

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const loadReportData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'cases') {
        const casesData = await ReportService.generateCaseDetailsReport(
          tenantId,
          filters,
          userRole,
          userId
        );
        setCases(casesData);
      } else if (activeTab === 'payments') {
        const paymentsData = await ReportService.generatePaymentReport(
          tenantId,
          filters,
          userRole,
          userId
        );
        setPayments(paymentsData);
      } else if (activeTab === 'analytics') {
        const metricsData = await ReportService.generatePerformanceMetrics(
          tenantId,
          filters,
          userRole,
          userId
        );
        setMetrics(metricsData);
      } else if (activeTab === 'team' && canViewTeams) {
        const teamsData = await ReportService.generateTeamPerformanceReport(tenantId);
        setTeams(teamsData);
      } else if (activeTab === 'telecaller' && userId) {
        const telecallerData = await ReportService.generateTelecallerPerformanceReport(
          tenantId,
          userId
        );
        setTelecaller(telecallerData);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, tenantId, filters, userRole, userId, canViewTeams]);

  useEffect(() => {
    if (isOpen) {
      loadReportData();
    }
  }, [isOpen, filters, activeTab, loadReportData]);

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${activeTab}_report_${timestamp}`;

    try {
      if (format === 'excel') {
        ReportExportService.exportToExcel(
          { cases, payments },
          {
            format: 'excel',
            filename,
            includeCharts: true,
            includeFilters: true,
            companyName,
            reportTitle: `${activeTab.toUpperCase()} Report`
          }
        );
      } else if (format === 'csv') {
        const data = activeTab === 'cases' ? cases : payments;
        ReportExportService.exportToCSV(data, {
          format: 'csv',
          filename,
          includeCharts: false,
          includeFilters: false,
          companyName,
          reportTitle: `${activeTab.toUpperCase()} Report`
        });
      } else if (format === 'pdf' && contentRef.current) {
        await ReportExportService.exportToPDF(contentRef.current, {
          format: 'pdf',
          filename,
          includeCharts: true,
          includeFilters: true,
          companyName,
          reportTitle: `${activeTab.toUpperCase()} Report`
        });
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'analytics' as ReportTab, label: 'Performance Analytics', icon: FileText },
    { id: 'cases' as ReportTab, label: 'Case Details', icon: FileText },
    { id: 'payments' as ReportTab, label: 'Payment Details', icon: FileText },
    ...(canViewTeams ? [{ id: 'team' as ReportTab, label: 'Team Performance', icon: FileText }] : []),
    { id: 'telecaller' as ReportTab, label: userRole === 'telecaller' ? 'My Performance' : 'Telecaller Details', icon: FileText }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-7xl mx-auto my-8">
          <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-xl z-10">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Reports Dashboard</h2>
                  <p className="text-sm text-gray-500">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Generated on {new Date().toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {canExport && (activeTab === 'cases' || activeTab === 'payments') && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExport('excel')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Excel
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      CSV
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 px-6 pb-4 overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            <ReportFilters
              filters={filters}
              onFiltersChange={setFilters}
              showTelecallerFilter={canViewTeams}
              showTeamFilter={canViewTeams}
            />

            <div ref={contentRef} className="mt-6">
              {activeTab === 'cases' && (
                <CaseDetailsReportView cases={cases} isLoading={isLoading} />
              )}

              {activeTab === 'payments' && (
                <PaymentDetailsReportView payments={payments} isLoading={isLoading} />
              )}

              {activeTab === 'analytics' && metrics && (
                <PerformanceAnalyticsView metrics={metrics} isLoading={isLoading} />
              )}

              {activeTab === 'team' && canViewTeams && (
                <TeamPerformanceView teams={teams} isLoading={isLoading} />
              )}

              {activeTab === 'telecaller' && telecaller && (
                <TelecallerDetailedView telecaller={telecaller} isLoading={isLoading} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
