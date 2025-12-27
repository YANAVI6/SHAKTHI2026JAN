import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from '../useFileUpload';

describe('useFileUpload', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
        vi.spyOn(window, 'alert').mockImplementation(() => { });
    });

    it('should handle file selection and validation', () => {
        const { result } = renderHook(() => useFileUpload());

        const mockFile = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const event = {
            target: {
                files: [mockFile]
            }
        } as unknown as React.ChangeEvent<HTMLInputElement>;

        act(() => {
            result.current.handleFileSelect(event);
        });

        expect(result.current.file).toBe(mockFile);
        expect(result.current.status).toBe('File selected successfully');
    });

    it('should alert on invalid file extension', () => {
        const { result } = renderHook(() => useFileUpload());

        const mockFile = new File([''], 'test.png', { type: 'image/png' });
        const event = {
            target: {
                files: [mockFile]
            }
        } as unknown as React.ChangeEvent<HTMLInputElement>;

        act(() => {
            result.current.handleFileSelect(event);
        });

        expect(window.alert).toHaveBeenCalledWith('Please select an Excel file');
        expect(result.current.file).toBeNull();
    });

    it('should upload file successfully', async () => {
        const { result } = renderHook(() => useFileUpload());
        const mockFile = new File([''], 'test.xlsx');

        act(() => {
            result.current.handleFileSelect({ target: { files: [mockFile] } } as unknown as React.ChangeEvent<HTMLInputElement>);
        });

        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: true })
        } as Response);

        let uploadResult;
        await act(async () => {
            uploadResult = await result.current.uploadFile('http://upload.com');
        });

        expect(uploadResult).toEqual({ success: true });
        expect(result.current.status).toBe('Upload successful');
        expect(window.alert).toHaveBeenCalledWith('File uploaded successfully');
    });

    it('should handle upload error', async () => {
        const { result } = renderHook(() => useFileUpload());
        const mockFile = new File([''], 'test.xlsx');

        act(() => {
            result.current.handleFileSelect({ target: { files: [mockFile] } } as unknown as React.ChangeEvent<HTMLInputElement>);
        });

        vi.mocked(global.fetch).mockResolvedValue({
            ok: false
        } as Response);

        await act(async () => {
            await result.current.uploadFile('http://upload.com');
        });

        expect(result.current.status).toContain('Error');
        expect(window.alert).toHaveBeenCalledWith('Upload failed');
    });
});
