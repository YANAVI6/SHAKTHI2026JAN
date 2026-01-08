import { supabase } from '../lib/supabase';

export interface TelecallerTarget {
  id: string;
  telecaller_id: string;
  daily_calls_target: number;
  weekly_calls_target: number;
  monthly_calls_target: number;
  daily_collections_target: number;
  weekly_collections_target: number;
  monthly_collections_target: number;
  created_at: string;
  updated_at: string;
}

export interface TargetInput {
  daily_calls_target: number;
  weekly_calls_target: number;
  monthly_calls_target: number;
  daily_collections_target: number;
  weekly_collections_target: number;
  monthly_collections_target: number;
}

export interface PerformanceMetrics {
  dailyCalls: number;
  weeklyCalls: number;
  monthlyCalls: number;
  dailyCollections: number;
  weeklyCollections: number;
  monthlyCollections: number;
}

const TARGETS_TABLE = 'telecaller_targets';
const CALL_LOGS_TABLE = 'case_call_logs';

export const TelecallerTargetService = {
  async getTargetByTelecallerId(telecallerId: string): Promise<TelecallerTarget | null> {
    try {
      const { data, error } = await supabase
        .from(TARGETS_TABLE)
        .select('*')
        .eq('telecaller_id', telecallerId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching target:', error);
        throw new Error(`Failed to fetch target: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in getTargetByTelecallerId:', error);
      throw error;
    }
  },

  async getTargetsForTeam(_teamId: string, telecallerIds: string[]): Promise<TelecallerTarget[]> {
    if (telecallerIds.length === 0) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from(TARGETS_TABLE)
        .select('*')
        .in('telecaller_id', telecallerIds);

      if (error) {
        console.error('Error fetching team targets:', error);
        throw new Error(`Failed to fetch team targets: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTargetsForTeam:', error);
      throw error;
    }
  },

  async setTarget(telecallerId: string, targetData: TargetInput): Promise<TelecallerTarget> {
    try {
      const existing = await this.getTargetByTelecallerId(telecallerId);

      if (existing) {
        const { data, error } = await supabase
          .from(TARGETS_TABLE)
          .update({
            ...targetData,
            updated_at: new Date().toISOString()
          })
          .eq('telecaller_id', telecallerId)
          .select()
          .single();

        if (error) {
          console.error('Error updating target:', error);
          throw new Error(`Failed to update target: ${error.message}`);
        }

        return data;
      } else {
        const { data, error } = await supabase
          .from(TARGETS_TABLE)
          .insert({
            telecaller_id: telecallerId,
            ...targetData
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating target:', error);
          throw new Error(`Failed to create target: ${error.message}`);
        }

        return data;
      }
    } catch (error) {
      console.error('Error in setTarget:', error);
      throw error;
    }
  },

  async deleteTarget(telecallerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TARGETS_TABLE)
        .delete()
        .eq('telecaller_id', telecallerId);

      if (error) {
        console.error('Error deleting target:', error);
        throw new Error(`Failed to delete target: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteTarget:', error);
      throw error;
    }
  },

  async getPerformanceMetrics(telecallerId: string): Promise<PerformanceMetrics> {
    try {
      const now = new Date();

      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();

      const currentDay = now.getDay();
      const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday, 0, 0, 0, 0).toISOString();

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();

      // Use a more efficient approach: Fetch only the necessary logs with pagination if needed
      // Actually, for daily/weekly/monthly metrics, we can use separate count/sum queries

      const [
        { count: dailyCallsCount },
        { count: weeklyCallsCount },
        { count: monthlyCallsCount }
      ] = await Promise.all([
        supabase.from(CALL_LOGS_TABLE).select('*', { count: 'exact', head: true }).eq('employee_id', telecallerId).gte('created_at', startOfDay),
        supabase.from(CALL_LOGS_TABLE).select('*', { count: 'exact', head: true }).eq('employee_id', telecallerId).gte('created_at', startOfWeek),
        supabase.from(CALL_LOGS_TABLE).select('*', { count: 'exact', head: true }).eq('employee_id', telecallerId).gte('created_at', startOfMonth)
      ]);

      // Sum collections (Paginating if necessary)
      const sumCollections = async (since: string) => {
        let total = 0;
        let p = 0;
        let more = true;
        while (more) {
          const { data, error: e } = await supabase
            .from(CALL_LOGS_TABLE)
            .select('amount_collected')
            .eq('employee_id', telecallerId)
            .gte('created_at', since)
            .range(p * 1000, (p + 1) * 1000 - 1);

          if (e || !data || data.length === 0) {
            more = false;
          } else {
            total += data.reduce((s, l) => s + (parseFloat(String(l.amount_collected || 0))), 0);
            if (data.length < 1000) more = false;
            p++;
          }
        }
        return total;
      };

      const [dailyCollections, weeklyCollections, monthlyCollections] = await Promise.all([
        sumCollections(startOfDay),
        sumCollections(startOfWeek),
        sumCollections(startOfMonth)
      ]);

      return {
        dailyCalls: dailyCallsCount || 0,
        weeklyCalls: weeklyCallsCount || 0,
        monthlyCalls: monthlyCallsCount || 0,
        dailyCollections,
        weeklyCollections,
        monthlyCollections
      };
    } catch (error) {
      console.error('Error in getPerformanceMetrics:', error);
      return {
        dailyCalls: 0,
        weeklyCalls: 0,
        monthlyCalls: 0,
        dailyCollections: 0,
        weeklyCollections: 0,
        monthlyCollections: 0
      };
    }
  }
};
