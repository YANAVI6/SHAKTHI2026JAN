import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { employeeService } from '../employeeService';
import { supabase } from '../../lib/supabase';
import bcrypt from 'bcryptjs';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            single: vi.fn(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis()
        }))
    }
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed_password')
    }
}));


describe('employeeService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getEmployees', () => {
        it('should return employees', async () => {
            const mockEmployees = [{
                id: 'emp-1',
                tenant_id: 't-1',
                name: 'John',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }];

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockEmployees, error: null })
            }));

            const result = await employeeService.getEmployees('t-1');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('John');
        });
    });

    describe('createEmployee', () => {
        it('should create employee with hashed password', async () => {
            const newEmployee = {
                name: 'Jane',
                mobile: '1234567890',
                empId: 'E001',
                password: 'password123',
                role: 'Telecaller' as const
            };

            const createdEmployee = {
                id: 'emp-2',
                tenant_id: 't-1',
                ...newEmployee,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: createdEmployee, error: null })
            }));

            const result = await employeeService.createEmployee('t-1', null, newEmployee);
            expect(result.id).toBe('emp-2');
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
        });
    });

    describe('updateEmployee', () => {
        it('should update employee details', async () => {
            const updates = { name: 'Jane Doe' };
            const updatedEmployee = { id: 'emp-1', name: 'Jane Doe' };

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: updatedEmployee, error: null })
            }));

            const result = await employeeService.updateEmployee('emp-1', updates);
            expect(result.name).toBe('Jane Doe');
        });
    });

    describe('resetEmployeePassword', () => {
        it('should update password hash', async () => {
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null })
            }));

            const newPassword = await employeeService.resetEmployeePassword('emp-1');
            expect(newPassword).toBeDefined();
            expect(bcrypt.hash).toHaveBeenCalled();
        });
    });
});
