import React, { useState } from 'react';
import {
  LogOut,
  Menu,
  X,
  Users,
  Phone,
  Building2,
  Shield,
  UserCheck,
  Zap,
  Bell,
  MessageSquare
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Employee } from '../types/employee';
import type { CompanyAdmin } from '../types/admin';
import { ResizablePanel, ResizablePanelGroup } from './ui/resizable';
import { Rnd } from 'react-rnd';
import { ActivityMonitor } from './ActivityMonitor';
import { DiscountCalculator } from './DiscountCalculator';
import { Calculator } from 'lucide-react';

// Union type for all possible users
type User = Employee | CompanyAdmin | {
  id: string;
  name: string;
  role: string;
  tenantId?: string;
};

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
  menuItems: Array<{
    name: string;
    icon: LucideIcon;
    active?: boolean;
    onClick?: () => void;
    badge?: string | number;
  }>;
  title: string;
  roleColor: string;
  tenantName?: string;
  chatPanel?: React.ReactNode;
  isChatOpen?: boolean;
  onChatToggle?: () => void;
  unreadChatCount?: number;
  onNotificationClick?: () => void;
  notificationCount?: number;
  headerActions?: React.ReactNode;
}

const ROLE_ICONS: Record<string, LucideIcon> = {
  superadmin: Shield,
  companyadmin: Building2,
  teamincharge: UserCheck,
  telecaller: Phone,
};

