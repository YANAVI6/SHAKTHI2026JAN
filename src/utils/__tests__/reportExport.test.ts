/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportExportService } from '../reportExport';
import * as XLSX from 'xlsx';

// Mock XLSX
vi.mock('xlsx', () => {
    const mockUtils = {
        book_new: vi.fn(() => ({})),
        json_to_sheet: vi.fn(() => ({})),
        book_append_sheet: vi.fn(),
        sheet_to_csv: vi.fn(() => 'csv,data'),
        sheet_to_json: vi.fn()
    };
    return {
        utils: mockUtils,
        writeFile: vi.fn(),
        read: vi.fn()
    };
});

// Mock URL.createObjectURL if it doesn't exist in jsdom
if (typeof window.URL.createObjectURL === 'undefined') {
    Object.defineProperty(window.URL, 'createObjectURL', { value: vi.fn() });
}

describe('ReportExportService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('exportToExcel', () => {
        it('should create workbook and append sheets', () => {
            const data = {
                cases: [{ loan_id: 'L1' } as unknown as Record<string, unknown>],
                payments: [{ id: 'P1' } as unknown as Record<string, unknown>]
            };

            ReportExportService.exportToExcel(data as any, {
                filename: 'test',
                format: 'excel',
                includeCharts: false,
                includeFilters: false,
                reportTitle: 'Test Report'
            });

            expect(XLSX.utils.book_new).toHaveBeenCalled();
            expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(2); // Cases + Payments
            expect(XLSX.writeFile).toHaveBeenCalled();
        });
    });

    describe('exportToCSV', () => {
        it('should generate csv and trigger download', () => {
            const data = [{ id: '1' } as unknown as Record<string, unknown>];
            const mockLink = { click: vi.fn(), href: '', download: '' };
            vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
            window.URL.createObjectURL = vi.fn().mockReturnValue('blob:url');

            ReportExportService.exportToCSV(data as any, {
                filename: 'test',
                format: 'csv',
                includeCharts: false,
                includeFilters: false,
                reportTitle: 'Test Report'
            });

            expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
            expect(XLSX.utils.sheet_to_csv).toHaveBeenCalled();
            expect(mockLink.click).toHaveBeenCalled();
            expect(mockLink.download).toBe('test.csv');
        });
    });

    describe('exportToPDF', () => {
        it('should open print window and write content', async () => {
            const mockElement = { innerHTML: '<div>Test content</div>' };
            const mockWindow = {
                document: {
                    write: vi.fn(),
                    close: vi.fn()
                },
                print: vi.fn(),
                close: vi.fn()
            };
            vi.spyOn(window, 'open').mockReturnValue(mockWindow as any);
            vi.useFakeTimers();

            await ReportExportService.exportToPDF(mockElement as any, {
                filename: 'test',
                format: 'pdf',
                includeCharts: false,
                includeFilters: false,
                reportTitle: 'Test Report'
            });

            expect(window.open).toHaveBeenCalled();
            expect(mockWindow.document.write).toHaveBeenCalled();
            expect(mockWindow.document.close).toHaveBeenCalled();

            vi.runAllTimers();
            expect(mockWindow.print).toHaveBeenCalled();
            expect(mockWindow.close).toHaveBeenCalled();
            vi.useRealTimers();
        });
    });
});
