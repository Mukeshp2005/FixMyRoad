import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Camera, FileText, CheckCircle, Clock, AlertTriangle, RefreshCw, ChevronRight, MapPin, Building2, Calendar, KeyRound } from 'lucide-react';
import { getMyComplaintsApi } from '../services/complaintService';
import ChangePasswordModal from '../components/ChangePasswordModal';

const CitizenDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, inProgress: 0, resolved: 0, submitted: 0, rejected: 0 });
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await getMyComplaintsApi({ page: 1, limit: 5 });
      if (res.success && res.data) {
        const all = res.data.complaints || [];
        const total = res.data.pagination?.total || all.length;

        // Count by status from first page (approximate for small sets)
        const inProg = all.filter(c => ['IN_PROGRESS', 'ACCEPTED', 'ASSIGNED', 'UNDER_REVIEW'].includes(c.status)).length;
        const resolved = all.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length;
        const submitted = all.filter(c => c.status === 'SUBMITTED').length;
        const rejected = all.filter(c => c.status === 'REJECTED').length;

        setStats({ total, inProgress: inProg, resolved, submitted, rejected });
        setRecentComplaints(all);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const getStatusStyle = (st) => {
    switch (st) {
      case 'SUBMITTED': return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Submitted' };
      case 'UNDER_REVIEW':
      case 'ACCEPTED': return { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', label: st.replace('_', ' ') };
      case 'IN_PROGRESS':
      case 'ASSIGNED': return { bg: '#fffbeb', color: '#92400e', border: '#fde68a', label: st.replace('_', ' ') };
      case 'RESOLVED': return { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', label: 'Resolved' };
      case 'CLOSED': return { bg: '#f0fdf4', color: '#14532d', border: '#bbf7d0', label: 'Closed' };
      case 'REJECTED': return { bg: '#fff1f2', color: '#9f1239', border: '#fecdd3', label: 'Rejected' };
      default: return { bg: '#f9fafb', color: '#374151', border: '#e5e7eb', label: st };
    }
  };

  const getSeverityStyle = (sev) => {
    switch (sev) {
      case 'CRITICAL': return { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' };
      case 'HIGH': return { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
      case 'MEDIUM': return { bg: '#fffbeb', color: '#92400e', border: '#fde68a' };
      default: return { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 bg-[#f9f8f6]">
      {/* Header Banner */}
      <div className="editorial-panel p-6 sm:p-8 border border-[#e5e5e0] bg-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="frame-box text-sm">F</div>
            <div>
              <div className="flex items-center flex-wrap gap-3">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-[0.15em] uppercase text-neutral-900">
                  {user?.name}
                </h1>
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold px-2 py-0.5 border border-neutral-300 text-neutral-600 bg-[#f9f8f6]">
                  CITIZEN
                </span>
                {user?.isEmailVerified && (
                  <span className="text-[10px] uppercase tracking-[0.2em] font-semibold px-2 py-0.5 border border-emerald-300 text-emerald-700 bg-emerald-50">
                    ✓ VERIFIED
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 font-light mt-1">
                {user?.email} {user?.phone ? `• ${user.phone}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboard}
              className="p-2.5 border border-[#e5e5e0] hover:border-neutral-900 text-neutral-700 transition-all cursor-pointer bg-white"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsChangePasswordOpen(true)}
              className="px-3 py-2.5 border border-[#e5e5e0] hover:border-neutral-900 text-neutral-800 transition-all cursor-pointer bg-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5"
              title="Change Password"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Change Password</span>
            </button>
            <Link
              id="link-new-report"
              to="/citizen/report"
              className="editorial-btn text-xs flex items-center space-x-2"
            >
              <Camera className="w-4 h-4 mr-1" />
              <span>NEW DAMAGE REPORT</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="editorial-card p-5 border border-[#e5e5e0] bg-white space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Total Reports</span>
            <FileText className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="font-serif text-4xl font-bold text-neutral-900 tracking-wider">
            {loading ? '—' : stats.total}
          </p>
          <p className="text-xs text-neutral-500 font-light">Filed road complaints</p>
        </div>

        <div className="editorial-card p-5 border border-[#e5e5e0] bg-white space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Submitted</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="font-serif text-4xl font-bold text-blue-700 tracking-wider">
            {loading ? '—' : stats.submitted}
          </p>
          <p className="text-xs text-neutral-500 font-light">Awaiting review</p>
        </div>

        <div className="editorial-card p-5 border border-[#e5e5e0] bg-white space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">In Progress</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="font-serif text-4xl font-bold text-amber-700 tracking-wider">
            {loading ? '—' : stats.inProgress}
          </p>
          <p className="text-xs text-neutral-500 font-light">Under municipal repair</p>
        </div>

        <div className="editorial-card p-5 border border-[#e5e5e0] bg-white space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Resolved</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="font-serif text-4xl font-bold text-emerald-700 tracking-wider">
            {loading ? '—' : stats.resolved}
          </p>
          <p className="text-xs text-neutral-500 font-light">Verified road repairs</p>
        </div>
      </div>

      {/* Recent Complaints */}
      <div className="editorial-panel p-6 sm:p-8 border border-[#e5e5e0] bg-white space-y-5">
        <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-4">
          <div>
            <p className="font-script-accent text-xl text-neutral-500">My Submissions</p>
            <h2 className="font-serif text-2xl font-bold tracking-[0.15em] uppercase text-neutral-900">
              RECENT COMPLAINTS
            </h2>
          </div>
          <Link
            to="/citizen/complaints"
            className="text-xs font-semibold uppercase tracking-widest text-neutral-900 hover:underline flex items-center space-x-1"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-neutral-500 font-light">Loading your complaints...</p>
          </div>
        ) : recentComplaints.length === 0 ? (
          <div className="p-10 text-center space-y-4">
            <FileText className="w-12 h-12 text-neutral-300 mx-auto" />
            <div>
              <h3 className="font-serif text-lg font-bold text-neutral-700">No Complaints Yet</h3>
              <p className="text-xs text-neutral-500 font-light mt-1">
                Report your first road damage issue and track its resolution in real-time.
              </p>
            </div>
            <Link
              to="/citizen/report"
              className="inline-flex items-center space-x-2 px-5 py-2.5 border border-neutral-900 bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-700 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Report First Issue</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentComplaints.map((c) => {
              const statusStyle = getStatusStyle(c.status);
              const severityStyle = getSeverityStyle(c.severity);
              return (
                <Link
                  key={c._id}
                  to={`/citizen/complaints/${c.complaintId}`}
                  className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-[#e5e5e0] hover:border-neutral-900 bg-white hover:bg-[#fafaf9] transition-all cursor-pointer"
                >
                  <div className="flex items-start space-x-4">
                    {c.imageUrl && (
                      <img
                        src={c.imageUrl}
                        alt={c.complaintId}
                        className="w-14 h-14 object-cover border border-[#e5e5e0] shrink-0 bg-neutral-100"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div className="space-y-1.5">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-mono font-black text-sm text-neutral-900 group-hover:underline">
                          {c.complaintId}
                        </span>
                        <span
                          className="px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider"
                          style={{ background: statusStyle.bg, color: statusStyle.color, borderColor: statusStyle.border }}
                        >
                          {statusStyle.label}
                        </span>
                        <span
                          className="px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider"
                          style={{ background: severityStyle.bg, color: severityStyle.color, borderColor: severityStyle.border }}
                        >
                          {c.severity}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-neutral-700">
                        {c.issueType?.replace(/_/g, ' ')}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500 font-light">
                        {c.address && (
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{c.address}</span>
                          </span>
                        )}
                        {c.municipalityId?.name && (
                          <span className="flex items-center space-x-1">
                            <Building2 className="w-3 h-3" />
                            <span>{c.municipalityId.name}</span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:translate-x-1 group-hover:text-neutral-900 transition-all shrink-0 self-center" />
                </Link>
              );
            })}

            {stats.total > 5 && (
              <Link
                to="/citizen/complaints"
                className="flex items-center justify-center space-x-2 py-3 border border-[#e5e5e0] hover:border-neutral-900 text-xs font-semibold uppercase tracking-widest text-neutral-600 hover:text-neutral-900 transition-all bg-[#f9f8f6]"
              >
                <span>View All {stats.total} Complaints</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Status Legend / Info Panel */}
      <div className="editorial-panel p-6 border border-[#e5e5e0] bg-white">
        <p className="font-script-accent text-xl text-neutral-500 mb-1">Infrastructure Intelligence</p>
        <h3 className="font-serif text-lg font-bold tracking-[0.2em] uppercase text-neutral-900 mb-3">
          ESCALATION HIERARCHY
        </h3>
        <div className="line-divider max-w-xs mb-4">❖</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { level: '1', name: 'Ward Officer', color: '#2563eb', bg: '#eff6ff' },
            { level: '2', name: 'Zone Inspector', color: '#7c3aed', bg: '#f5f3ff' },
            { level: '3', name: 'Municipal Manager', color: '#b45309', bg: '#fffbeb' },
            { level: '4', name: 'District Authority', color: '#dc2626', bg: '#fff1f2' },
          ].map((item) => (
            <div
              key={item.level}
              className="p-4 border text-center space-y-1"
              style={{ background: item.bg, borderColor: item.color + '40' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black mx-auto mb-2"
                style={{ background: item.color }}
              >
                {item.level}
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: item.color }}>
                {item.name}
              </p>
              <p className="text-[10px] text-neutral-500 font-light">Auto-escalates in 2 min</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-neutral-500 font-light mt-4 text-center">
          Unresolved complaints automatically escalate through the hierarchy every 2 minutes during this live demo.
        </p>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

export default CitizenDashboard;
