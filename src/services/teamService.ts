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



      // Update telecallers to assign them to this team
      if (teamData.telecaller_ids && teamData.telecaller_ids.length > 0) {


        // Verify all telecallers exist and are available
        const { data: telecallers, error: telecallerCheckError } = await supabase
          .from(EMPLOYEE_TABLE)
          .select('id, name, role, team_id')
          .eq('tenant_id', teamData.tenant_id)
          .eq('role', 'Telecaller')
          .in('id', teamData.telecaller_ids);

        if (telecallerCheckError) {
          console.error('Error verifying telecallers:', telecallerCheckError);
          console.warn('Team created but telecaller verification failed');
        } else {
          // Check if any telecallers are already assigned
          const alreadyAssigned = telecallers?.filter(t => t.team_id !== null) || [];
          if (alreadyAssigned.length > 0) {
            console.warn('Some telecallers are already assigned to teams:',
              alreadyAssigned.map(t => t.name).join(', '));
          }

          // Only assign unassigned telecallers
          const availableTelecallerIds = telecallers
            ?.filter(t => t.team_id === null)
            .map(t => t.id) || [];

          if (availableTelecallerIds.length > 0) {
            const { error: updateError } = await supabase
              .from(EMPLOYEE_TABLE)
              .update({ team_id: team.id })
              .in('id', availableTelecallerIds);

            if (updateError) {
              console.error('Telecaller assignment error:', updateError);
              console.warn('Team created but telecaller assignment failed:', updateError.message);
            } else {
              // Assignment successful
            }
          } else {
            console.warn('No available telecallers to assign');
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


        const { data: telecallers, error: telecallersError } = await supabase
          .from(EMPLOYEE_TABLE)
          .select('id, name, emp_id')
          .eq('tenant_id', tenantId)
          .eq('team_id', team.id);

        if (telecallersError) {
          console.error('Error fetching telecallers for team:', team.id, telecallersError);
          return { ...team, telecallers: [], total_cases: 0 };
        }



        const telecallerIds = telecallers?.map((t: { id: string }) => t.id) || [];
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
      // First, remove all current assignments for this team
      await supabase
        .from(EMPLOYEE_TABLE)
        .update({ team_id: null })
        .eq('team_id', teamId);

      // Then assign new telecallers
      if (updates.telecaller_ids.length > 0) {
        const { error: updateError } = await supabase
          .from(EMPLOYEE_TABLE)
          .update({ team_id: teamId })
          .in('id', updates.telecaller_ids);

        if (updateError) throw updateError;
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