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

      const { data: allLogs, error } = await supabase
        .from(CALL_LOGS_TABLE)
        .select('created_at, amount_collected')
        .eq('employee_id', telecallerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching call logs:', error);
        throw new Error(`Failed to fetch performance metrics: ${error.message}`);
      }

      const logs = allLogs || [];

      const dailyLogs = logs.filter(log => log.created_at >= startOfDay);
      const weeklyLogs = logs.filter(log => log.created_at >= startOfWeek);
      const monthlyLogs = logs.filter(log => log.created_at >= startOfMonth);

      const calculateCollections = (logsList: typeof logs) => {
        return logsList.reduce((sum, log) => {
          if (log.amount_collected) {
            const amount = parseFloat(String(log.amount_collected));
            return sum + (isNaN(amount) ? 0 : amount);
          }
          return sum;
        }, 0);
      };

      return {
        dailyCalls: dailyLogs.length,
        weeklyCalls: weeklyLogs.length,
        monthlyCalls: monthlyLogs.length,
        dailyCollections: calculateCollections(dailyLogs),
        weeklyCollections: calculateCollections(weeklyLogs),
        monthlyCollections: calculateCollections(monthlyLogs)
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
