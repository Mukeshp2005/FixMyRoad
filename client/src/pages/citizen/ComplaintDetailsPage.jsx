import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, MapPin, Sparkles, Clock, AlertCircle, Loader2, CheckCircle2, RotateCcw, Star, Pencil, Trash2 } from 'lucide-react';
import { getComplaintByIdApi, getComplaintHistoryApi, updateComplaintApi, deleteComplaintApi } from '../../services/complaintService';
import LocationMap from '../../components/location/LocationMap';
import BoundingBoxOverlay from '../../components/ai/BoundingBoxOverlay';
import ResolutionFeedbackCard from '../../components/citizen/ResolutionFeedbackCard';
import ReopenRequestModal from '../../components/citizen/ReopenRequestModal';
import { useAuth } from '../../context/AuthContext';

const ComplaintDetailsPage = () => {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editTaluk, setEditTaluk] = useState('');
  const [editZone, setEditZone] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [cRes, hRes] = await Promise.all([
        getComplaintByIdApi(complaintId),
        getComplaintHistoryApi(complaintId),
      ]);

      if (cRes.success && cRes.data?.complaint) {
        setComplaint(cRes.data.complaint);
        setEditDescription(cRes.data.complaint.description || '');
        setEditTaluk(cRes.data.complaint.taluk || '');
        setEditZone(cRes.data.complaint.zone || '');
      }
      if (hRes.success && hRes.data?.history) {
        setHistory(hRes.data.history);
      }
    } catch (err) {
      setError(err.message || 'Failed to load complaint details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      const res = await updateComplaintApi(complaintId, {
        description: editDescription,
        taluk: editTaluk,
        zone: editZone,
      });
      if (res.success) {
        setIsEditing(false);
        loadData();
      } else {
        alert(res.message || 'Failed to update complaint');
      }
    } catch (err) {
      alert(err.message || 'Error updating complaint');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) return;
    try {
      setIsDeleting(true);
      const res = await deleteComplaintApi(complaintId);
      if (res.success) {
        navigate('/citizen/dashboard');
      } else {
        alert(res.message || 'Failed to delete complaint');
      }
    } catch (err) {
      alert(err.message || 'Error deleting complaint');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (complaintId) {
      loadData();
    }
  }, [complaintId]);

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
        <p className="text-xs text-slate-400">Loading complaint details for {complaintId}...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="py-12 px-4 max-w-xl mx-auto space-y-4 text-center">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <h2 className="text-base font-bold">Complaint Not Found</h2>
          <p className="text-xs text-slate-300">{error || 'Complaint record does not exist.'}</p>
        </div>
        <Link
          to="/citizen/complaints"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-cyan-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Complaints</span>
        </Link>
      </div>
    );
  }

  const lat = complaint.location?.coordinates?.[1];
  const lon = complaint.location?.coordinates?.[0];
  const isOwner = user && complaint.citizenId?._id ? user._id === complaint.citizenId._id : true;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Header Breadcrumb & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <Link
            to="/citizen/complaints"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Complaints</span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black font-mono text-white tracking-wider">
              {complaint.complaintId}
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(complaint.status)}`}>
              {complaint.status}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getSeverityBadge(complaint.severity)}`}>
              {complaint.severity}
            </span>
            {complaint.resolutionCycle > 1 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-purple-500/10 text-purple-400 border-purple-500/30">
                Cycle #{complaint.resolutionCycle}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isOwner && !['RESOLVED', 'CLOSED', 'REJECTED'].includes(complaint.status) && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30 text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Cancel Edit' : 'Edit Report'}</span>
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30 text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete</span>
              </button>
            </div>
          )}

          {complaint.citizenVerified && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Citizen Verified ({complaint.citizenRating} ★)</span>
            </div>
          )}
        </div>
      </div>

      {/* Inline Edit Form Panel */}
      {isEditing && (
        <div className="glass-panel p-6 rounded-2xl border border-cyan-500/40 bg-cyan-950/20 space-y-4">
          <h3 className="text-sm font-bold text-cyan-400 flex items-center space-x-2">
            <Pencil className="w-4 h-4" />
            <span>Edit Complaint Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Taluk</label>
              <input
                type="text"
                value={editTaluk}
                onChange={(e) => setEditTaluk(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Zone / Ward</label>
              <input
                type="text"
                value={editZone}
                onChange={(e) => setEditZone(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-slate-300 font-semibold">Description</label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Photo & AI Details */}
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
              <span>Gemini Vision AI Image & Description Verification</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold block">Verification Status</span>
                <p className={`font-extrabold text-sm ${complaint.isFakeImage ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {complaint.isFakeImage ? '⚠️ FAKE / UNMATCHED IMAGE' : '✓ VERIFIED REAL CIVIC DEFECT'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold block">Detection Confidence</span>
                <p className="text-cyan-400 font-extrabold text-sm">
                  {Math.round((complaint.aiConfidence || 0) * 100)}%
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold block">Defect Type</span>
                <p className="text-white font-extrabold text-sm">{complaint.issueType}</p>
              </div>
            </div>

            {complaint.geminiReasoning && (
              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs space-y-1">
                <span className="font-semibold text-purple-300 flex items-center space-x-1 block">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 inline mr-1" />
                  <span>Gemini AI Reasoning:</span>
                </span>
                <p className="text-slate-300 font-medium">{complaint.geminiReasoning}</p>
              </div>
            )}

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
              <span>Location Details</span>
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

          {/* Resolution Evidence & Citizen Feedback Section */}
          {complaint.status === 'RESOLVED' && (
            <div className="space-y-6">
              {/* Resolution Summary Card */}
              <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-4">
                <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Municipality Repair Proof</span>
                </h2>

                {complaint.resolutionComment && (
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                    <span className="text-slate-400 font-semibold block">Official Resolution Notes:</span>
                    <p className="text-emerald-300 font-medium">{complaint.resolutionComment}</p>
                  </div>
                )}

                {complaint.resolutionImage && (
                  <div className="space-y-2">
                    <span className="text-xs text-slate-300 font-semibold block">Resolution Evidence Photo:</span>
                    <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800 max-h-80 flex items-center justify-center">
                      <img
                        src={complaint.resolutionImage}
                        alt="Resolution Evidence"
                        className="max-h-80 w-auto object-contain rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Citizen Feedback / Reopen Options if owner and unverified */}
              {isOwner && !complaint.citizenVerified && (
                <div className="space-y-4">
                  <ResolutionFeedbackCard
                    complaintId={complaintId}
                    onSuccess={() => loadData()}
                  />

                  <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-amber-950/10 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xs font-bold text-amber-400">Still not fixed?</h3>
                      <p className="text-[11px] text-slate-400">If the road damage remains unsafe, request reopening for municipal review.</p>
                    </div>

                    <button
                      onClick={() => setIsReopenModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 font-bold text-xs transition-all shrink-0 flex items-center space-x-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Request Reopening</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rejection Notice & Dispute / Appeal Section */}
          {complaint.status === 'REJECTED' && (
            <div className="glass-panel p-6 rounded-2xl border border-rose-500/40 bg-rose-950/20 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Official Rejection Notice</span>
              </h2>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                <span className="text-rose-400 font-semibold block uppercase tracking-wider">Officer Rejection Reason:</span>
                <p className="text-rose-200 font-medium text-sm">
                  "{complaint.rejectionReason || complaint.resolutionComment || 'Complaint was rejected by municipal officer.'}"
                </p>
              </div>

              {isOwner && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-rose-900/40">
                  <div className="text-xs">
                    <p className="font-bold text-white">Dispute this Rejection?</p>
                    <p className="text-slate-400 text-[11px]">Submit an appeal to escalate this complaint to Senior Zone Authorities.</p>
                  </div>

                  <button
                    onClick={() => setIsReopenModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 font-bold text-xs transition-all shrink-0 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Dispute Rejection & Appeal</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Jurisdiction Info & Status History Timeline */}
        <div className="space-y-6">
          {/* Jurisdiction Info */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Assigned Jurisdiction</span>
            </h2>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block font-semibold">Local Authority</span>
                <p className="text-white font-bold text-sm">{complaint.municipalityId?.name || 'Local Authority'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block font-semibold">District & State</span>
                <p className="text-slate-300 font-medium">
                  {complaint.municipalityId?.district}, {complaint.municipalityId?.state}
                </p>
              </div>
            </div>
          </div>

          {/* Hierarchy Level Card */}
          {complaint.currentHierarchyLevelId && (
            <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 bg-amber-950/10 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>🏛️</span>
                <span>Current Authority Level</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-500/30">
                  <span className="text-amber-400/70 block font-semibold mb-1">Escalated To</span>
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
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block font-semibold mb-1">SLA Deadline</span>
                    <p className={`font-bold ${new Date(complaint.slaDeadline) < new Date() ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {new Date(complaint.slaDeadline) < new Date() ? '⚠️ SLA Breached' : '✓ SLA Active'}
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {new Date(complaint.slaDeadline).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}

                {/* Escalation Progress */}
                <div className="space-y-1.5">
                  <span className="text-slate-400 font-semibold block">Escalation Path:</span>
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
                        {isCurrent && <span className="ml-auto text-[10px] bg-amber-500/30 px-1.5 py-0.5 rounded">CURRENT</span>}
                        {isPast && <span className="ml-auto text-[10px]">escalated</span>}
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
              <span>Lifecycle Status History</span>
            </h2>

            {history.length === 0 ? (
              <p className="text-xs text-slate-500">No status updates recorded yet.</p>
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
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reopen Request Modal */}
      <ReopenRequestModal
        isOpen={isReopenModalOpen}
        onClose={() => setIsReopenModalOpen(false)}
        complaintId={complaintId}
        onSuccess={() => loadData()}
      />
    </div>
  );
};

export default ComplaintDetailsPage;
