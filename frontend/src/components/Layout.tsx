import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Map, Building2, Key, Layers, ArrowDown,
  ShieldCheck, History, Database, Search, Bell,
  ChevronLeft, ChevronRight, Share2, Cpu, Fingerprint,
  ArrowUpDown, GitBranch, Sparkles, UploadCloud, PlusCircle,
  LogOut, UserCheck
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import clsx from 'clsx';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/map', icon: Map, label: '3D Map' },
  { path: '/properties', icon: Building2, label: 'Properties' },
  { path: '/vertical', icon: ArrowUpDown, label: 'Vertical View' },
  { path: '/underground', icon: ArrowDown, label: 'Underground' },
  { path: '/create-property', icon: PlusCircle, label: 'Create Property' },
  { path: '/dna', icon: Fingerprint, label: 'Property DNA' },
  { path: '/relationships', icon: Share2, label: 'Rights Graph' },
  { path: '/evidence', icon: Cpu, label: 'Evidence Fusion' },
  { path: '/history', icon: History, label: '4D History' },
  { path: '/ulpin', icon: Key, label: '3D ULPIN' },
  { path: '/validation', icon: ShieldCheck, label: 'Validation' },
  { path: '/whatif', icon: GitBranch, label: 'What-If Planning' },
  { path: '/ai-ml', icon: Sparkles, label: 'AI / ML Modules' },
  { path: '/import', icon: UploadCloud, label: 'Data Import' },
  { path: '/datasources', icon: Database, label: 'Data Sources' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const {
    sidebarOpen, setSidebarOpen,
    searchQuery, setSearchQuery,
    userRole, setUserRole,
    currentUser, logout
  } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/map?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className={clsx(
        'flex flex-col bg-white border-r border-slate-200 transition-all duration-300 flex-shrink-0 z-20 shadow-sm',
        sidebarOpen ? 'w-56' : 'w-14'
      )}>
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-3 py-3.5 border-b border-slate-200 bg-slate-50/50">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Layers className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 leading-tight">TerraX</p>
              <p className="text-[10px] text-slate-500 leading-tight">3D Property Intelligence for a Smarter Tomorrow</p>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                clsx('nav-item', isActive && 'active', !sidebarOpen && 'justify-center px-0')
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center justify-center p-2.5 border-t border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main Container */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-200 flex-shrink-0 shadow-xs z-10">
          {/* Global Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by 3D ULPIN, Parcel, Unit, or Building..."
                className="form-input pl-8 py-1 text-xs"
              />
            </div>
          </form>

          {/* Role Switcher & Badges */}
          <div className="flex items-center gap-2.5 ml-auto">
            {/* Real Open Data Pill */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-600 font-medium">
              <span>Open Data:</span>
              <strong className="text-blue-600">MS Footprints + OSM + ISRO DEM</strong>
            </div>

            {/* RBAC Role Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 font-semibold px-1.5">Role:</span>
              {(['Admin', 'Surveyor', 'Authority Viewer'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setUserRole(role)}
                  className={clsx(
                    'px-2 py-0.5 rounded text-[11px] font-medium transition-all',
                    userRole === role
                      ? 'bg-white text-blue-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Notification Icon */}
            <button
              aria-label="System Notifications"
              className="p-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-600" />
            </button>

            {/* Authenticated User Profile Badge */}
            {currentUser && (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs">
                  {currentUser.name ? currentUser.name.charAt(0) : 'U'}
                </div>
                <div className="text-left hidden lg:block leading-tight">
                  <p className="text-[11px] font-semibold text-slate-800 truncate max-w-[140px]" title={currentUser.name}>
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]" title={currentUser.email}>
                    {currentUser.email}
                  </p>
                </div>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              title="Sign Out of Session"
              aria-label="Sign Out"
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
