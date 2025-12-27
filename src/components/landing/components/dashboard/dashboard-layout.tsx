import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Phone,
  Users,
  Trophy,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Phone, label: "My Cases", href: "/dashboard/cases" },
  { icon: Users, label: "Team", href: "/dashboard/team" },
  { icon: Trophy, label: "Leaderboard", href: "/dashboard/leaderboard" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

const SidebarContent = () => {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand-purple flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-purple/20">S</div>
        <span className="text-2xl font-display font-bold text-gray-900">Shakti</span>
      </div>

      <div className="px-4 py-2">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-purple to-brand-blue text-white shadow-lg shadow-brand-purple/20 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-medium text-white/80 mb-1">Current Rank</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold font-display">#4</span>
              <span className="text-xs mb-1 text-white/80">Top 10%</span>
            </div>
          </div>
          {/* Decor */}
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/20 rounded-full blur-xl"></div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {sidebarItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${isActive
                ? "bg-brand-purple/10 text-brand-purple font-semibold"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}>
                <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : "stroke-[2px]"}`} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-10 h-10 rounded-full bg-gray-100" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">Alex Morgan</p>
            <p className="text-xs text-gray-500 truncate">Senior Agent</p>
          </div>
          <LogOut className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
        </div>
      </div>
    </div>
  );
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50/50 flex font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-72 border-r-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900 hidden sm:block">Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search cases, names..."
                className="pl-9 pr-4 py-2 rounded-full bg-gray-100 border-transparent focus:bg-white focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 outline-none text-sm w-64 transition-all"
              />
            </div>

            <div className="relative">
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
              <Button variant="ghost" size="icon" className="rounded-full text-gray-500 hover:text-brand-purple hover:bg-brand-purple/5">
                <Bell className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
