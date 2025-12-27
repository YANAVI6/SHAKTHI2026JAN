import { describe, it, expect, vi, beforeEach } from 'vitest';
import { excelUtils } from '../excelUtils';
import { ColumnConfiguration } from '../../services/columnConfigService';

// Mock XLSX
vi.mock('xlsx', () => ({
    utils: {
        json_to_sheet: vi.fn(),
        book_new: vi.fn(),
        book_append_sheet: vi.fn(),
        sheet_to_json: vi.fn().mockReturnValue([
            ['EMPID', 'Customer Name'],
            ['EMP001', 'Test User']
        ]),
        aoa_to_sheet: vi.fn()
    },
    read: vi.fn().mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} }
    }),
    writeFile: vi.fn()
}));

// Mock FileReader
class MockFileReader {
    onload: ((this: FileReader, ev: ProgressEvent) => void) | null = null;
    onerror: ((this: FileReader, ev: ProgressEvent) => void) | null = null;
    result: ArrayBuffer | null = null;

    readAsArrayBuffer = vi.fn().mockImplementation(function (this: MockFileReader) {
        if (this.onload) {
            this.result = new ArrayBuffer(8);
            setTimeout(() => {
                if (this.onload) {
                    this.onload.call(this as unknown as FileReader, { target: this } as unknown as ProgressEvent);
                }
            }, 0);
        }
    });
}

global.FileReader = MockFileReader as unknown as typeof FileReader;

describe('excelUtils', () => {
    const mockColumns = [
        { column_name: 'customerName', display_name: 'Customer Name', is_active: true } as unknown as ColumnConfiguration
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('parseExcelFile', () => {
        it('should parse an excel file and return rows', async () => {
            const blob = new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const data = await excelUtils.parseExcelFile(blob as File, mockColumns);

            expect(data).toHaveLength(1);
            expect(data[0]).toHaveProperty('EMPID', 'EMP001');
            expect(data[0]).toHaveProperty('customerName', 'Test User');
        });

        it('should throw error on read failure', async () => {
            const blob = new Blob(['test']);
            const mockFileReader = new MockFileReader();
            vi.spyOn(global, 'FileReader').mockImplementation(() => {
                const fr = mockFileReader;
                fr.readAsArrayBuffer = vi.fn().mockImplementation(() => {
                    if (fr.onerror) {
                        fr.onerror.call(fr as unknown as FileReader, { target: { error: new Error('Read error') } } as unknown as ProgressEvent);
                    }
                });
                return fr;
            });

            await expect(excelUtils.parseExcelFile(blob as File, mockColumns)).rejects.toThrow();
        });
    });
});
