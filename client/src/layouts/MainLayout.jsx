import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { User, LogOut, LayoutDashboard, LogIn, UserPlus, Bell, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyNotificationsApi, markNotificationReadApi } from '../services/notificationService';
import ChangePasswordModal from '../components/ChangePasswordModal';

const MainLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await getMyNotificationsApi();
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
      }
    } catch (err) {
      // Ignore polling errors silently
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // 30s poll
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowBellDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (n) => {
    if (!n.read) {
      try {
        await markNotificationReadApi(n._id);
        setNotifications((prev) => prev.map((item) => (item._id === n._id ? { ...item, read: true } : item)));
      } catch (err) {
        // Continue navigation
      }
    }
    setShowBellDropdown(false);
    if (n.relatedComplaintId) {
      const cid = typeof n.relatedComplaintId === 'object' ? n.relatedComplaintId.complaintId : null;
      if (cid) {
        navigate(`/citizen/complaints/${cid}`);
      } else {
        navigate('/citizen/complaints');
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!user) return '/';
    if (user.role === 'SUPER_ADMIN') return '/admin/dashboard';
    if (user.role === 'MUNICIPALITY_ADMIN' || user.role === 'MUNICIPALITY_OFFICER') return '/municipality/dashboard';
    return '/citizen/dashboard';
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Header / Navbar — Professional Civic Government Site Style */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          {/* Brand & Emblem */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="frame-box group-hover:bg-slate-900 group-hover:text-white transition-colors">
              F
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-xl font-bold tracking-tight text-slate-900 uppercase">
                FixMyRoad
              </span>
              <span className="text-[10px] tracking-widest font-semibold text-slate-500 uppercase -mt-1">
                CIVIC INFRASTRUCTURE ENGINE
              </span>
            </div>
          </Link>

          {/* Nav Links / Actions */}
          <div className="flex items-center space-x-5">
            <Link
              to="/"
              className="text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 transition-colors hidden md:inline-block"
            >
              Overview
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Notification Bell Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    id="btn-nav-notifications"
                    type="button"
                    onClick={() => setShowBellDropdown(!showBellDropdown)}
                    className="relative p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-all cursor-pointer border border-slate-200"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
                    )}
                  </button>

                  {showBellDropdown && (
                    <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 shadow-2xl rounded-xl z-50 overflow-hidden text-xs">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <span className="font-bold text-slate-900 uppercase tracking-wider">Notifications</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold uppercase">
                          {unreadCount} unread
                        </span>
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-slate-500 font-light">No new notifications.</div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n._id}
                              onClick={() => handleNotificationClick(n)}
                              className={`p-4 hover:bg-slate-50 transition-all cursor-pointer space-y-1 ${
                                !n.read ? 'bg-blue-50/40' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`font-semibold ${!n.read ? 'text-blue-900' : 'text-slate-700'}`}>
                                  {n.title}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px] leading-relaxed font-light">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Link
                  to={getDashboardPath()}
                  className="civic-btn civic-btn-primary py-2.5 px-4 text-xs"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                  <span>Dashboard</span>
                </Link>

                <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  <span className="font-semibold text-slate-900">{user.name}</span>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                    {user.role}
                  </span>
                </div>

                {/* Change Password Button */}
                <button
                  type="button"
                  id="btn-nav-change-password"
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Change Password"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden md:inline">Password</span>
                </button>

                <button
                  id="btn-nav-logout"
                  onClick={handleLogout}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-950 uppercase tracking-wider px-2 py-1 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 inline mr-1" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  id="link-nav-login"
                  to="/login"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 px-3 py-2 transition-colors"
                >
                  Sign In
                </Link>

                <Link
                  id="link-nav-register"
                  to="/register"
                  className="civic-btn civic-btn-primary py-2.5 px-5 text-xs"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Change Password Modal for Authenticated User */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* Footer — Professional Municipal Portal Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="frame-box text-xs">F</div>
            <div>
              <p className="font-heading text-sm font-bold tracking-tight text-slate-900 uppercase">FIXMYROAD</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">AI Road Preservation Platform</p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <p className="text-xs font-medium text-slate-600">
              © {new Date().getFullYear()} FixMyRoad Civic Portal. Authorized Municipal Infrastructure System.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
