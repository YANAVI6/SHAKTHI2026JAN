import React, { useState, useMemo, useCallback } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { useEmployees } from '../../hooks/useEmployees';
import { useTenantName } from '../../hooks/useTenantName';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../shared/Modal';
import { employeeService } from '../../services/employeeService';
import { BulkUploadModal } from './forms/BulkUploadModal';
import { ViewEmployeeModal } from './forms/ViewEmployeeModal';
import { DashboardOverview } from './sections/DashboardOverview';
import { UserManagement } from './sections/UserManagement';
import { TeamManagement } from './sections/TeamManagement';
import { ProductManagement } from './sections/ProductManagement';
import { ReportsSection } from './sections/ReportsSection';
import { ActivityTracker } from './sections/ActivityTracker';
import { ColumnConfiguration } from './sections/ColumnConfiguration';
import { OfficeTimingSettings } from './sections/OfficeTimingSettings';
import { LiveMonitoring } from './sections/LiveMonitoring';
import Layout from '../Layout';
import type { Employee } from '../../types/employee';
import { AddEmployeeForm } from './forms/AddEmployeeForm';
import { EditEmployeeForm } from './forms/EditEmployeeForm';
import { AddProductForm } from './forms/AddProductForm';
import { EditProductForm } from './forms/EditProductForm';
import {
  Home,
  Users,
  FileText,
  Settings,
  Activity,
  Bell,
  Clock,
  AlertCircle,
  Monitor,
  LayoutGrid
} from 'lucide-react';
import { NotificationManager } from './sections/NotificationManager';
import { CaseListSection } from '../shared/CaseListSection';
import { PTPAlertSection } from '../shared/reports/PTPAlertSection';
import { CallbackAlertSection } from '../shared/reports/CallbackAlertSection';
import { CaseDetailsModal } from '../TelecallerDashboard/CaseDetailsModal';
import { CustomerCase } from '../TelecallerDashboard/types';
import { useToast } from '../TelecallerDashboard/hooks';
import ToastContainer from '../TelecallerDashboard/ToastContainer';

interface CompanyAdminDashboardProps {
  user: {
    id: string;
    name: string;
    role: string;
    tenantId?: string;
    email?: string;
    empId?: string;
  };
  onLogout: () => void;
}

