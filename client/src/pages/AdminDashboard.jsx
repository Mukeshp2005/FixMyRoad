import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  RefreshCw,
  UserPlus,
  Trash2,
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  User,
  KeyRound,
  Shield,
  Briefcase,
  UserCheck
} from 'lucide-react';
import {
  getAdminStatsApi,
  getAdminUsersApi,
  createAdminUserApi,
  deleteAdminUserApi
} from '../services/municipalityComplaintService';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { user: currentUser } = useAuth();

  const [statsData, setStatsData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // User Creation Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'MUNICIPALITY_ADMIN',
    phone: ''
  });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [sRes, uRes] = await Promise.all([
        getAdminStatsApi(),
        getAdminUsersApi()
      ]);

      if (sRes.success && sRes.data) {
        setStatsData(sRes.data);
      }
      if (uRes.success && uRes.data?.users) {
        setUsers(uRes.data.users);
      }
    } catch (err) {
      setError(err.message || 'Failed to load Super Admin portal data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      setSuccessMessage('');

      const res = await createAdminUserApi(formData);
      if (res.success) {
        setSuccessMessage(`Account created successfully! ${formData.username} is ready to log in as ${formData.role}.`);
        setIsModalOpen(false);
        setFormData({
          name: '',
          email: '',
          username: '',
          password: '',
          role: 'MUNICIPALITY_ADMIN',
          phone: ''
        });
        loadDashboardData();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userToDelete) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to remove account "${userToDelete.username || userToDelete.email}"?`
    );
    if (!confirmDelete) return;

    try {
      setError('');
      setSuccessMessage('');
      const res = await deleteAdminUserApi(userToDelete._id);
      if (res.success) {
        setSuccessMessage(`Account ${userToDelete.username || userToDelete.email} removed successfully.`);
        loadDashboardData();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to remove user account.');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-50 text-purple-900 border-purple-300 font-bold';
      case 'MUNICIPALITY_ADMIN':
      case 'MUNICIPALITY_OFFICER':
        return 'bg-cyan-50 text-cyan-900 border-cyan-300 font-bold';
      case 'CITIZEN':
        return 'bg-emerald-50 text-emerald-900 border-emerald-300';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-300';
    }
  };

  const stats = statsData?.stats;

  return (
    <div className="py-10 px-6 max-w-7xl mx-auto space-y-10 bg-[#f9f8f6]">
      {/* Header */}
      <div className="editorial-panel p-8 border border-[#e5e5e0] bg-white flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 text-[10px] font-bold uppercase tracking-[0.2em] text-purple-700 border border-purple-200 px-3 py-1 bg-purple-50 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
            <span>GLOBAL SUPER ADMIN ACCESS COMMAND</span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-[0.15em] uppercase text-neutral-900">
            OFFICIAL USER & ACCESS MANAGEMENT
          </h1>
          <p className="text-xs text-neutral-500 font-light mt-1">
            Logged Super Admin: <span className="text-neutral-900 font-semibold">{currentUser?.name}</span> ({currentUser?.email})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadDashboardData}
            className="p-2.5 border border-[#e5e5e0] hover:border-neutral-900 text-neutral-700 transition-all cursor-pointer bg-white"
            title="Refresh User List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="editorial-btn text-xs bg-purple-900 text-white hover:bg-purple-800 cursor-pointer flex items-center"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            <span>CREATE NEW ACCOUNT</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Stats Summary */}
      {loading ? (
        <div className="p-12 text-center text-neutral-800">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-600" />
          <p className="text-xs text-neutral-500 mt-2 font-light">Loading user and system statistics...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="editorial-card p-5 border border-[#e5e5e0] bg-white space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">Total Registered Accounts</span>
            <p className="font-serif text-3xl font-bold text-neutral-900">{users.length}</p>
          </div>

          <div className="editorial-card p-5 border border-purple-200 bg-purple-50/40 space-y-1">
            <span className="text-[10px] font-bold text-purple-800 uppercase tracking-widest block">Govt Officials</span>
            <p className="font-serif text-3xl font-bold text-purple-900">
              {users.filter(u => u.role === 'MUNICIPALITY_ADMIN' || u.role === 'MUNICIPALITY_OFFICER').length}
            </p>
          </div>

          <div className="editorial-card p-5 border border-indigo-200 bg-indigo-50/40 space-y-1">
            <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest block">Super Admins</span>
            <p className="font-serif text-3xl font-bold text-indigo-900">
              {users.filter(u => u.role === 'SUPER_ADMIN').length}
            </p>
          </div>

          <div className="editorial-card p-5 border border-emerald-200 bg-emerald-50/40 space-y-1">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">Citizen Accounts</span>
            <p className="font-serif text-3xl font-bold text-emerald-900">
              {users.filter(u => u.role === 'CITIZEN').length}
            </p>
          </div>
        </div>
      )}

      {/* User Management Directory Table */}
      <div className="editorial-panel p-8 border border-[#e5e5e0] bg-white space-y-6">
        <div className="border-b border-[#e5e5e0] pb-4 flex items-center justify-between">
          <div>
            <p className="font-script-accent text-xl text-neutral-500">Access Control Center</p>
            <h2 className="font-serif text-2xl font-bold tracking-[0.15em] uppercase text-neutral-900">
              USER DIRECTORY & CREDENTIAL MANAGEMENT
            </h2>
          </div>
          <span className="text-xs text-neutral-500 font-light">
            Government officials created here gain instant access to inspect and act on all citizen complaints.
          </span>
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 text-xs font-light">No user accounts found in the database.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e5e5e0] text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Username / Login</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role Access</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0efe9]">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-[#f9f8f6] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-neutral-900 flex items-center space-x-2">
                      <UserCheck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{u.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                      {u.username || <span className="text-neutral-400 font-normal italic">No username</span>}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-700">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 text-[9px] border uppercase tracking-wider ${getRoleBadge(u.role)}`}>
                        {u.role === 'MUNICIPALITY_ADMIN' ? 'GOVT OFFICIAL (ADMIN)' : u.role === 'MUNICIPALITY_OFFICER' ? 'GOVT FIELD OFFICER' : u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-right">
                      {u._id === currentUser?._id ? (
                        <span className="text-[10px] text-neutral-400 italic">Current Session</span>
                      ) : (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="px-2.5 py-1 border border-rose-300 text-rose-700 hover:bg-rose-900 hover:text-white font-semibold text-[10px] uppercase tracking-wider transition-all cursor-pointer inline-flex items-center space-x-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>REMOVE</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Creating New Government Official or Admin Account */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-900 p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <div className="border-b border-[#e5e5e0] pb-4 flex justify-between items-center">
              <div>
                <p className="font-script-accent text-lg text-purple-700">Role Authorization</p>
                <h3 className="font-serif text-xl font-bold tracking-[0.1em] uppercase text-neutral-900">
                  CREATE OFFICIAL OR ADMIN ID
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-900 font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              {/* Role Selection */}
              <div>
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  1. SELECT TARGET ROLE *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 bg-white font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900"
                  required
                >
                  <option value="MUNICIPALITY_ADMIN">Govt Official Admin (Access to All Complaints)</option>
                  <option value="MUNICIPALITY_OFFICER">Govt Field Officer (Field Inspection & Status Actions)</option>
                  <option value="SUPER_ADMIN">System Super Admin (Full Governance Rights)</option>
                </select>
              </div>

              {/* Full Name */}
              <div>
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  2. FULL NAME *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Officer Rajesh Kumar"
                  className="w-full p-2.5 border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
                  required
                />
              </div>

              {/* Username for login */}
              <div>
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  3. USERNAME (LOGIN CREDENTIAL) *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                  placeholder="e.g. officer_rajesh or muniadmin2"
                  className="w-full p-2.5 border border-neutral-300 bg-white font-mono font-bold text-neutral-900 focus:outline-none focus:border-neutral-900"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  4. EMAIL ADDRESS *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. rajesh@fixmyroad.local"
                  className="w-full p-2.5 border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  5. ASSIGN PASSWORD *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full p-2.5 border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
                  minLength={6}
                  required
                />
              </div>

              {/* Phone Optional */}
              <div>
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  6. PHONE NUMBER (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                  className="w-full p-2.5 border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-[#e5e5e0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 font-semibold cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-900 text-white font-bold hover:bg-purple-800 cursor-pointer flex items-center space-x-1"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  <span>CONFIRM & CREATE ACCOUNT</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
