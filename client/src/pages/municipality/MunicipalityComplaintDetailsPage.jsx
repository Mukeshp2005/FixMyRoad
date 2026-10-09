import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, MapPin, Sparkles, Clock, AlertCircle, Loader2, UserCheck, CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  getMunicipalityComplaintByIdApi,
  getMunicipalityOfficersApi,
  assignComplaintOfficerApi,
} from '../../services/municipalityComplaintService';
import { getComplaintHistoryApi } from '../../services/complaintService';
import LocationMap from '../../components/location/LocationMap';
import StatusUpdateModal from '../../components/municipality/StatusUpdateModal';
import { useAuth } from '../../context/AuthContext';

const MunicipalityComplaintDetailsPage = () => {
  const { complaintId } = useParams();
  const { user } = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [history, setHistory] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const cRes = await getMunicipalityComplaintByIdApi(complaintId);
      if (cRes.success && cRes.data?.complaint) {
        setComplaint(cRes.data.complaint);
        if (cRes.data.complaint.assignedTo?._id) {
          setSelectedOfficerId(cRes.data.complaint.assignedTo._id);
        }
      }

      try {
        const hRes = await getComplaintHistoryApi(complaintId);
        if (hRes && hRes.success && hRes.data?.history) {
          setHistory(hRes.data.history);
        }
      } catch (hErr) {
        console.warn('Complaint history notice:', hErr.message);
      }

      try {
        const oRes = await getMunicipalityOfficersApi();
        if (oRes && oRes.success && oRes.data?.officers) {
          setOfficers(oRes.data.officers);
        }
      } catch (officerErr) {
        console.warn('Officers fetch notice:', officerErr.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load complaint details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (complaintId) {
      loadData();
    }
  }, [complaintId]);

  const handleAssignOfficer = async () => {
    if (!selectedOfficerId) return;

    if (complaint.status !== 'ACCEPTED') {
      setError('Cannot assign officer: Complaint status must be ACCEPTED first.');
      return;
    }

    try {
      setIsAssigning(true);
      setError('');

      const res = await assignComplaintOfficerApi(complaintId, {
        assignedTo: selectedOfficerId,
        comment: 'Assigned to municipal officer',
      });

      if (res.success && res.data?.complaint) {
        setComplaint(res.data.complaint);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to assign officer.');
    } finally {
      setIsAssigning(false);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'SUBMITTED':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'UNDER_REVIEW':
      case 'ACCEPTED':
      case 'ASSIGNED':
      case 'IN_PROGRESS':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'REJECTED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-cyan-400 space-y-3">
        <Loader2 className="w-10 h-10 animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading municipal complaint details for {complaintId}...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="py-12 px-4 max-w-xl mx-auto space-y-4 text-center">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <h2 className="text-base font-bold">Unable to Load Complaint</h2>
          <p className="text-xs text-slate-300">{error || 'Complaint record not found.'}</p>
        </div>
        <Link
          to="/municipality/complaints"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-cyan-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Complaints Queue</span>
        </Link>
      </div>
    );
  }

  const lat = complaint.location?.coordinates?.[1];
  const lon = complaint.location?.coordinates?.[0];

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Header Breadcrumb & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <Link
            to="/municipality/complaints"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Complaints Queue</span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black font-mono text-white tracking-wider">
              {complaint.complaintId}
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(complaint.status)}`}>
              STATUS: {complaint.status}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getSeverityBadge(complaint.severity)}`}>
              {complaint.severity}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 hover:scale-[1.02] transition-all flex items-center space-x-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Update Workflow Status</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Photo & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo Preview */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>📸 Reported Road Image</span>
            </h2>
            <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800 max-h-96 flex items-center justify-center">
              <img
                src={complaint.imageUrl}
                alt={complaint.complaintId}
                className="max-h-96 w-auto object-contain rounded-xl"
              />
            </div>
          </div>

          {/* AI Detection Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>YOLO AI Damage Metrics</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold block">Primary Issue</span>
                <p className="text-white font-extrabold text-sm">{complaint.issueType}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold block">Confidence Score</span>
                <p className="text-cyan-400 font-extrabold text-sm">
                  {Math.round((complaint.aiConfidence || 0) * 100)}%
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold block">Report Count</span>
                <p className="text-white font-extrabold text-sm">{complaint.reportCount || 1}</p>
              </div>
            </div>

            {complaint.description && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                <span className="font-semibold text-slate-300 block">Citizen Description:</span>
                <p className="text-slate-400 italic">"{complaint.description}"</p>
              </div>
            )}
          </div>

          {/* Location & Map Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>Confirmed Geographic Location</span>
            </h2>

            {lat && lon && (
              <LocationMap
                lat={lat}
                lon={lon}
                source={complaint.locationSource || 'GPS'}
              />
            )}

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
              <p className="font-semibold text-white text-sm">{complaint.address || 'Captured Location'}</p>
              <p className="text-slate-400">
                {[complaint.city, complaint.district, complaint.state, complaint.postalCode].filter(Boolean).join(', ')}
              </p>
              <p className="text-slate-500 font-mono text-[11px] pt-1">
                Coords: {lat?.toFixed(6)}, {lon?.toFixed(6)} • Source: {complaint.locationSource || 'GPS'}
              </p>
            </div>
          </div>

          {/* Resolution Evidence Display */}
          {(complaint.resolutionComment || complaint.resolutionImage) && (
            <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Resolution Proof Evidence</span>
              </h2>

              {complaint.resolutionComment && (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                  <span className="text-slate-400 font-semibold block">Resolution Notes:</span>
                  <p className="text-emerald-300 font-medium">{complaint.resolutionComment}</p>
                </div>
              )}

              {complaint.resolutionImage && (
                <div className="space-y-2">
                  <span className="text-xs text-slate-300 font-semibold block">Resolution Evidence Photo:</span>
                  <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800 max-h-80 flex items-center justify-center">
                    <img
                      src={complaint.resolutionImage}
                      alt="Resolution Proof Evidence"
                      className="max-h-80 w-auto object-contain rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Officer Assignment & History Timeline */}
        <div className="space-y-6">
          {/* Officer Assignment Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>Officer Assignment</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Assigned Municipal Officer</label>
                <select
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  disabled={user?.role !== 'MUNICIPALITY_ADMIN'}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                >
                  <option value="">-- Unassigned --</option>
                  {officers.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.name} ({o.role})
                    </option>
                  ))}
                </select>
              </div>

              {user?.role === 'MUNICIPALITY_ADMIN' && (
                <button
                  type="button"
                  onClick={handleAssignOfficer}
                  disabled={isAssigning || !selectedOfficerId || complaint.status !== 'ACCEPTED'}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Assigning Officer...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assign Officer (ACCEPTED → ASSIGNED)</span>
                    </>
                  )}
                </button>
              )}

              {complaint.status !== 'ACCEPTED' && (
                <p className="text-[11px] text-slate-500 italic">
                  Note: Officer assignment requires complaint status to be ACCEPTED.
                </p>
              )}
            </div>
          </div>

          {/* Hierarchy Level Card */}
          {complaint.currentHierarchyLevelId && (
            <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 bg-amber-950/10 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>🏛️</span>
                <span>Escalation Authority Level</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-500/30">
                  <span className="text-amber-400/70 block font-semibold mb-1">Current Authority</span>
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                      {complaint.currentHierarchyLevelId.levelOrder}
                    </span>
                    <p className="text-amber-300 font-bold text-sm">
                      {complaint.currentHierarchyLevelId.levelName}
                    </p>
                  </div>
                </div>

                {complaint.slaDeadline && (
                  <div className={`p-3 rounded-xl border ${new Date(complaint.slaDeadline) < new Date() ? 'bg-rose-900/20 border-rose-500/30' : 'bg-slate-900/80 border-slate-800'}`}>
                    <span className="text-slate-400 block font-semibold mb-1">SLA Deadline</span>
                    <p className={`font-bold text-sm ${new Date(complaint.slaDeadline) < new Date() ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {new Date(complaint.slaDeadline) < new Date() ? '⚠️ SLA BREACHED' : '✓ SLA Active'}
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {new Date(complaint.slaDeadline).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <span className="text-slate-400 font-semibold block">Escalation Hierarchy:</span>
                  {[
                    { level: 1, name: 'Ward Officer' },
                    { level: 2, name: 'Zone Inspector' },
                    { level: 3, name: 'Municipal Manager' },
                    { level: 4, name: 'District Authority' },
                  ].map((item) => {
                    const current = complaint.currentHierarchyLevelId.levelOrder;
                    const isPast = item.level < current;
                    const isCurrent = item.level === current;
                    return (
                      <div
                        key={item.level}
                        className={`flex items-center space-x-2 p-2 rounded-lg text-[11px] font-semibold ${
                          isCurrent
                            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                            : isPast
                            ? 'bg-rose-900/20 border border-rose-500/20 text-rose-400/70'
                            : 'bg-slate-900/40 border border-slate-800 text-slate-500'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                          isCurrent ? 'bg-amber-500 text-white' : isPast ? 'bg-rose-700 text-white' : 'bg-slate-700 text-slate-400'
                        }`}>
                          {item.level}
                        </span>
                        <span>{item.name}</span>
                        {isCurrent && <span className="ml-auto text-[10px] bg-amber-500/30 px-1.5 py-0.5 rounded">ACTIVE</span>}
                        {isPast && <span className="ml-auto text-[10px] text-rose-400">skipped</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Status History Timeline */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Immutable Lifecycle History</span>
            </h2>

            {history.length === 0 ? (
              <p className="text-xs text-slate-500">No status changes recorded yet.</p>
            ) : (
              <div className="space-y-4 relative pl-4 border-l-2 border-slate-800 text-xs">
                {history.map((item, idx) => (
                  <div key={idx} className="relative space-y-1">
                    <div className="absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full bg-cyan-500 border-2 border-slate-900" />
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(item.newStatus)}`}>
                      {item.newStatus}
                    </span>
                    <p className="text-slate-300 pt-0.5">{item.comment || 'Status updated'}</p>
                    <p className="text-[10px] text-slate-500">
                      By {item.updatedBy?.name || 'System'} ({item.updatedBy?.role || 'SYSTEM'}) • {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      <StatusUpdateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        complaintId={complaintId}
        currentStatus={complaint.status}
        onSuccess={(updated) => {
          setComplaint(updated);
          loadData();
        }}
      />
    </div>
  );
};

export default MunicipalityComplaintDetailsPage;
