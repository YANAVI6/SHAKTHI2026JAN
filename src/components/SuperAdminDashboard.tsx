import React, { useState, useEffect, useCallback } from 'react';
import Layout from './Layout';
import { getAdminsByTenantId, createAdmin, updateAdmin, deleteAdmin, resetAdminPassword, toggleAdminStatus } from '../utils/adminManagement';
import { getAllTenants, createTenant, updateTenant, deleteTenant, checkSlugAvailability, sanitizeSlug, Tenant } from '../utils/simplifiedTenantManagement';
import { TenantInsert } from '../models/tenant.model';
import { customerCaseService } from '../services/customerCaseService';
import { getDomainConfig } from '../config/domain';
import { usePageConfig, getRoleBasedTitle } from '../utils/pageUtils';
import { CompanyAdmin, CreateAdminRequest, UpdateAdminRequest } from '../types/admin';
import { User } from '../contexts/AuthContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useNotification, notificationHelpers } from './shared/Notification';
import {
  Home,
  Building2,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Phone,
  UserCheck,
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Save,
  X,
  User as UserIcon,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  ExternalLink,
  MessageSquare,
  Globe
} from 'lucide-react';
import { EnquiryManagement } from './sections/EnquiryManagement';
import { TestimonialManagement } from './sections/TestimonialManagement';
import { SocialMediaManagement } from './sections/SocialMediaManagement';
import { PageDocManagement } from './sections/PageDocManagement';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Reusable Components
const KPICard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; color: string }> = ({ icon, title, value, color }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
    <div className="flex items-center">
      <div className={`${color} rounded-lg p-3 mr-4`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: string; type?: 'status' | 'plan' }> = ({ status, type = 'status' }) => {
  const getBadgeStyles = () => {
    if (type === 'plan') {
      switch (status) {
        case 'Premium': return 'bg-purple-100 text-purple-800';
        case 'Standard': return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    } else {
      return status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    }
  };

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeStyles()}`}>
      {status}
    </span>
  );
};

const ActivityItem: React.FC<{ company: string; action: string; status: string }> = ({ company, action, status }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <div className="flex items-center">
      <div className={`w-2 h-2 rounded-full mr-3 ${status === 'success' ? 'bg-green-500' :
        status === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
        }`}></div>
      <div>
        <p className="font-medium text-gray-900">{company}</p>
        <p className="text-sm text-gray-600">{action}</p>
      </div>
    </div>
  </div>
);

const SystemStatusItem: React.FC<{ label: string; status: string; icon: React.ReactNode }> = ({ label, status, icon }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-600">{label}</span>
    <div className="flex items-center">
      {icon}
      <span className={`font-medium ${status === 'Online' || status === 'Connected' || status === 'Up to date' ? 'text-green-600' : 'text-yellow-600'}`}>
        {status}
      </span>
    </div>
  </div>
);

interface SuperAdminDashboardProps {
  user: User;
  onLogout: () => void;
}



const SYSTEM_STATUSES = [
  { label: 'Server Status', status: 'Online', icon: <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> },
  { label: 'Database', status: 'Connected', icon: <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> },
  { label: 'VOIP Gateway', status: 'Maintenance', icon: <AlertCircle className="w-4 h-4 text-yellow-500 mr-2" /> },
  { label: 'Backup Status', status: 'Up to date', icon: <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> }
];

// Chart configurations removed as they are no longer used with Recharts

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ user, onLogout }) => {
  const { showConfirmation } = useConfirmation();
  const { showNotification } = useNotification();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [globalStats, setGlobalStats] = useState<{
    totalCollected: number;
    trend: Array<{ month: string, amount: number }>;
    recentActivities: Array<{ company: string, action: string, status: string }>;
  }>({
    totalCollected: 0,
    trend: [],
    recentActivities: []
  });

  // Set dynamic page title and meta tags
  usePageConfig('superadmin', getRoleBasedTitle(user?.role, viewingTenant?.name));

  // Admin management state
  const [tenantAdmins, setTenantAdmins] = useState<CompanyAdmin[]>([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<CompanyAdmin | null>(null);
  const [newAdmin, setNewAdmin] = useState<CreateAdminRequest>({
    name: '',
    employeeId: '',
    email: '',
    password: '',
    status: 'active'
  });
  const [newTenant, setNewTenant] = useState<Partial<Tenant>>({
    name: '',
    slug: '',
    subdomain: '',
    status: 'active',
    proprietorName: '',
    phoneNumber: '',
    address: '',
    gstNumber: ''
  });
  const [slugCheckStatus, setSlugCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [slugError, setSlugError] = useState<string>('');
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const [checkTimeout, setCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  // Load tenants on component mount
  useEffect(() => {
    const loadTenants = async () => {
      try {
        setLoading(true);
        const tenantData = await getAllTenants();
        setTenants(tenantData);
      } catch (error) {
        console.error('Error loading tenants:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTenants();
    loadGlobalStats();
  }, []);

  const loadGlobalStats = async () => {
    const stats = await customerCaseService.getGlobalStats();

    // Map recent logs to activity items
    const activities = stats.recentLogs.map(log => ({
      company: 'System',
      action: `Payment of ₹${parseFloat(log.amount_collected || '0').toLocaleString()} collected`,
      status: 'success'
    }));

    setGlobalStats({
      totalCollected: stats.totalCollected,
      trend: stats.trend,
      recentActivities: activities
    });
  };

  // Load admins when viewing tenant changes
  useEffect(() => {
    if (viewingTenant) {
      loadTenantAdmins(viewingTenant.id);
    }
  }, [viewingTenant]);

  // Admin management functions
  const loadTenantAdmins = async (tenantId: string) => {
    try {
      const admins = await getAdminsByTenantId(tenantId);
      setTenantAdmins(admins);
    } catch (error) {
      console.error('Error loading tenant admins:', error);
    }
  };

  const resetAdminForm = () => {
    setNewAdmin({
      name: '',
      employeeId: '',
      email: '',
      password: '',
      status: 'active'
    });
  };

  const handleCreateAdmin = async () => {
    try {
      if (!viewingTenant) return;

      if (!newAdmin.name || !newAdmin.employeeId || !newAdmin.email || !newAdmin.password) {
        showNotification(notificationHelpers.error(
          'Validation Error',
          'Please fill in all required fields'
        ));
        return;
      }

      const adminData: CreateAdminRequest = {
        name: newAdmin.name,
        employeeId: newAdmin.employeeId,
        email: newAdmin.email,
        password: newAdmin.password,
        status: newAdmin.status || 'active'
      };

      console.log('Creating admin for tenant:', viewingTenant?.name, 'with data:', {
        name: adminData.name,
        employeeId: adminData.employeeId,
        email: adminData.email,
        tenantId: viewingTenant?.id
      });

      const createdAdmin = await createAdmin(viewingTenant.id, adminData, user.id);
      setTenantAdmins([...tenantAdmins, createdAdmin]);
      setShowAdminModal(false);
      resetAdminForm();
      showNotification(notificationHelpers.success(
        'Admin Created',
        `Admin "${adminData.name}" created successfully!`
      ));
    } catch (error) {
      console.error('Error creating admin:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create admin. Please check all fields and try again.';
      showNotification(notificationHelpers.error(
        'Failed to Create Admin',
        errorMessage
      ));
    }
  };

  const handleUpdateAdmin = async () => {
    try {
      if (!editingAdmin) return;

      const updates: UpdateAdminRequest = {
        name: newAdmin.name,
        employeeId: newAdmin.employeeId,
        email: newAdmin.email,
        status: newAdmin.status
      };

      const updatedAdmin = await updateAdmin(editingAdmin.id, updates);
      setTenantAdmins(tenantAdmins.map(a => a.id === editingAdmin.id ? updatedAdmin : a));
      setEditingAdmin(null);
      setShowAdminModal(false);
      resetAdminForm();
      showNotification(notificationHelpers.success(
        'Admin Updated',
        `Admin "${updates.name}" updated successfully!`
      ));
    } catch (error) {
      console.error('Error updating admin:', error);
      showNotification(notificationHelpers.error(
        'Update Failed',
        'Failed to update admin. Please try again.'
      ));
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    const admin = tenantAdmins.find(a => a.id === adminId);
    if (!admin) return;

    showConfirmation({
      title: 'Delete Admin',
      message: `Are you sure you want to delete admin "${admin.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteAdmin(adminId);
          setTenantAdmins(tenantAdmins.filter(a => a.id !== adminId));
          showNotification(notificationHelpers.success(
            'Admin Deleted',
            `Admin "${admin.name}" has been deleted successfully.`
          ));
        } catch (error) {
          console.error('Error deleting admin:', error);
          showNotification(notificationHelpers.error(
            'Delete Failed',
            'Failed to delete admin. Please try again.'
          ));
        }
      }
    });
  };

  const handleToggleAdminStatus = async (adminId: string) => {
    try {
      const updatedAdmin = await toggleAdminStatus(adminId);
      setTenantAdmins(tenantAdmins.map(a => a.id === adminId ? updatedAdmin : a));
      showNotification(notificationHelpers.success(
        'Status Updated',
        `Admin status updated to ${updatedAdmin.status}.`
      ));
    } catch (error) {
      console.error('Error toggling admin status:', error);
      showNotification(notificationHelpers.error(
        'Update Failed',
        'Failed to update admin status. Please try again.'
      ));
    }
  };

  const handleResetPassword = async (adminId: string) => {
    const admin = tenantAdmins.find(a => a.id === adminId);
    if (!admin) return;

    showConfirmation({
      title: 'Reset Password',
      message: `Are you sure you want to reset the password for admin "${admin.name}"? A new temporary password will be generated.`,
      confirmText: 'Reset Password',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: async () => {
        try {
          const newPassword = await resetAdminPassword(adminId);
          showNotification(notificationHelpers.success(
            'Password Reset',
            `Password reset successfully! New temporary password: ${newPassword}`
          ));
        } catch (error) {
          console.error('Error resetting password:', error);
          showNotification(notificationHelpers.error(
            'Reset Failed',
            'Failed to reset password. Please try again.'
          ));
        }
      }
    });
  };

  // Form management functions
  const resetForm = () => {
    setNewTenant({
      name: '',
      slug: '',
      subdomain: '',
      status: 'active',
      proprietorName: '',
      phoneNumber: '',
      address: '',
      gstNumber: ''
    });
    setSlugCheckStatus('idle');
    setSlugError('');
    setSlugSuggestions([]);
    setIsSlugManuallyEdited(false);
    if (checkTimeout) {
      clearTimeout(checkTimeout);
      setCheckTimeout(null);
    }
  };

  const handleSlugChange = useCallback((value: string) => {
    const sanitized = sanitizeSlug(value);
    setNewTenant(prev => ({ ...prev, slug: sanitized, subdomain: sanitized }));
    setSlugSuggestions([]);

    if (checkTimeout) {
      clearTimeout(checkTimeout);
    }

    if (!sanitized || sanitized.length < 3) {
      setSlugCheckStatus('idle');
      setSlugError('');
      return;
    }

    setSlugCheckStatus('checking');
    setSlugError('');

    const timeout = setTimeout(async () => {
      const isAvailable = await checkSlugAvailability(sanitized);

      if (isAvailable) {
        setSlugCheckStatus('available');
        setSlugError('');
      } else {
        setSlugCheckStatus('taken');
        setSlugError('URL Slug is already taken');
        // Generate simple suggestions by appending numbers
        const suggestions = [
          `${sanitized}1`,
          `${sanitized}2`,
          `${sanitized}-app`
        ];
        setSlugSuggestions(suggestions);
      }
    }, 500);

    setCheckTimeout(timeout);
  }, [checkTimeout]);

  const handleCompanyNameChange = (name: string) => {
    setNewTenant(prev => ({ ...prev, name }));
    if (!isSlugManuallyEdited && !editingTenant) {
      const generated = sanitizeSlug(name);
      handleSlugChange(generated);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Tenant management functions
  const handleCreateTenant = async () => {
    try {
      if (!newTenant.name || !newTenant.slug) {
        showNotification(notificationHelpers.error(
          'Validation Error',
          'Please fill in all required fields (Company Name and Subdomain)'
        ));
        return;
      }

      if (!editingTenant && slugCheckStatus !== 'available') {
        showNotification(notificationHelpers.error(
          'Validation Error',
          'Please ensure the slug is available'
        ));
        return;
      }

      const tenantData: TenantInsert = {
        name: newTenant.name!,
        slug: newTenant.slug!.toLowerCase(),
        subdomain: newTenant.slug!.toLowerCase(),
        status: newTenant.status!,
        proprietor_name: newTenant.proprietorName || '',
        phone_number: newTenant.phoneNumber || '',
        address: newTenant.address || '',
        gst_number: newTenant.gstNumber || '',
        settings: {
          branding: {},
          features: {
            voip: true,
            sms: false,
            analytics: true,
            apiAccess: false
          }
        },
        created_by: user.id
      };

      const createdTenant = await createTenant(tenantData);
      setTenants([...tenants, createdTenant]);
      setShowCompanyModal(false);
      setEditingTenant(null);
      setViewingTenant(null);
      resetForm();
      showNotification(notificationHelpers.success(
        'Tenant Created',
        `Tenant "${tenantData.name}" created successfully!`
      ));
    } catch (error) {
      console.error('Error creating tenant:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create tenant. Please check all fields and try again.';
      showNotification(notificationHelpers.error(
        'Failed to Create Tenant',
        errorMessage
      ));
    }
  };

  const handleUpdateTenant = async () => {
    try {
      if (!editingTenant) return;

      console.log('Updating tenant with data:', newTenant);
      const updatedTenant = await updateTenant(editingTenant.id, newTenant);
      setTenants(tenants.map(t => t.id === editingTenant.id ? updatedTenant : t));
      setEditingTenant(null);
      setViewingTenant(null);
      setShowCompanyModal(false);
      resetForm();
      showNotification(notificationHelpers.success(
        'Tenant Updated',
        `Tenant "${updatedTenant.name}" updated successfully!`
      ));
    } catch (error) {
      console.error('Error updating tenant:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      showNotification(notificationHelpers.error(
        'Update Failed',
        'Failed to update tenant. Please try again.'
      ));
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;

    showConfirmation({
      title: 'Delete Tenant',
      message: `Are you sure you want to delete tenant "${tenant.name}"? This will permanently remove all tenant data and cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteTenant(tenantId);
          setTenants(tenants.filter(t => t.id !== tenantId));
          setViewingTenant(null);
          setEditingTenant(null);
          setShowCompanyModal(false);
          resetForm();
          showNotification(notificationHelpers.success(
            'Tenant Deleted',
            `Tenant "${tenant.name}" has been deleted successfully.`
          ));
        } catch (error) {
          console.error('Error deleting tenant:', error);
          showNotification(notificationHelpers.error(
            'Delete Failed',
            'Failed to delete tenant. Please try again.'
          ));
        }
      }
    });
  };

  const menuItems = [
    { name: 'Dashboard', icon: Home, active: activeSection === 'dashboard', onClick: () => setActiveSection('dashboard') },
    { name: 'Companies', icon: Building2, active: activeSection === 'companies', onClick: () => setActiveSection('companies') },
    { name: 'Enquiry', icon: MessageSquare, active: activeSection === 'enquiry', onClick: () => setActiveSection('enquiry') },
    { name: 'Testimonials', icon: MessageSquare, active: activeSection === 'testimonials', onClick: () => setActiveSection('testimonials') },
    { name: 'Social Media', icon: Globe, active: activeSection === 'social-media', onClick: () => setActiveSection('social-media') },
    { name: 'Page Docs', icon: FileText, active: activeSection === 'page-docs', onClick: () => setActiveSection('page-docs') },
  ];

  // Dynamic chart data
  // Dynamic chart data removed - mapped directly in render
  const renderDashboard = () => (
    <div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          icon={<Building2 className="w-6 h-6 text-white" />}
          title="Total Tenants"
          value={tenants.length}
          color="bg-blue-600"
        />
        <KPICard
          icon={<DollarSign className="w-6 h-6 text-white" />}
          title="Total Collections"
          value={`₹${(globalStats.totalCollected / 100000).toFixed(1)}L`}
          color="bg-green-600"
        />
        <KPICard
          icon={<Phone className="w-6 h-6 text-white" />}
          title="Total Connections"
          value={tenants.reduce((sum, t) => sum + (t.maxConnections || 0), 0)}
          color="bg-purple-600"
        />
        <KPICard
          icon={<UserCheck className="w-6 h-6 text-white" />}
          title="Total Users"
          value={tenants.reduce((sum, t) => sum + (t.maxUsers || 0), 0)}
          color="bg-red-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Company-wise Collections</h3>
          <div style={{ height: '350px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={tenants.map((t, i) => ({
                  name: t.name,
                  users: t.maxUsers,
                  fill: ['#3b82f6', '#ef4444', '#eab308', '#22c55e'][i % 4]
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="users" name="Active Users" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Collections Trend</h3>
          <div style={{ height: '350px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart
                data={globalStats.trend.length > 0 ? globalStats.trend : [
                  { month: 'Jan', amount: 0 },
                  { month: 'Feb', amount: 0 },
                  { month: 'Mar', amount: 0 },
                  { month: 'Apr', amount: 0 },
                  { month: 'May', amount: 0 },
                  { month: 'Jun', amount: 0 },
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
                <Tooltip formatter={(value: number | undefined) => [`₹${Number(value || 0).toLocaleString()}`, 'Collections']} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  name="Collections Trend"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Company Activities</h3>
          <div className="space-y-4">
            {globalStats.recentActivities.length > 0 ? (
              globalStats.recentActivities.map((activity, index) => (
                <ActivityItem
                  key={index}
                  company={activity.company}
                  action={activity.action}
                  status={activity.status}
                />
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent activities</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-4">
            {SYSTEM_STATUSES.map((status, index) => (
              <SystemStatusItem
                key={index}
                label={status.label}
                status={status.status}
                icon={status.icon}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompanies = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading tenants...</span>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Company Management Header */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tenant Management</h3>
            <p className="text-sm text-gray-600">Manage all tenants and their settings</p>
          </div>
          <button
            onClick={() => setShowCompanyModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Tenant
          </button>
        </div>

        {/* Tenants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((tenant) => (
            <div key={tenant.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${tenant.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{tenant.name}</h4>
                    <p className="text-sm text-gray-600 font-mono">
                      {tenant.slug}
                    </p>
                  </div>
                </div>
                <StatusBadge status={tenant.plan || 'basic'} type="plan" />
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <StatusBadge status={tenant.status} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Proprietor:</span>
                  <span className="font-medium">{tenant.proprietorName || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{tenant.phoneNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Address:</span>
                  <span className="font-medium text-xs truncate max-w-[150px]" title={tenant.address || 'N/A'}>{tenant.address || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST:</span>
                  <span className="font-medium text-xs">{tenant.gstNumber || 'N/A'}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const fullUrl = `${window.location.origin}/${tenant.slug}`;
                    navigator.clipboard.writeText(fullUrl);
                    showNotification(notificationHelpers.success(
                      'URL Copied',
                      `URL Slug copied to clipboard!`
                    ));
                  }}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg flex items-center justify-center"
                  title="Copy URL Slug"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const fullUrl = `${window.location.origin}/${tenant.slug}`;
                    window.open(fullUrl, '_blank');
                  }}
                  className="bg-green-50 hover:bg-green-100 text-green-600 px-3 py-2 rounded-lg flex items-center justify-center"
                  title="Open Login Page"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setEditingTenant(tenant);
                    setNewTenant({
                      name: tenant.name,
                      slug: tenant.slug,
                      subdomain: tenant.subdomain,
                      status: tenant.status,
                      proprietorName: tenant.proprietorName || '',
                      phoneNumber: tenant.phoneNumber || '',
                      address: tenant.address || '',
                      gstNumber: tenant.gstNumber || ''
                    });
                    setShowCompanyModal(true);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center justify-center"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setViewingTenant(tenant);
                  }}
                  className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </button>
                <button
                  onClick={() => handleDeleteTenant(tenant.id)}
                  className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {tenants.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first tenant.</p>
            <button
              onClick={() => setShowCompanyModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
            >
              Create First Tenant
            </button>
          </div>
        )}
      </div>
    );
  };








  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return renderDashboard();
      case 'companies': return renderCompanies();
      case 'enquiry': return <EnquiryManagement />;
      case 'testimonials': return <TestimonialManagement />;
      case 'social-media': return <SocialMediaManagement />;
      case 'page-docs': return <PageDocManagement />;
      default: return renderDashboard();
    }
  };

  return (
    <Layout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Shakthi - Super Admin"
      roleColor="bg-red-500"
    >
      {renderContent()}

      {/* Tenant Creation/Edit Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTenant ? 'Edit Tenant' : 'Create New Tenant'}
              </h3>
              <button
                onClick={() => {
                  setShowCompanyModal(false);
                  setEditingTenant(null);
                  setViewingTenant(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={newTenant.name || ''}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Slug *
                </label>
                <div className="space-y-2">
                  <div className="flex">
                    <input
                      type="text"
                      value={newTenant.slug || ''}
                      onChange={(e) => {
                        setIsSlugManuallyEdited(true);
                        handleSlugChange(e.target.value);
                      }}
                      disabled={!!editingTenant}
                      className={`flex-1 px-3 py-2 border rounded-l-lg focus:ring-2 focus:border-transparent transition-colors ${editingTenant
                        ? 'bg-gray-100 cursor-not-allowed border-gray-300'
                        : slugCheckStatus === 'available'
                          ? 'border-green-500 focus:ring-green-500'
                          : slugCheckStatus === 'taken' || slugCheckStatus === 'invalid'
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      placeholder="companyname"
                    />
                    <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 text-gray-600 flex items-center text-xs">
                      /login
                    </span>
                    <div className="ml-2 flex items-center justify-center w-10">
                      {slugCheckStatus === 'checking' && (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      )}
                      {slugCheckStatus === 'available' && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {(slugCheckStatus === 'taken' || slugCheckStatus === 'invalid') && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>

                  {slugCheckStatus === 'available' && (
                    <div className="flex items-start space-x-2 text-xs text-green-700 bg-green-50 p-2 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">URL Slug is available!</p>
                        <p className="text-green-600 mt-1 font-mono break-all">
                          {window.location.origin}/{newTenant.slug || ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {(slugCheckStatus === 'taken' || slugCheckStatus === 'invalid') && slugError && (
                    <div className="text-xs text-red-700 bg-red-50 p-2 rounded-lg">
                      <p className="font-medium">{slugError}</p>
                      {slugSuggestions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-red-600 mb-1">Try these alternatives:</p>
                          <div className="flex flex-wrap gap-1">
                            {slugSuggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => handleSlugChange(suggestion)}
                                className="px-2 py-1 bg-white text-red-700 border border-red-200 rounded hover:bg-red-100 transition-colors text-xs"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {editingTenant && (
                    <p className="text-xs text-gray-500">
                      URL Slug cannot be changed after creation
                    </p>
                  )}

                  {!editingTenant && slugCheckStatus === 'idle' && (
                    <p className="text-xs text-gray-500">
                      Enter at least 3 characters (lowercase letters, numbers, hyphens only)
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proprietor Name
                </label>
                <input
                  type="text"
                  value={newTenant.proprietorName || ''}
                  onChange={(e) => setNewTenant({ ...newTenant, proprietorName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter proprietor name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newTenant.phoneNumber || ''}
                  onChange={(e) => setNewTenant({ ...newTenant, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={newTenant.address || ''}
                  onChange={(e) => setNewTenant({ ...newTenant, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter full address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST Number
                </label>
                <input
                  type="text"
                  value={newTenant.gstNumber || ''}
                  onChange={(e) => setNewTenant({ ...newTenant, gstNumber: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="XXAAAAA0000A1Z5"
                />
              </div>

              {/* Status Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Status
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => setNewTenant({ ...newTenant, status: 'active' })}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${newTenant.status === 'active'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTenant({ ...newTenant, status: 'inactive' })}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${newTenant.status === 'inactive'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCompanyModal(false);
                  setEditingTenant(null);
                  setViewingTenant(null);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={editingTenant ? handleUpdateTenant : handleCreateTenant}
                disabled={!newTenant.name || !newTenant.slug || (!editingTenant && slugCheckStatus !== 'available')}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingTenant ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tenant View Modal */}
      {viewingTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Tenant Details</h3>
              <button
                onClick={() => setViewingTenant(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{viewingTenant.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL Slug
                  </label>
                  <div className="flex items-center space-x-2">
                    <p className="flex-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-lg font-mono text-sm break-all">
                      {window.location.origin}/{viewingTenant.slug}
                    </p>
                    <button
                      onClick={() => {
                        copyToClipboard(`${window.location.origin}/${viewingTenant.slug}`);
                        showNotification(notificationHelpers.success(
                          'URL Copied',
                          'URL Slug copied to clipboard!'
                        ));
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Copy URL Slug"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={getDomainConfig().getLoginUrl(viewingTenant.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="flex items-center space-x-2">
                  <StatusBadge status={viewingTenant.status} />
                  <span className="text-sm text-gray-600 capitalize">({viewingTenant.status})</span>
                </div>
              </div>

              {viewingTenant.proprietorName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proprietor Name
                  </label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{viewingTenant.proprietorName}</p>
                </div>
              )}

              {viewingTenant.phoneNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{viewingTenant.phoneNumber}</p>
                </div>
              )}

              {viewingTenant.address && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg whitespace-pre-line">{viewingTenant.address}</p>
                </div>
              )}

              {viewingTenant.gstNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST Number
                  </label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg font-mono">{viewingTenant.gstNumber}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created
                  </label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg text-sm">
                    {new Date(viewingTenant.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Updated
                  </label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg text-sm">
                    {new Date(viewingTenant.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Company Admin Management Section */}
              <div className="pt-6 border-t">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Company Admins</h4>
                  <button
                    onClick={() => setShowAdminModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Admin
                  </button>
                </div>

                <div className="space-y-3">
                  {tenantAdmins.map((admin) => (
                    <div key={admin.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h5 className="font-medium text-gray-900">{admin.name}</h5>
                            <StatusBadge status={admin.status} />
                          </div>
                          <p className="text-sm text-gray-600">Employee ID: {admin.employeeId}</p>
                          <p className="text-sm text-gray-600">{admin.email}</p>
                          {admin.lastLoginAt && (
                            <p className="text-xs text-gray-500">
                              Last login: {new Date(admin.lastLoginAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleToggleAdminStatus(admin.id)}
                            className={`px-2 py-1 rounded text-xs font-medium ${admin.status === 'active'
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                          >
                            {admin.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingAdmin(admin);
                              setNewAdmin({
                                name: admin.name,
                                employeeId: admin.employeeId,
                                email: admin.email,
                                password: '',
                                status: admin.status
                              });
                              setShowAdminModal(true);
                            }}
                            className="px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleResetPassword(admin.id)}
                            className="px-2 py-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded text-xs font-medium flex items-center"
                          >
                            <Key className="w-3 h-3 mr-1" />
                            Reset PW
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(admin.id)}
                            className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {tenantAdmins.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <UserIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">No company admins yet</p>
                      <p className="text-sm text-gray-500">Add the first admin to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  // Switch to edit mode
                  setEditingTenant(viewingTenant);
                  setViewingTenant(null);
                  setNewTenant({
                    name: viewingTenant.name,
                    slug: viewingTenant.slug,
                    status: viewingTenant.status,
                    proprietorName: viewingTenant.proprietorName || '',
                    phoneNumber: viewingTenant.phoneNumber || '',
                    address: viewingTenant.address || '',
                    gstNumber: viewingTenant.gstNumber || ''
                  });
                  setShowCompanyModal(true);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
              <button
                onClick={() => {
                  setViewingTenant(null);
                  setEditingTenant(null);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Management Modal */}
      {showAdminModal && viewingTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingAdmin ? 'Edit Admin' : 'Create Company Admin'}
              </h3>
              <button
                onClick={() => {
                  setShowAdminModal(false);
                  setEditingAdmin(null);
                  resetAdminForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Name *
                </label>
                <input
                  type="text"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter admin name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID *
                </label>
                <input
                  type="text"
                  value={newAdmin.employeeId}
                  onChange={(e) => setNewAdmin({ ...newAdmin, employeeId: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="EMPXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="admin@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingAdmin ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={editingAdmin ? 'Leave blank to keep current password' : 'Enter password'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Status
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => setNewAdmin({ ...newAdmin, status: 'active' })}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${newAdmin.status === 'active'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAdmin({ ...newAdmin, status: 'inactive' })}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${newAdmin.status === 'inactive'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAdminModal(false);
                  setEditingAdmin(null);
                  resetAdminForm();
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={editingAdmin ? handleUpdateAdmin : handleCreateAdmin}
                disabled={!newAdmin.name || !newAdmin.employeeId || !newAdmin.email || (!editingAdmin && !newAdmin.password)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingAdmin ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SuperAdminDashboard;