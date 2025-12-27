import { describe, it, expect } from 'vitest';
import { mapServiceCaseToDashboardCase } from '../caseMapper';
import { CustomerCase } from '../../services/customerCaseService';

describe('caseMapper', () => {
    describe('mapServiceCaseToDashboardCase', () => {
        it('should map core fields correctly', () => {
            const serviceCase: Record<string, unknown> = {
                id: 'c-1',
                customer_name: 'John',
                loan_id: 'L-1',
                outstanding_amount: '1000'
            };

            const result = mapServiceCaseToDashboardCase(serviceCase as unknown as CustomerCase);
            expect(result.id).toBe('c-1');
            expect(result.customerName).toBe('John');
            expect(result.loanId).toBe('L-1');
            expect(result.outstandingAmount).toBe('1000');
        });

        it('should fallback to case_data for missing fields', () => {
            const serviceCase: Record<string, unknown> = {
                id: 'c-2',
                case_data: {
                    'Customer Name': 'Jane',
                    'Loan ID': 'L-2',
                    'Mobile Number': '999'
                }
            };

            const result = mapServiceCaseToDashboardCase(serviceCase as unknown as CustomerCase);
            expect(result.customerName).toBe('Jane');
            expect(result.loanId).toBe('L-2');
            expect(result.mobileNo).toBe('999');
        });

        it('should handle relations (team, telecaller)', () => {
            const serviceCase: Record<string, unknown> = {
                id: 'c-3',
                team: { name: 'Team A' },
                telecaller: { name: 'Tel B' }
            };
            const result = mapServiceCaseToDashboardCase(serviceCase as unknown as CustomerCase);
            expect(result.teamName).toBe('Team A');
            expect(result.telecallerName).toBe('Tel B');
        });
    });
});