const Layout: React.FC<LayoutProps> = ({
  user,
  onLogout,
  children,
  menuItems,
  title,
  roleColor,
  tenantName,
  chatPanel,
  isChatOpen = false,
  onChatToggle,
  unreadChatCount = 0,
  onNotificationClick,
  notificationCount = 0,
  headerActions,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const RoleIcon = ROLE_ICONS[user.role.toLowerCase()] || Users;

  return (
    <div className="flex h-screen bg-gray-50">
      <ActivityMonitor>
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}>
          <div className="flex items-center justify-center border-b border-gray-300 flex-shrink-0 bg-white h-20">
            <div className="flex items-center px-6 py-3">
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 rounded-2xl shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                  <Zap className="w-7 h-7 lg:w-8 lg:h-8 text-white relative z-10" strokeWidth={2.5} />
                </div>
                <div className="absolute -inset-1 border-2 border-orange-300/30 rounded-2xl animate-pulse"></div>
              </div>
              <div className="flex flex-col ml-4">
                <h2 className="text-xl lg:text-2xl font-bold text-black tracking-wide drop-shadow-sm">Shakthi</h2>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-black absolute right-4"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="mt-5 px-2 flex-1 overflow-y-auto">
            {menuItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={index}
                  onClick={item.onClick}
                  className={`${item.active
                    ? `${roleColor} text-white shadow-md`
                    : 'text-gray-700 hover:bg-slate-50 hover:text-slate-800'
                    } group flex items-center px-3 py-3 text-sm font-medium rounded-lg w-full mb-2 transition-all duration-200 border border-transparent hover:border-slate-200`}
                >
                  <IconComponent className="mr-3 flex-shrink-0 h-5 w-5" />
                  <span className="flex-1 text-left">{item.name}</span>
                  {item.badge && (
                    <span className={`ml-2 flex-shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold leading-none ${item.active ? 'bg-white ' + roleColor.replace('bg-', 'text-') : 'bg-blue-600 text-white shadow-sm'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex-shrink-0 w-full px-4 pt-4 pb-2">
            {onChatToggle && (
              <button
                onClick={onChatToggle}
                className="flex items-center w-full px-4 py-3 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 hover:shadow-md rounded-xl transition-all duration-200 border border-blue-100 group"
              >
                <div className="bg-white p-1.5 rounded-lg mr-3 shadow-sm group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <span className="flex-1 text-left">Team's Chat</span>
                {unreadChatCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm ring-2 ring-white">
                    {unreadChatCount > 99 ? '99+' : unreadChatCount}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="flex-shrink-0 w-full p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center mb-3">
              <div className={`${roleColor} rounded-full p-2 mr-3 shadow-md`}>
                <RoleIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-slate-600 font-medium">
                  {user.role === 'TeamIncharge' ? 'Team Incharge' :
                    user.role === 'CompanyAdmin' ? 'Company Admin' :
                      user.role === 'SuperAdmin' ? 'Super Admin' :
                        user.role === 'Telecaller' ? 'Telecaller' :
                          user.role}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-all duration-200 border border-slate-200"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0 min-w-0">
          {/* Top bar */}
          <header className="bg-white shadow-lg border-b border-gray-300 flex-shrink-0 h-20">
            <div className="flex items-center justify-between h-full px-4 lg:px-6">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-black hover:text-gray-700 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Tenant/Role Information */}
              <div className="flex items-center space-x-2 lg:space-x-3 flex-1 min-w-0">
                <div className={`${roleColor} rounded-lg p-2 flex-shrink-0`}>
                  <RoleIcon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm lg:text-base font-semibold text-black truncate">{title}</h2>
                  {tenantName && (
                    <p className="text-xs text-gray-700 font-medium truncate">{tenantName}</p>
                  )}
                  {!tenantName && (
                    <p className="text-xs text-gray-700 hidden sm:block">Tenant Dashboard</p>
                  )}
                </div>
                {headerActions && (
                  <div className="hidden lg:block lg:ml-8 lg:mr-4">
                    {headerActions}
                  </div>
                )}
              </div>

              {/* User Welcome Section */}
              <div className="flex items-center flex-shrink-0 ml-4 space-x-3">
                {/* Notification Bell */}
                <button
                  onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
                  className={`p-2 text-black transition-colors rounded-lg hover:bg-gray-100 mr-2 ${isCalculatorOpen ? 'bg-blue-50 text-blue-600' : ''}`}
                  title="Discount Calculator"
                >
                  <Calculator className="w-5 h-5" />
                </button>

                {/* Notification Bell */}
                <button
                  onClick={onNotificationClick}
                  className="relative p-2 text-black transition-colors rounded-lg hover:bg-gray-100"
                >
                  <Bell className="w-5 h-5" />
                  {/* Notification Badge */}
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[18px] h-[18px]">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
                </button>

                <div className="hidden md:flex items-center space-x-3 text-black">
                  <div className="text-right">
                    <p className="text-sm font-medium text-black">Welcome back</p>
                    <p className="text-xs text-gray-700">{user.name}</p>
                  </div>
                  <div className={`${roleColor} rounded-full p-2`}>
                    <RoleIcon className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main content area */}
          <ResizablePanelGroup
            direction="horizontal"
            className="flex-1 overflow-hidden h-full"
          >
            <ResizablePanel defaultSize={100} minSize={30} className="h-full">
              <main className="flex-1 overflow-y-auto p-4 lg:p-6 min-h-0 h-full">
                <div className="max-w-full">
                  {children}
                </div>
              </main>
            </ResizablePanel>
          </ResizablePanelGroup>

          {isChatOpen && chatPanel && (
            <Rnd
              default={{
                x: 20,
                y: 100,
                width: 400,
                height: 600
              }}
              minWidth={320}
              minHeight={300}
              bounds="window"
              className="z-50 shadow-2xl border border-gray-200 rounded-xl overflow-hidden bg-white"
              dragHandleClassName="chat-drag-handle"
            >
              <div className="flex flex-col h-full">
                {/* Drag Handle Area */}
                <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center justify-between px-3 cursor-move chat-drag-handle flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chat</span>
                  {/* Close button could go here if needed, but chatPanel usually handles its own close or parent does via isChatOpen */}
                </div>
                <div className="flex-1 overflow-hidden">
                  {chatPanel}
                </div>
              </div>
            </Rnd>
          )}

          {isCalculatorOpen && (
            <Rnd
              default={{
                x: 280, // Positioned after the sidebar
                y: 100,
                width: 320,
                height: 480
              }}
              minWidth={300}
              minHeight={400}
              bounds="window"
              className="z-[60] shadow-2xl border border-gray-200 rounded-xl overflow-hidden bg-white"
              dragHandleClassName="drag-handle"
            >
              <DiscountCalculator onClose={() => setIsCalculatorOpen(false)} />
            </Rnd>
          )}
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </ActivityMonitor>
    </div>
  );
};

export default Layout;