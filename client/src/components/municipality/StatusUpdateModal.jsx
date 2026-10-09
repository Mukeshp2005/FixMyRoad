import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, Upload, Sparkles, Image as ImageIcon } from 'lucide-react';
import { updateComplaintStatusApi, uploadResolutionImageApi } from '../../services/municipalityComplaintService';

const ALLOWED_TRANSITIONS = {
  SUBMITTED: ['UNDER_REVIEW', 'ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  UNDER_REVIEW: ['ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  ACCEPTED: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
};

const StatusUpdateModal = ({ isOpen, onClose, complaintId, currentStatus, onSuccess }) => {
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];

  const [selectedStatus, setSelectedStatus] = useState(allowedNext[0] || '');
  const [comment, setComment] = useState('');
  const [resolutionComment, setResolutionComment] = useState('');
  const [resolutionImageFile, setResolutionImageFile] = useState(null);
  const [resolutionImagePreview, setResolutionImagePreview] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [resolutionImageUrl, setResolutionImageUrl] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      setError('');
      setResolutionImageFile(file);

      const objectUrl = URL.createObjectURL(file);
      setResolutionImagePreview(objectUrl);

      const formData = new FormData();
      formData.append('image', file);

      const res = await uploadResolutionImageApi(complaintId, formData);
      if (res.success && res.data?.resolutionImageUrl) {
        setResolutionImageUrl(res.data.resolutionImageUrl);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload resolution evidence image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStatus) {
      setError('Please select a valid next status.');
      return;
    }

    if (selectedStatus === 'REJECTED' && !comment.trim()) {
      setError('Rejection requires an official reason comment.');
      return;
    }

    if (selectedStatus === 'RESOLVED' && !resolutionComment.trim() && !comment.trim()) {
      setError('Resolution requires a resolution summary comment.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const payload = {
        targetStatus: selectedStatus,
        comment: comment.trim(),
        resolutionComment: resolutionComment.trim() || comment.trim(),
        resolutionImage: resolutionImageUrl || undefined,
      };

      const res = await updateComplaintStatusApi(complaintId, payload);

      if (res.success) {
        onSuccess(res.data.complaint);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to update complaint status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Update Complaint Status</h2>
            <p className="text-xs text-slate-400">Current state: <span className="font-mono text-cyan-400 font-bold">{currentStatus}</span></p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {allowedNext.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-800/60 text-slate-400 text-xs text-center">
            This complaint is in a terminal status ({currentStatus}) and cannot be transitioned further.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Select Target Status */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Select Next Allowed Status</label>
              <div className="grid grid-cols-2 gap-2">
                {allowedNext.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStatus(st)}
                    className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 border cursor-pointer ${
                      selectedStatus === st
                        ? st === 'REJECTED'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500 shadow-lg'
                          : 'bg-cyan-500/20 text-cyan-400 border-cyan-500 shadow-lg'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{st.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Official Comment */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Official Notes / Remarks {selectedStatus === 'REJECTED' && <span className="text-rose-400">* (Required)</span>}
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={selectedStatus === 'REJECTED' ? 'Provide official rejection reason...' : 'Enter status transition notes...'}
                maxLength={500}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 transition-all resize-none"
              />
            </div>

            {/* Resolution Fields for RESOLVED Status */}
            {selectedStatus === 'RESOLVED' && (
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-emerald-400 block">Resolution Summary Notes *</label>
                  <textarea
                    rows={2}
                    value={resolutionComment}
                    onChange={(e) => setResolutionComment(e.target.value)}
                    placeholder="e.g. Defect inspected and asphalt repaved by public works team."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-all resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-semibold text-slate-300 block">Resolution Proof Photo (Optional Cloudinary Upload)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageFileChange}
                    className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer"
                  />
                  {isUploadingImage && (
                    <div className="text-[11px] text-cyan-400 flex items-center space-x-1.5 pt-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading resolution proof to Cloudinary...</span>
                    </div>
                  )}
                  {resolutionImageUrl && (
                    <div className="text-[11px] text-emerald-400 font-semibold flex items-center space-x-1 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolution evidence uploaded to Cloudinary</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl glass-panel text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploadingImage}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 hover:scale-[1.02] transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Status...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Status Update</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default StatusUpdateModal;
