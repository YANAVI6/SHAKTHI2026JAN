import React, { useState, useEffect, useCallback } from 'react';
import { Users, CheckCircle, Search } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { TeamService } from '../../services/teamService';
import { useAuth } from '../../contexts/AuthContext';
import { useTeams } from '../../hooks/useTeams';
import { useProducts } from '../../hooks/useProducts';
import { useNotification, notificationHelpers } from '../shared/Notification';

interface CreateTeamProps {
  isOpen: boolean;
  onClose: () => void;
  onTeamCreated?: () => void;
}

interface TelecallerWithTeams {
  id: string;
  name: string;
  emp_id: string;
  teams: Array<{ id: string; name: string }>;
}

export const CreateTeam: React.FC<CreateTeamProps> = ({ isOpen, onClose, onTeamCreated }) => {
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const { createTeam } = useTeams(user?.tenantId);
  const { products, isLoading: productsLoading } = useProducts(user?.tenantId);
  const [teamName, setTeamName] = useState('');
  const [selectedTelecallers, setSelectedTelecallers] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [telecallers, setTelecallers] = useState<TelecallerWithTeams[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter telecallers
  const filteredTelecallers = telecallers.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.emp_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadAllTelecallers = useCallback(async () => {
    if (!user?.tenantId) return;

    try {
      setIsLoading(true);
      const telecallerList = await TeamService.getAllTelecallersWithTeams(user?.tenantId);
      setTelecallers(telecallerList);
    } catch (error) {
      console.error('Error loading telecallers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.tenantId]);

  useEffect(() => {
    if (isOpen) {
      loadAllTelecallers();
    }
  }, [isOpen, loadAllTelecallers]);

  const handleTelecallerToggle = (telecallerId: string) => {
    setSelectedTelecallers(prev =>
      prev.includes(telecallerId)
        ? prev.filter(id => id !== telecallerId)
        : [...prev, telecallerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTelecallers.length === filteredTelecallers.length && filteredTelecallers.length > 0) {
      setSelectedTelecallers([]);
    } else {
      setSelectedTelecallers(filteredTelecallers.map(t => t.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form submission data:', {
      teamName: teamName.trim(),
      selectedColumn: selectedColumn,
      tenantId: user?.tenantId,
      userId: user?.id,
      selectedTelecallers: selectedTelecallers
    });

    if (!teamName.trim() || !selectedColumn) {
      showNotification(notificationHelpers.error(
        'Validation Error',
        'Please fill in all required fields'
      ));
      return;
    }

    if (!user?.tenantId || !user?.id) {
      showNotification(notificationHelpers.error(
        'Error',
        'User or tenant information not found'
      ));
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Calling createTeam with:', {
        name: teamName.trim(),
        team_incharge_id: user.id,
        selectedTelecallers: selectedTelecallers,
        selectedColumn: selectedColumn
      });

      const success = await createTeam({
        name: teamName.trim(),
        team_incharge_id: user.id,
        selectedTelecallers: selectedTelecallers,
        selectedColumn: selectedColumn
      });

      if (success) {
        // Reset form
        setTeamName('');
        setSelectedTelecallers([]);
        setSelectedColumn('');

        // Reload telecallers to get updated list
        loadAllTelecallers();

        // Call the onTeamCreated callback if provided
        onTeamCreated?.();

        showNotification(notificationHelpers.success(
          'Team Created',
          'Team created successfully!'
        ));
        onClose();
      }
    } catch (error) {
      console.error('Error creating team:', error);
      showNotification(notificationHelpers.error(
        'Failed to Create Team',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setTeamName('');
    setSelectedTelecallers([]);
    setSelectedColumn('');
    setTelecallers([]);
    onClose();
  };

  const selectedTelecallersInfo = telecallers.filter(t => selectedTelecallers.includes(t.id));

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Create New Team</h3>
            <p className="text-[10px] text-gray-500 font-normal mt-0.5">Build a high-performance recovery group</p>
          </div>
        </div>
      }
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full px-1">
          <div className="text-[10px] text-gray-500 font-medium italic">
            * Required fields
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold transition-all"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting || !teamName.trim() || !selectedColumn}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 transition-all"
            >
              {isSubmitting ? 'Creating...' : 'Launch Team'}
            </button>
          </div>
        </div>
      }
    >
      <div className="p-1">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Side: Basic Info (Taking up 4/12 columns) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Team Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                  Team Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Phoenix Recovery..."
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                />
              </div>

              {/* Product Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                  Target Product <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    required
                    disabled={productsLoading}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {productsLoading ? 'Loading...' : products.length === 0 ? 'No inventory' : 'Select Category'}
                    </option>
                    {products.map((product) => (
                      <option key={product} value={product}>
                        {product}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-2.5 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
                {products.length === 0 && !productsLoading && (
                  <p className="text-[10px] text-orange-600 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                    Add products in Product Management first.
                  </p>
                )}
              </div>

              {/* Team Lead Summary (Condensed) */}
              <div className="bg-white border border-blue-100 rounded-xl p-3 shadow-sm shadow-blue-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white ring-offset-1">
                    {getInitials(user?.name || 'User')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Assigned Leader</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Current User'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Telecaller Selection (Taking up 8/12 columns) */}
            <div className="lg:col-span-8 space-y-2.5 flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <div className="w-1 h-3 bg-emerald-500 rounded-full"></div>
                  Assign Recovery Workforce
                </label>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold ring-1 ring-emerald-100">
                  {selectedTelecallers.length} selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 group">
                  <input
                    type="text"
                    placeholder="Quick search by name or identification code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-[11px] pl-9 pr-3 py-2 bg-gray-50 border border-transparent rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all group-hover:bg-gray-100"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 transition-colors group-hover:text-gray-500" />
                </div>
                {filteredTelecallers.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-4 py-2 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md shadow-blue-100 whitespace-nowrap"
                  >
                    {selectedTelecallers.length === filteredTelecallers.length ? 'Deselect All' : 'Select All Matches'}
                  </button>
                )}
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden shadow-inner bg-gray-50/20">
                <div className="h-96 overflow-y-auto custom-scrollbar bg-white p-3">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full py-10">
                      <div className="animate-spin w-8 h-8 border-3 border-blue-100 border-t-blue-600 rounded-full"></div>
                      <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-widest">Loading Records</p>
                    </div>
                  ) : filteredTelecallers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredTelecallers.map((telecaller) => {
                        const isSelected = selectedTelecallers.includes(telecaller.id);
                        return (
                          <div
                            key={telecaller.id}
                            onClick={() => handleTelecallerToggle(telecaller.id)}
                            className={`group flex items-center p-3 cursor-pointer rounded-xl border transition-all duration-200 ${isSelected ? 'bg-blue-50 border-blue-400 shadow-md shadow-blue-50' : 'bg-gray-50/40 border-gray-100 hover:bg-white hover:border-blue-300 hover:shadow-lg hover:shadow-gray-200/50'}`}
                          >
                            <div className="relative mr-3 flex-shrink-0">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500'}`}>
                                {isSelected ? (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                ) : getInitials(telecaller.name)}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className={`text-xs font-bold truncate mb-0.5 transition-colors ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>{telecaller.name}</h4>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'} whitespace-nowrap`}>
                                  ID: {telecaller.emp_id.replace('EMP', '')}
                                </span>
                                {telecaller.teams.length > 0 && (
                                  <div className="flex items-center text-[9px] text-gray-400 font-bold">
                                    <Users className="w-2.5 h-2.5 mr-0.5" />
                                    {telecaller.teams.length}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-gray-200" />
                      </div>
                      <p className="text-sm font-bold text-gray-900 mb-1">No telecallers match</p>
                      <p className="text-xs text-gray-400">Try a different search criteria</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center bg-gray-50/50 px-3 py-2 rounded-xl border border-gray-100">
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Total Results</span>
                    <span className="text-xs font-bold text-gray-700">{filteredTelecallers.length}</span>
                  </div>
                  <div className="w-[1px] h-6 bg-gray-200 my-auto"></div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Queue Status</span>
                    <span className={`text-xs font-bold ${selectedTelecallers.length > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{selectedTelecallers.length} assigned</span>
                  </div>
                </div>
                {selectedTelecallers.length > 10 && (
                  <div className="flex items-center gap-1.5 py-1 px-3 bg-blue-50/50 rounded-full border border-blue-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-[10px] text-blue-700 font-bold uppercase tracking-tight">Large Batch Launch</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Consolidated Assignment Brief */}
          {selectedTelecallersInfo.length > 0 && (
            <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-indigo-950 rounded-2xl p-4 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-500">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/10 ring-1 ring-white/5">
                    <CheckCircle className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Mission Blueprint</h4>
                    <p className="text-[11px] text-indigo-200/60 font-medium">Deploying {selectedTelecallersInfo.length} recovery specialists to {teamName || 'Unspecified Team'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 w-full md:w-auto">
                  <div>
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block">Team Unit</span>
                    <p className="text-xs font-bold">{teamName || '---'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block">Product Focus</span>
                    <p className="text-xs font-bold text-emerald-400">{selectedColumn || '---'}</p>
                  </div>
                </div>

                <div className="flex -space-x-4">
                  {selectedTelecallersInfo.slice(0, 5).map((t) => (
                    <div key={t.id} className="h-10 w-10 rounded-full ring-4 ring-gray-900 bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-[10px] font-black shadow-xl">
                      {getInitials(t.name)}
                    </div>
                  ))}
                  {selectedTelecallersInfo.length > 5 && (
                    <div className="h-10 w-10 rounded-full ring-4 ring-gray-900 bg-white/10 flex items-center justify-center text-[10px] font-black backdrop-blur-md border border-white/10">
                      +{selectedTelecallersInfo.length - 5}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
};