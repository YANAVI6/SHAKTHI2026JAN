import { supabase } from '../lib/supabase';

export interface PerformanceStats {
    totalCases: number;
    totalPOS: number;
    totalCollected: number;
    statusDistribution: {
        status: string;
        count: number;
        percentage: number;
    }[];
}

export class AnalyticsService {
    /**
     * Get aggregated performance stats for a tenant, optionally filtered by team or employee
     */
    static async getPerformanceStats(
        tenantId: string,
        teamId?: string,
        employeeId?: string
    ): Promise<PerformanceStats> {
        try {
            const { data, error } = await supabase.rpc('get_performance_stats_v3', {
                p_tenant_id: tenantId,
                p_team_id: teamId === 'all' ? null : teamId,
                p_telecaller_id: employeeId === 'all' ? null : employeeId
            });

            if (error) {
                console.error('Error calling get_performance_stats_v3:', error);
                throw error;
            }

            // The RPC returns { totalCases, totalCollected, statusDistribution: [{status, count}, ...] }
            const totalCases = data.totalCases || 0;
            const statusDistribution = (data.statusDistribution || []).map((item: any) => ({
                status: item.status,
                count: item.count,
                percentage: totalCases > 0 ? Math.round((item.count / totalCases) * 100) : 0
            })).sort((a: any, b: any) => b.count - a.count);

            return {
                totalCases,
                totalPOS: 0,
                totalCollected: Number(data.totalCollected || 0),
                statusDistribution
            };

        } catch (error) {
            console.error('AnalyticsService.getPerformanceStats error:', error);
            return {
                totalCases: 0,
                totalPOS: 0,
                totalCollected: 0,
                statusDistribution: []
            };
        }
    }
}