interface UploadError {
  row: number;
  error: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

export const CompanyAdminDashboard: React.FC<CompanyAdminDashboardProps> = ({ user, onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedCase, setSelectedCase] = useState<CustomerCase | null>(null);
  const toast = useToast();

  // Fetch tenant name
  const { tenantName } = useTenantName(user?.tenantId);

  // Custom hooks for state management
  const {
    products,
    addProduct
  } = useProducts(user?.tenantId);

  const {
    employees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    loadEmployees,
    isLoading: employeesLoading
  } = useEmployees();

  // Modal management (cleaner than individual modal states)
  const addEmployeeModal = useModal<Partial<Employee>>();
  const editEmployeeModal = useModal<Employee>();
  const viewEmployeeModal = useModal<Employee>();
  const bulkUploadModal = useModal<{
    isUploading: boolean;
    uploadProgress: number;
    uploadResults: {
      successful: number;
      failed: number;
      errors: UploadError[];
    } | null;
  }>();
  const addProductModal = useModal();
  const editProductModal = useModal<string>();

  // Memoized filtered data
  const teamIncharges = useMemo(
    () => employees.filter((emp: Employee) => emp.role === 'TeamIncharge'),
    [employees]
  );
  const telecallers = useMemo(
    () => employees.filter((emp: Employee) => emp.role === 'Telecaller'),
    [employees]
  );

  // Event handlers with useCallback
  const handleCreateEmployee = useCallback(async (employeeData: Partial<Employee>) => {
    try {
      if (!user.tenantId) {
        toast.error('Error', 'Tenant ID is missing');
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await createEmployee(user.tenantId, user.id, employeeData as any);
      toast.success('Success!', `Employee ${employeeData.name} created successfully`);
      addEmployeeModal.close();
    } catch (error) {
      console.error('Error creating employee:', error);
      toast.error('Failed', 'Failed to create employee. Please try again.');
    }
  }, [createEmployee, user.tenantId, user.id, addEmployeeModal, toast]);

  const handleUpdateEmployee = useCallback(async (id: string, updates: Partial<Employee>) => {
    try {
      await updateEmployee(id, updates);
      toast.success('Success!', `Employee ${updates.name || 'information'} updated successfully`);
      editEmployeeModal.close();
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Failed', 'Failed to update employee. Please try again.');
    }
  }, [updateEmployee, editEmployeeModal, toast]);

  const handleCreateProduct = useCallback(async (name: string) => {
    try {
      if (!user.tenantId) {
        alert('Tenant ID is missing');
        return;
      }
      await addProduct(name, user.tenantId);
      addProductModal.close();
    } catch (error) {
      console.error('Error creating product:', error);
      alert((error instanceof Error ? error.message : 'Unknown error') || 'Failed to create product. Please try again.');
    }
  }, [addProduct, user.tenantId, addProductModal]);

  const handleBulkDeleteEmployees = useCallback(async (employeeIds: string[]) => {
    try {
      if (!user.tenantId) {
        alert('Tenant ID is missing');
        return;
      }
      const result = await employeeService.bulkDeleteEmployees(employeeIds);
      await loadEmployees(user.tenantId); // Refresh the employee list

      if (result.failed > 0) {
        alert(`Deleted ${result.successful} employee(s) successfully. ${result.failed} failed. Check console for details.`);
        console.log('Bulk delete errors:', result.errors);
      } else {
        alert(`Successfully deleted ${result.successful} employee(s)`);
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('Failed to delete employees. Please try again.');
    }
  }, [user.tenantId, loadEmployees]);

  const handleViewEmployee = useCallback((employee: Employee) => {
    viewEmployeeModal.open(employee);
  }, [viewEmployeeModal]);

  const handleResetPassword = useCallback(async (employeeId: string): Promise<string> => {
    try {
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) throw new Error('Employee not found');

      if (!confirm(`Reset password for ${employee.name}?`)) {
        throw new Error('User cancelled');
      }

      const newPassword = await employeeService.resetEmployeePassword(employeeId);
      toast.success('Password Reset', `New temporary password: ${newPassword}`);
      return newPassword;
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Failed', 'Failed to reset password. Please try again.');
      throw error;
    }
  }, [employees, toast]);


  // Load employees when component mounts
  React.useEffect(() => {
    if (user.tenantId) {
      loadEmployees(user.tenantId);
    }
  }, [user.tenantId, loadEmployees]);

  // Menu items for sidebar navigation
  const menuItems = [
    { name: 'DASHBOARD', icon: Home, active: activeSection === 'dashboard', onClick: () => setActiveSection('dashboard') },
    { name: 'All Cases', icon: LayoutGrid, active: activeSection === 'all-cases', onClick: () => setActiveSection('all-cases') },
    { name: 'Live Monitoring', icon: Monitor, active: activeSection === 'live-monitoring', onClick: () => setActiveSection('live-monitoring') },
    { name: 'Employee Management', icon: Users, active: activeSection === 'users', onClick: () => setActiveSection('users') },
    { name: 'Activity Tracker', icon: Activity, active: activeSection === 'activity', onClick: () => setActiveSection('activity') },
    { name: 'Office Timing', icon: Clock, active: activeSection === 'office-timing', onClick: () => setActiveSection('office-timing') },
    { name: 'Notification Manager', icon: Bell, active: activeSection === 'notifications', onClick: () => setActiveSection('notifications') },
    { name: 'Column Management', icon: Settings, active: activeSection === 'columns', onClick: () => setActiveSection('columns') },
    { name: 'Reports Dashboard', icon: FileText, active: activeSection === 'reports', onClick: () => setActiveSection('reports') },
    { name: 'PTP Alert', icon: AlertCircle, active: activeSection === 'ptp-alerts', onClick: () => setActiveSection('ptp-alerts') },
    { name: 'Callback Alert', icon: Bell, active: activeSection === 'callback-alerts', onClick: () => setActiveSection('callback-alerts') },
  ];


  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <DashboardOverview
            employees={employees}
            products={products}
            teamIncharges={teamIncharges}
            telecallers={telecallers}
          />
        );
      case 'live-monitoring':
        return <LiveMonitoring />;
      case 'users':
        return (
          <UserManagement
            employees={employees}
            onAddEmployee={addEmployeeModal.open}
            onEditEmployee={(emp: Employee) => editEmployeeModal.open(emp)}
            onDeleteEmployee={deleteEmployee}
            onBulkDelete={handleBulkDeleteEmployees}
            onBulkUpload={bulkUploadModal.open}
            onDownloadTemplate={employeeService.downloadTemplate}
            onViewEmployee={handleViewEmployee}
            onResetPassword={handleResetPassword}
            isLoading={employeesLoading}
          />
        );
      case 'teams':
        return <TeamManagement />;
      case 'products':
        return <ProductManagement />;
      case 'reports':
        return <ReportsSection />;
      case 'activity':
        return <ActivityTracker />;
      case 'office-timing':
        return <OfficeTimingSettings />;
      case 'notifications':
        return <NotificationManager />;
      case 'columns':
        return <ColumnConfiguration user={user} />;
      case 'ptp-alerts':
        return (
          <PTPAlertSection
            user={user}
            onCaseClick={(caseItem) => setSelectedCase(caseItem as unknown as CustomerCase)}
          />
        );
      case 'callback-alerts':
        return (
          <CallbackAlertSection
            user={user}
            onCaseClick={(caseItem) => setSelectedCase(caseItem as unknown as CustomerCase)}
          />
        );
      case 'all-cases':
        return (
          <CaseListSection
            user={user}
            onCaseClick={(caseItem) => setSelectedCase(caseItem as unknown as CustomerCase)}
          />
        );
      default:
        return (
          <DashboardOverview
            employees={employees}
            products={products}
            teamIncharges={teamIncharges}
            telecallers={telecallers}
          />
        );
    }
  };

  return (
    <Layout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Shakti - Company Admin"
      roleColor="bg-blue-500"
      tenantName={tenantName}
    >
      {renderContent()}


      {/* Case Details Modal */}
      {selectedCase && (
        <CaseDetailsModal
          isOpen={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          caseData={selectedCase}
          user={{
            id: user.id,
            empId: user.empId || '',
            tenantId: user.tenantId
          }}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onRemoveToast={toast.removeToast} />

      {/* Add Employee Modal */}
      <Modal
        isOpen={addEmployeeModal.isOpen}
        onClose={addEmployeeModal.close}
        title="Add New Employee"
        size="lg"
      >
        <AddEmployeeForm
          onSubmit={handleCreateEmployee}
          onCancel={addEmployeeModal.close}
          isLoading={employeesLoading}
        />
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={editEmployeeModal.isOpen}
        onClose={editEmployeeModal.close}
        title="Edit Employee"
        size="lg"
      >
        {editEmployeeModal.data && (
          <EditEmployeeForm
            employee={editEmployeeModal.data}
            onSubmit={(updates: Partial<Employee>) => handleUpdateEmployee(editEmployeeModal.data!.id, updates)}
            onCancel={editEmployeeModal.close}
            isLoading={employeesLoading}
          />
        )}
      </Modal>

      {/* Add Product Modal */}
      <Modal
        isOpen={addProductModal.isOpen}
        onClose={addProductModal.close}
        title="Add New Product"
      >
        <AddProductForm
          onSubmit={handleCreateProduct}
          onCancel={addProductModal.close}
        />
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        isOpen={bulkUploadModal.isOpen}
        onClose={() => {
          if (!bulkUploadModal.data?.isUploading) {
            bulkUploadModal.close();
          }
        }}
        title="Bulk Upload Employees"
        size="lg"
      >
        <BulkUploadModal
          isOpen={bulkUploadModal.isOpen}
          modalData={bulkUploadModal.data}
          onClose={bulkUploadModal.close}
          onUpload={async (file: File) => {
            try {
              bulkUploadModal.open({
                isUploading: true,
                uploadProgress: 0,
                uploadResults: null
              });

              if (!user.tenantId) {
                throw new Error('Tenant ID is missing');
              }

              const result = await employeeService.bulkUploadEmployees(user.tenantId, user.id, file);

              bulkUploadModal.open({
                isUploading: false,
                uploadProgress: 100,
                uploadResults: result
              });

              // Refresh employee list
              loadEmployees(user.tenantId);
            } catch (error) {
              bulkUploadModal.open({
                isUploading: false,
                uploadProgress: 0,
                uploadResults: {
                  successful: 0,
                  failed: 1,
                  errors: [{ row: 0, error: (error instanceof Error ? error.message : 'Unknown error') || 'Upload failed' }]
                }
              });
            }
          }}
        />
      </Modal>

      {/* View Employee Modal */}
      <ViewEmployeeModal
        isOpen={viewEmployeeModal.isOpen}
        onClose={viewEmployeeModal.close}
        employee={viewEmployeeModal.data || null}
        onUpdateEmployee={handleUpdateEmployee}
        onResetPassword={handleResetPassword}
        isLoading={employeesLoading}
      />

      {/* Edit Product Modal */}
      <Modal
        isOpen={editProductModal.isOpen}
        onClose={editProductModal.close}
        title="Edit Product"
      >
        {editProductModal.data && (
          <EditProductForm
            product={editProductModal.data}
            onSubmit={(name: string) => {
              // TODO: Implement product update functionality
              console.log('Update product:', editProductModal.data, 'to:', name);
              editProductModal.close();
            }}
            onCancel={editProductModal.close}
          />
        )}
      </Modal>
    </Layout>
  );
};