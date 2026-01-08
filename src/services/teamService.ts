import { supabase } from '../lib/supabase';
import {
  Team,
  TeamInsert,
  TeamUpdate,
  TeamWithDetails,
  TEAM_TABLE,
  EMPLOYEE_TABLE,
  Telecaller,
  TeamIncharge
} from '../models';

// Re-export types for external use
export type { TeamWithDetails };

export class TeamService {
  static async createTeam(teamData: {
    tenant_id: string;
    name: string;
    team_incharge_id: string;
    product_name: string;
    telecaller_ids: string[];
    created_by?: string;
  }): Promise<Team> {


    // Validate input data
    if (!teamData.tenant_id) {
      throw new Error('Tenant ID is required');
    }
    if (!teamData.name || teamData.name.trim().length === 0) {
      throw new Error('Team name is required and cannot be empty');
    }
    if (!teamData.team_incharge_id) {
      throw new Error('Team in-charge is required');
    }
    if (!teamData.product_name || teamData.product_name.trim().length === 0) {
      throw new Error('Product name is required and cannot be empty');
    }

    try {
      // Check if team name already exists for this tenant
      const { data: existingTeam, error: checkError } = await supabase
        .from(TEAM_TABLE)
        .select('id, name')
        .eq('tenant_id', teamData.tenant_id)
        .eq('name', teamData.name.trim())
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing team:', checkError);
        throw new Error('Failed to verify team name availability');
      }

      if (existingTeam) {
        throw new Error(`Team with name "${teamData.name.trim()}" already exists`);
      }

      // Verify team in-charge exists and has correct role
      const { data: teamIncharge, error: inchargeError } = await supabase
        .from(EMPLOYEE_TABLE)
        .select('id, name, role')
        .eq('id', teamData.team_incharge_id)
        .eq('tenant_id', teamData.tenant_id)
        .maybeSingle();

      if (inchargeError) {
        console.error('Error verifying team in-charge:', inchargeError);
        throw new Error('Failed to verify team in-charge');
      }

      if (!teamIncharge) {
        throw new Error('Team in-charge not found');
      }

      if (teamIncharge.role !== 'TeamIncharge' && teamIncharge.role !== 'CompanyAdmin') {
        throw new Error('Selected user does not have permission to be a team in-charge');
      }

      // Create the team
      const teamInsert: TeamInsert = {
        tenant_id: teamData.tenant_id,
        name: teamData.name.trim(),
        team_incharge_id: teamData.team_incharge_id,
        product_name: teamData.product_name.trim(),
        created_by: teamData.created_by || teamData.team_incharge_id
      };

      const { data: team, error: teamError } = await supabase
        .from(TEAM_TABLE)
        .insert(teamInsert)
        .select()
        .single();

      if (teamError) {
        console.error('Team creation error:', teamError);

        // Provide user-friendly error messages
        if (teamError.code === '23505') {
          throw new Error('A team with this name already exists');
        } else if (teamError.code === '23503') {
          throw new Error('Invalid team in-charge or tenant reference');
        } else {
          throw new Error(`Failed to create team: ${teamError.message}`);
        }
      }



      // Assign telecallers to this team using the junction table
      if (teamData.telecaller_ids && teamData.telecaller_ids.length > 0) {
        // Verify all telecallers exist
        const { data: telecallers, error: telecallerCheckError } = await supabase
          .from(EMPLOYEE_TABLE)
          .select('id, name, role')
          .eq('tenant_id', teamData.tenant_id)
          .eq('role', 'Telecaller')
          .in('id', teamData.telecaller_ids);

        if (telecallerCheckError) {
          console.error('Error verifying telecallers:', telecallerCheckError);
          console.warn('Team created but telecaller verification failed');
        } else if (telecallers && telecallers.length > 0) {
          // Insert records into team_telecallers junction table
          const teamTelecallerRecords = telecallers.map(telecaller => ({
            team_id: team.id,
            telecaller_id: telecaller.id,
            assigned_by: teamData.created_by || teamData.team_incharge_id
          }));

          const { error: assignmentError } = await supabase
            .from('team_telecallers')
            .insert(teamTelecallerRecords);

          if (assignmentError) {
            console.error('Telecaller assignment error:', assignmentError);
            console.warn('Team created but telecaller assignment failed:', assignmentError.message);
          } else {
            console.log(`Successfully assigned ${telecallers.length} telecaller(s) to team ${team.name}`);
          }
        }
      }

      return team;
    } catch (error) {
      console.error('Error in createTeam:', error);
      throw error;
    }
  }

  static async getTeams(tenantId: string): Promise<TeamWithDetails[]> {
    const { data: teamsData, error: teamsError } = await supabase
      .from(TEAM_TABLE)
      .select(`
        *,
        team_incharge:employees!team_incharge_id(id, name, emp_id)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      throw teamsError;
    }

    if (!teamsData || teamsData.length === 0) {

      return [];
    }



    // Then get telecallers for each team
    const teamsWithTelecallers = await Promise.all(
      teamsData.map(async (team) => {


        // Get telecallers for this team from the junction table
        const { data: teamTelecallers, error: telecallersError } = await supabase
          .from('team_telecallers')
          .select(`
            employees:telecaller_id(id, name, emp_id)
          `)
          .eq('team_id', team.id);

        if (telecallersError) {
          console.error('Error fetching telecallers for team:', team.id, telecallersError);
          return { ...team, telecallers: [], total_cases: 0 };
        }

        // Extract telecaller data - Supabase returns employees as a single object, not array
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const telecallers = teamTelecallers?.map((tt: any) => tt.employees).filter(Boolean) || [];



        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const telecallerIds = telecallers?.map((t: any) => t.id) || [];
        let totalCases = 0;

        if (telecallerIds.length > 0) {
          const { count, error: countError } = await supabase
            .from('customer_cases')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .in('assigned_employee_id', telecallerIds.map((id: string) => id.toString()));

          if (!countError) {
            totalCases = count || 0;
          }
        }

        return {
          ...team,
          telecallers: telecallers || [],
          total_cases: totalCases
        };
      })
    );


    return teamsWithTelecallers;
  }

  static async updateTeam(teamId: string, updates: {
    name?: string;
    team_incharge_id?: string;
    product_name?: string;
    telecaller_ids?: string[];
    status?: string;
  }): Promise<Team> {
    const teamUpdate: TeamUpdate = {
      name: updates.name,
      team_incharge_id: updates.team_incharge_id,
      product_name: updates.product_name,
      status: updates.status as 'active' | 'inactive' | undefined
    };

    const { data: team, error: teamError } = await supabase
      .from(TEAM_TABLE)
      .update(teamUpdate)
      .eq('id', teamId)
      .select()
      .single();

    if (teamError) throw teamError;

    // Update telecaller assignments if provided
    if (updates.telecaller_ids !== undefined) {
      // First, remove all current assignments for this team in junction table
      const { error: deleteError } = await supabase
        .from('team_telecallers')
        .delete()
        .eq('team_id', teamId);

      if (deleteError) {
        console.error('Error removing old telecaller assignments:', deleteError);
        throw deleteError;
      }

      // Then assign new telecallers using junction table
      if (updates.telecaller_ids.length > 0) {
        const teamTelecallerRecords = updates.telecaller_ids.map(id => ({
          team_id: teamId,
          telecaller_id: id,
          assigned_by: updates.team_incharge_id // Use current in-charge as fallback for assigned_by
        }));

        const { error: insertError } = await supabase
          .from('team_telecallers')
          .insert(teamTelecallerRecords);

        if (insertError) {
          console.error('Error assigning new telecallers:', insertError);
          throw insertError;
        }
      }
    }

    return team;
  }

  static async deleteTeam(teamId: string): Promise<void> {
    // Delete the team - database CASCADE constraints handle cleanup:
    // 1. customer_cases with team_id = teamId are CASCADE deleted
    // 2. case_call_logs for those cases are CASCADE deleted
    // 3. team_telecallers records are CASCADE deleted
    // 4. employees.team_id is SET NULL (telecallers unassigned)
    const { error } = await supabase
      .from(TEAM_TABLE)
      .delete()
      .eq('id', teamId);

    if (error) {
      console.error('Error deleting team:', error);

      // Provide user-friendly error messages
      if (error.code === '23503') {
        throw new Error('Cannot delete team: It has dependent records that must be removed first');
      } else {
        throw new Error(`Failed to delete team: ${error.message}`);
      }
    }
  }

  static async getTeamDeletionImpact(teamId: string): Promise<{
    telecallerCount: number;
    caseCount: number;
    callLogCount: number;
  }> {
    // Get count of telecallers in this team
    const { count: telecallerCount, error: telecallerError } = await supabase
      .from(EMPLOYEE_TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    if (telecallerError) {
      console.error('Error counting telecallers:', telecallerError);
    }

    // Get count of cases assigned to this team
    const { count: caseCount, error: caseError } = await supabase
      .from('customer_cases')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    if (caseError) {
      console.error('Error counting cases:', caseError);
    }

    // Get count of call logs for this team's cases
    let callLogCount = 0;
    if (caseCount && caseCount > 0) {
      const { data: caseIds } = await supabase
        .from('customer_cases')
        .select('id')
        .eq('team_id', teamId);

      if (caseIds && caseIds.length > 0) {
        const { count, error: callLogError } = await supabase
          .from('case_call_logs')
          .select('*', { count: 'exact', head: true })
          .in('case_id', caseIds.map(c => c.id));

        if (!callLogError && count) {
          callLogCount = count;
        }
      }
    }

    return {
      telecallerCount: telecallerCount || 0,
      caseCount: caseCount || 0,
      callLogCount: callLogCount || 0
    };
  }

  static async getAvailableTelecallers(tenantId: string, excludeTeamId?: string): Promise<Pick<Telecaller, 'id' | 'name' | 'emp_id'>[]> {
    let query = supabase
      .from(EMPLOYEE_TABLE)
      .select('id, name, emp_id')
      .eq('tenant_id', tenantId)
      .eq('role', 'Telecaller')
      .eq('status', 'active');

    if (excludeTeamId) {
      query = query.or(`team_id.is.null,team_id.neq.${excludeTeamId}`);
    } else {
      query = query.is('team_id', null);
    }

    const { data, error } = await query.order('name');

    if (error) throw error;
    return data || [];
  }

  static async getAllTelecallers(tenantId: string): Promise<Pick<Telecaller, 'id' | 'name' | 'emp_id' | 'team_id'>[]> {
    const { data, error } = await supabase
      .from(EMPLOYEE_TABLE)
      .select('id, name, emp_id, team_id')
      .eq('tenant_id', tenantId)
      .eq('role', 'Telecaller')
      .eq('status', 'active')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all teams that a telecaller belongs to
   */
  static async getTelecallerTeams(telecallerId: string): Promise<Team[]> {
    const { data, error } = await supabase
      .from('team_telecallers')
      .select(`
        teams:team_id(
          id,
          name,
          product_name,
          status,
          tenant_id,
          team_incharge_id,
          created_at,
          updated_at,
          created_by
        )
      `)
      .eq('telecaller_id', telecallerId)
      .eq('teams.status', 'active');

    if (error) {
      console.error('Error fetching telecaller teams:', error);
      throw error;
    }

    // Extract teams from the nested structure - Supabase returns teams as a single object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data?.map((item: any) => item.teams).filter(Boolean) || [];
  }

  /**
   * Get all telecallers with their team assignments (via junction table)
   */
  static async getAllTelecallersWithTeams(tenantId: string): Promise<Array<{
    id: string;
    name: string;
    emp_id: string;
    teams: Array<{ id: string; name: string }>;
  }>> {
    // First get all telecallers
    const { data: telecallers, error: telecallersError } = await supabase
      .from(EMPLOYEE_TABLE)
      .select('id, name, emp_id')
      .eq('tenant_id', tenantId)
      .eq('role', 'Telecaller')
      .eq('status', 'active')
      .order('name');

    if (telecallersError) throw telecallersError;
    if (!telecallers) return [];

    // Then get team assignments for each telecaller
    const telecallersWithTeams = await Promise.all(
      telecallers.map(async (telecaller) => {
        const { data: teamAssignments, error: teamsError } = await supabase
          .from('team_telecallers')
          .select(`
            teams:team_id(id, name)
          `)
          .eq('telecaller_id', telecaller.id);

        if (teamsError) {
          console.error('Error fetching teams for telecaller:', telecaller.id, teamsError);
          return {
            ...telecaller,
            teams: []
          };
        }

        return {
          ...telecaller,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          teams: teamAssignments?.map((ta: any) => ta.teams).filter(Boolean) || []
        };
      })
    );

    return telecallersWithTeams;
  }

  static async getTeamIncharges(tenantId: string): Promise<Pick<TeamIncharge, 'id' | 'name' | 'emp_id'>[]> {
    const { data, error } = await supabase
      .from(EMPLOYEE_TABLE)
      .select('id, name, emp_id')
      .eq('tenant_id', tenantId)
      .eq('role', 'TeamIncharge')
      .eq('status', 'active')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async toggleTeamStatus(teamId: string): Promise<Team> {
    const { data: currentTeam, error: fetchError } = await supabase
      .from(TEAM_TABLE)
      .select('status')
      .eq('id', teamId)
      .single();

    if (fetchError) throw fetchError;

    const newStatus = currentTeam.status === 'active' ? 'inactive' : 'active';

    const { data: team, error: updateError } = await supabase
      .from(TEAM_TABLE)
      .update({ status: newStatus })
      .eq('id', teamId)
      .select()
      .single();

    if (updateError) throw updateError;
    return team;
  }

  static async getTeamCollections(tenantId: string): Promise<Array<{
    team_id: string;
    team_name: string;
    total_collected: number;
  }>> {
    try {
      // Get all teams for this tenant
      const { data: teams, error: teamsError } = await supabase
        .from(TEAM_TABLE)
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        throw teamsError;
      }

      if (!teams || teams.length === 0) {
        return [];
      }

      // For each team, get the total collected amount
      const teamCollections = await Promise.all(
        teams.map(async (team) => {
          // Get all telecallers in this team
          const { data: telecallers, error: telecallersError } = await supabase
            .from(EMPLOYEE_TABLE)
            .select('id')
            .eq('team_id', team.id);

          if (telecallersError || !telecallers || telecallers.length === 0) {
            return {
              team_id: team.id,
              team_name: team.name,
              total_collected: 0
            };
          }

          const telecallerIds = telecallers.map(t => t.id);

          // Sum all amount_collected from case_call_logs for these telecallers
          const { data: collections, error: collectionsError } = await supabase
            .from('case_call_logs')
            .select('amount_collected')
            .in('employee_id', telecallerIds)
            .not('amount_collected', 'is', null);

          if (collectionsError) {
            console.error('Error fetching collections:', collectionsError);
            return {
              team_id: team.id,
              team_name: team.name,
              total_collected: 0
            };
          }

          const totalCollected = collections?.reduce((sum, log) => {
            const amount = parseFloat(log.amount_collected || '0');
            return sum + amount;
          }, 0) || 0;

          return {
            team_id: team.id,
            team_name: team.name,
            total_collected: totalCollected
          };
        })
      );

      // Filter out teams with zero collections for cleaner visualization
      return teamCollections.filter(tc => tc.total_collected > 0);
    } catch (error) {
      console.error('Error in getTeamCollections:', error);
      return [];
    }
  }

  /**
   * Get team toppers - telecallers ranked by today's performance
   */
  static async getTeamToppers(teamId: string): Promise<Array<{
    name: string;
    callsDoneToday: number;
    collectionAmount: number;
    ptpSuccessPercent: number;
  }>> {
    try {
      // Get all telecallers in this team via junction table
      const { data: teamTelecallers, error: telecallersError } = await supabase
        .from('team_telecallers')
        .select(`
          employees:telecaller_id(id, name)
        `)
        .eq('team_id', teamId);

      if (telecallersError || !teamTelecallers || teamTelecallers.length === 0) {
        return [];
      }

      // Extract telecaller data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const telecallers = teamTelecallers.map((tt: any) => tt.employees).filter(Boolean);
      const telecallerIds = telecallers.map((t: { id: string }) => t.id);

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get call logs for today
      const { data: logs, error: logsError } = await supabase
        .from('case_call_logs')
        .select('employee_id, call_status, amount_collected')
        .in('employee_id', telecallerIds)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (logsError) {
        console.error('Error fetching call logs:', logsError);
        return [];
      }

      // Calculate metrics for each telecaller
      const performanceMap = new Map<string, {
        callsToday: number;
        collected: number;
        ptpCount: number;
        ptpSuccess: number;
      }>();

      telecallers.forEach((t: { id: string }) => {
        performanceMap.set(t.id, {
          callsToday: 0,
          collected: 0,
          ptpCount: 0,
          ptpSuccess: 0
        });
      });

      logs?.forEach(log => {
        const perf = performanceMap.get(log.employee_id);
        if (perf) {
          perf.callsToday++;
          if (log.amount_collected) {
            perf.collected += parseFloat(log.amount_collected);
          }
          if (log.call_status?.toLowerCase().includes('ptp')) {
            perf.ptpCount++;
            // Consider PTP successful if there's a collection or status indicates success
            if (log.amount_collected || log.call_status?.toLowerCase().includes('success')) {
              perf.ptpSuccess++;
            }
          }
        }
      });

      // Build toppers array
      const toppers = telecallers.map((t: { id: string; name: string }) => {
        const perf = performanceMap.get(t.id)!;
        return {
          name: t.name,
          callsDoneToday: perf.callsToday,
          collectionAmount: Math.round(perf.collected),
          ptpSuccessPercent: perf.ptpCount > 0
            ? Math.round((perf.ptpSuccess / perf.ptpCount) * 100)
            : 0
        };
      });

      // Sort by collection amount (primary) and calls (secondary)
      toppers.sort((a, b) => {
        if (b.collectionAmount !== a.collectionAmount) {
          return b.collectionAmount - a.collectionAmount;
        }
        return b.callsDoneToday - a.callsDoneToday;
      });

      // Return top 3
      return toppers.slice(0, 3);
    } catch (error) {
      console.error('Error in getTeamToppers:', error);
      return [];
    }
  }

  static async getTelecallerPerformance(teamId: string): Promise<Array<{
    name: string;
    collected: number;
  }>> {
    try {
      const { data: telecallers, error: teleError } = await supabase
        .from(EMPLOYEE_TABLE)
        .select('id, name')
        .eq('team_id', teamId)
        .eq('role', 'Telecaller');

      if (teleError || !telecallers || telecallers.length === 0) return [];

      const telecallerIds = telecallers.map(t => t.id);

      const { data: logs, error: logsError } = await supabase
        .from('case_call_logs')
        .select('employee_id, amount_collected')
        .in('employee_id', telecallerIds)
        .not('amount_collected', 'is', null);

      if (logsError) throw logsError;

      const performanceMap = new Map<string, number>();
      telecallers.forEach(t => performanceMap.set(t.id, 0));

      logs?.forEach(log => {
        const amount = parseFloat(log.amount_collected || '0');
        const current = performanceMap.get(log.employee_id) || 0;
        performanceMap.set(log.employee_id, current + amount);
      });

      return telecallers.map(t => ({
        name: t.name,
        collected: performanceMap.get(t.id) || 0
      })).sort((a, b) => b.collected - a.collected);
    } catch (error) {
      console.error('Error in getTelecallerPerformance:', error);
      return [];
    }
  }

  static async getCollectionTrends(tenantId: string, teamId?: string, days: number = 7): Promise<Array<{
    date: string;
    amount: number;
  }>> {
    try {
      const dates = [];
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }

      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);

      let telecallerIds: string[] = [];
      if (teamId) {
        const { data: telecallers } = await supabase
          .from(EMPLOYEE_TABLE)
          .select('id')
          .eq('team_id', teamId);
        telecallerIds = telecallers?.map(t => t.id) || [];
      }

      let query = supabase
        .from('case_call_logs')
        .select('created_at, amount_collected')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString())
        .not('amount_collected', 'is', null);

      if (teamId && telecallerIds.length > 0) {
        query = query.in('employee_id', telecallerIds);
      } else if (teamId) {
        return dates.map(date => ({ date, amount: 0 }));
      }

      const { data: logs, error } = await query;
      if (error) throw error;

      const dailyTotals = new Map<string, number>();
      dates.forEach(date => dailyTotals.set(date, 0));

      logs?.forEach(log => {
        const date = log.created_at.split('T')[0];
        if (dailyTotals.has(date)) {
          const current = dailyTotals.get(date) || 0;
          dailyTotals.set(date, current + parseFloat(log.amount_collected || '0'));
        }
      });

      return Array.from(dailyTotals.entries()).map(([date, amount]) => ({
        date,
        amount
      }));
    } catch (error) {
      console.error('Error in getCollectionTrends:', error);
      return [];
    }
  }
}