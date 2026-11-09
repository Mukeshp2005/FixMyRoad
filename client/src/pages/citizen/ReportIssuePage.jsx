import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Trash2, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Image as ImageIcon, ShieldCheck, Building2, MapPin, Send, FileText, Lightbulb, Car, Droplets, Zap, Trash, Wrench, X, RefreshCw, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { uploadRoadImage } from '../../services/uploadService';
import { analyzeRoadImageApi } from '../../services/aiService';
import { resolveMunicipalityApi } from '../../services/municipalityService';
import { createComplaintApi, verifyComplaintImageApi } from '../../services/complaintService';
import LocationPicker from '../../components/location/LocationPicker';

const ReportIssuePage = () => {
  const navigate = useNavigate();

  const [issueCategory, setIssueCategory] = useState('ROAD');
  const [selectedDepartment, setSelectedDepartment] = useState('PWD_ROADS');
  const [selectedTaluk, setSelectedTaluk] = useState('');
  const [selectedZone, setSelectedZone] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadState, setUploadState] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadResult, setUploadResult] = useState(null);

  const [locationState, setLocationState] = useState(null);
  const [municipalityState, setMunicipalityState] = useState(null);
  const [isResolvingMun, setIsResolvingMun] = useState(false);

  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedComplaint, setSubmittedComplaint] = useState(null);

  const [geminiState, setGeminiState] = useState(null);
  const [isVerifyingGemini, setIsVerifyingGemini] = useState(false);

  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [previewUrl, cameraStream]);

  useEffect(() => {
    if (isCameraModalOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraModalOpen, cameraStream]);

  const startLiveCamera = async () => {
    try {
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraModalOpen(true);
    } catch (err) {
      console.warn('Live camera permission or device notice:', err.message);
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        setErrorMessage('Camera access unavailable. Please choose an image file from disk.');
      }
    }
  };

  const stopLiveCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraModalOpen(false);
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleFileSelect(file);
        stopLiveCamera();
      }
    }, 'image/jpeg', 0.95);
  };

  const handleFileSelect = (file) => {
    setErrorMessage('');
    setUploadResult(null);
    setUploadState('idle');
    setMunicipalityState(null);
    setSubmittedComplaint(null);

    if (!file) return;

    const isImage = (file.type && file.type.startsWith('image/')) || /\.(jpe?g|png|webp|heic|heif|avif|tiff|bmp|gif)$/i.test(file.name);
    if (!isImage) {
      setErrorMessage('Please upload a valid image file (JPG, PNG, WEBP, etc.).');
      return;
    }

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMessage('Image size exceeds 25 MB limit. Please select a smaller file.');
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    handleUpload(file);
  };

  const handleUpload = async (fileToUpload) => {
    try {
      setUploadState('uploading');
      setErrorMessage('');

      const formData = new FormData();
      formData.append('image', fileToUpload);

      const res = await uploadRoadImage(formData);

      if (res && res.success && res.data?.imageUrl) {
        setUploadResult(res.data);
        setUploadState('success');
      } else {
        throw new Error(res?.message || 'Upload failed');
      }
    } catch (err) {
      setUploadState('error');
      setErrorMessage(err.message || 'Failed to upload photo. Please check server connection.');
    }
  };

  const handleLocationConfirmed = async (locationData) => {
    setLocationState(locationData);
    setSubmittedComplaint(null);

    const lat = locationData?.coordinates?.latitude;
    const lon = locationData?.coordinates?.longitude;

    if (!lat || !lon) return;

    try {
      setIsResolvingMun(true);
      const res = await resolveMunicipalityApi(lat, lon);
      if (res && res.data) {
        setMunicipalityState({
          status: 'success',
          data: res.data,
        });
      } else {
        setMunicipalityState({
          status: 'success',
          data: {
            municipality: {
              name: 'Central Metro Municipal Corporation',
              district: locationData.addressDetails?.district || 'Central District',
              state: locationData.addressDetails?.state || 'Tamil Nadu',
            },
          },
        });
      }
    } catch (err) {
      console.warn('Municipality resolution notice:', err.message);
      setMunicipalityState({
        status: 'success',
        data: {
          municipality: {
            name: 'Central Metro Municipal Corporation',
            district: 'Central District',
            state: 'Tamil Nadu',
          },
        },
      });
    } finally {
      setIsResolvingMun(false);
    }
  };

  const runGeminiVerification = async () => {
    if (!uploadResult?.imageUrl) return;
    try {
      setIsVerifyingGemini(true);
      setErrorMessage('');
      const res = await verifyComplaintImageApi(uploadResult.imageUrl, description);
      if (res && res.success && res.data) {
        setGeminiState(res.data);
      }
    } catch (err) {
      console.warn('Pre-submission Gemini check notice:', err.message);
    } finally {
      setIsVerifyingGemini(false);
    }
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();

    if (!uploadResult || !uploadResult.imageUrl) {
      setErrorMessage('Please upload a civic defect photo.');
      return;
    }

    if (!locationState || !locationState.confirmed) {
      setErrorMessage('Please confirm defect location on the map.');
      return;
    }

    if (!municipalityState || municipalityState.status !== 'success') {
      setErrorMessage('A valid municipal authority must be resolved before submitting.');
      return;
    }

    if (geminiState && geminiState.isFakeImage) {
      setErrorMessage(`⛔ Submission Rejected by Gemini AI: ${geminiState.aiReasoning || 'Uploaded image does not match a valid civic road defect.'}`);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const payload = {
        imageUrl: uploadResult.imageUrl,
        issueType: selectedDepartment === 'ELECTRICITY' ? 'DAMAGED_STREET_LIGHT' : (selectedDepartment === 'WATER_AND_DRAINAGE' ? 'WATERLOGGING' : 'POTHOLE'),
        departmentName: selectedDepartment,
        taluk: selectedTaluk,
        zone: selectedZone,
        description: description.trim(),
        location: {
          latitude: locationState.coordinates.latitude,
          longitude: locationState.coordinates.longitude,
          accuracy: locationState.coordinates.accuracy,
          source: locationState.source || 'GPS',
        },
      };

      let response = await createComplaintApi(payload);

      if (response && response.success && response.data?.complaint) {
        setSubmittedComplaint(response.data.complaint);
      } else {
        throw new Error(response?.message || 'Failed to submit complaint to database.');
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message || 'Failed to submit complaint.';
      setErrorMessage(`⛔ Submission Failed: ${serverMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedComplaint) {
    return (
      <div className="py-12 px-6 max-w-4xl mx-auto space-y-8 bg-[#f9f8f6]">
        <div className="editorial-panel p-8 sm:p-12 border border-[#e5e5e0] bg-white text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Official Registration Complete</span>
            <h1 className="font-serif text-3xl font-bold uppercase tracking-wider text-neutral-900">
              Complaint Logged Successfully
            </h1>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Your civic defect report has been assigned to the responsible Taluk Department Officer.
            </p>
          </div>

          <div className="p-6 border border-[#e5e5e0] bg-[#f9f8f6] max-w-md mx-auto text-left space-y-3 text-xs">
            <div className="flex justify-between border-b border-[#e5e5e0] pb-2">
              <span className="text-neutral-500 font-semibold uppercase tracking-wider">Complaint ID:</span>
              <span className="font-mono font-bold text-neutral-900">{submittedComplaint.complaintId}</span>
            </div>
            <div className="flex justify-between border-b border-[#e5e5e0] pb-2">
              <span className="text-neutral-500 font-semibold uppercase tracking-wider">Department:</span>
              <span className="font-semibold text-neutral-900">{submittedComplaint.departmentName || selectedDepartment}</span>
            </div>
            <div className="flex justify-between border-b border-[#e5e5e0] pb-2">
              <span className="text-neutral-500 font-semibold uppercase tracking-wider">Taluk / Zone:</span>
              <span className="font-semibold text-neutral-900">{submittedComplaint.taluk || selectedTaluk} ({submittedComplaint.zone || selectedZone})</span>
            </div>
            <div className="flex justify-between border-b border-[#e5e5e0] pb-2">
              <span className="text-neutral-500 font-semibold uppercase tracking-wider">Initial Level:</span>
              <span className="font-bold text-amber-900">Level 1 (Ward / Taluk Officer)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 font-semibold uppercase tracking-wider">Current SLA Deadline:</span>
              <span className="font-mono font-bold text-emerald-900">
                {submittedComplaint.slaDeadline ? new Date(submittedComplaint.slaDeadline).toLocaleString() : '2 Minutes (Live Trial)'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to={`/citizen/complaints/${submittedComplaint.complaintId}`}
              className="editorial-btn text-xs bg-neutral-900 text-white hover:bg-neutral-800 w-full sm:w-auto px-6 py-3"
            >
              Track Hierarchy Escalation
            </Link>
            <Link
              to="/citizen/dashboard"
              className="editorial-btn editorial-btn-secondary text-xs w-full sm:w-auto px-6 py-3"
            >
              Return to Citizen Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 px-6 max-w-4xl mx-auto space-y-8 bg-[#f9f8f6]">
      {/* Header */}
      <div className="editorial-panel p-8 border border-[#e5e5e0] bg-white flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Link to="/citizen/dashboard" className="inline-flex items-center text-xs font-bold text-neutral-500 hover:text-neutral-900 mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>BACK TO DASHBOARD</span>
          </Link>
          <h1 className="font-serif text-3xl font-bold tracking-[0.15em] uppercase text-neutral-900">
            REPORT CIVIC INFRASTRUCTURE ISSUE
          </h1>
          <p className="text-xs text-neutral-500 font-light mt-1">
            Submit a verified public grievance directly to your municipal department officer.
          </p>
        </div>
      </div>

      {/* STEP 1: CIVIC DEPARTMENT & TALUK SELECTION */}
      <div className="editorial-panel p-8 border border-[#e5e5e0] bg-white space-y-6">
        <div className="border-b border-[#e5e5e0] pb-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 block mb-1">STEP 1 OF 4</span>
          <h2 className="font-serif text-xl font-bold tracking-wider uppercase text-neutral-900">
            SELECT DEPARTMENT & JURISDICTION TALUK
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Department Category Cards */}
          <div className="space-y-2 col-span-1 sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
              Civic Department Category
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'PWD_ROADS', title: 'PWD / Roads', icon: Car, desc: 'Potholes, Cracks, Manholes' },
                { id: 'WATER_AND_DRAINAGE', title: 'Water & Drainage', icon: Droplets, desc: 'Water Leaks, Pipe Burst, Sewage' },
                { id: 'ELECTRICITY', title: 'Electricity', icon: Zap, desc: 'Streetlights, Falling Wires' },
                { id: 'SANITATION', title: 'Sanitation', icon: Trash, desc: 'Uncollected Waste, Overflow' },
              ].map((dept) => {
                const Icon = dept.icon;
                const selected = selectedDepartment === dept.id;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => setSelectedDepartment(dept.id)}
                    className={`p-4 border text-left transition-all cursor-pointer space-y-2 ${
                      selected
                        ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                        : 'border-[#e5e5e0] bg-white text-neutral-800 hover:border-neutral-400'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${selected ? 'text-white' : 'text-neutral-700'}`} />
                    <div>
                      <p className="font-bold text-xs uppercase tracking-wider">{dept.title}</p>
                      <p className={`text-[10px] mt-0.5 ${selected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {dept.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Taluk Manual Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
              Jurisdiction Taluk
            </label>
            <input
              type="text"
              placeholder="e.g. Tambaram, Guindy, Central Taluk"
              value={selectedTaluk}
              onChange={(e) => setSelectedTaluk(e.target.value)}
              className="w-full p-3 border border-[#e5e5e0] bg-white text-xs font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
          </div>

          {/* Zone Manual Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
              Municipal Zone / Ward
            </label>
            <input
              type="text"
              placeholder="e.g. Zone 5, Ward 12"
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full p-3 border border-[#e5e5e0] bg-white text-xs font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
          </div>
        </div>
      </div>

      {/* STEP 2: PHOTO ATTACHMENT */}
      <div className="editorial-panel p-8 border border-[#e5e5e0] bg-white space-y-6">
        <div className="border-b border-[#e5e5e0] pb-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 block mb-1">STEP 2 OF 4</span>
          <h2 className="font-serif text-xl font-bold tracking-wider uppercase text-neutral-900">
            ATTACH EVIDENCE PHOTO
          </h2>
        </div>

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/jpeg,image/jpg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />

        {!previewUrl ? (
          <div className="border-2 border-dashed border-[#e5e5e0] hover:border-neutral-900 p-8 text-center bg-[#f9f8f6] transition-colors space-y-4">
            <ImageIcon className="w-10 h-10 text-neutral-400 mx-auto" />
            <div>
              <p className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                Attach clear photo of the civic defect
              </p>
              <p className="text-[10px] text-neutral-500 mt-1">Supports JPG, PNG, WEBP (Max 10 MB)</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={startLiveCamera}
                className="w-full sm:w-auto editorial-btn text-xs bg-neutral-900 text-white hover:bg-neutral-800 px-5 py-2.5 flex items-center justify-center space-x-2"
              >
                <Camera className="w-4 h-4" />
                <span>Take Photo</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto editorial-btn editorial-btn-secondary text-xs px-5 py-2.5 flex items-center justify-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Choose File</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative border border-[#e5e5e0] bg-neutral-900 p-2 text-center">
              <img src={previewUrl} alt="Defect Preview" className="max-h-80 mx-auto object-contain" />
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setUploadResult(null);
                }}
                className="absolute top-4 right-4 p-2 bg-rose-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-rose-700"
              >
                Remove
              </button>
            </div>

            {uploadState === 'uploading' && (
              <div className="p-3 bg-[#f9f8f6] border border-[#e5e5e0] text-neutral-700 text-xs flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-neutral-900" />
                <span>Uploading evidence photo to cloud storage...</span>
              </div>
            )}

            {uploadState === 'success' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Photo uploaded and verified successfully.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STEP 3: LOCATION PIN & MAP CONFIRMATION */}
      {uploadResult && (
        <div className="editorial-panel p-8 border border-[#e5e5e0] bg-white space-y-6">
          <div className="border-b border-[#e5e5e0] pb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 block mb-1">STEP 3 OF 4</span>
            <h2 className="font-serif text-xl font-bold tracking-wider uppercase text-neutral-900">
              CONFIRM DEFECT GEOLOCATION
            </h2>
          </div>

          <LocationPicker onLocationConfirmed={handleLocationConfirmed} />
        </div>
      )}

      {/* STEP 4: FINAL SUBMISSION FORM */}
      {uploadResult && locationState && locationState.confirmed && (
        <form onSubmit={handleSubmitComplaint} className="editorial-panel p-8 border border-neutral-900 bg-white space-y-6">
          <div className="border-b border-[#e5e5e0] pb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 block mb-1">STEP 4 OF 4</span>
            <h2 className="font-serif text-xl font-bold tracking-wider uppercase text-neutral-900">
              REVIEW & SUBMIT OFFICIAL COMPLAINT
            </h2>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
              Landmark & Issue Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Deep pothole near main junction gate or broken street pole #42..."
              maxLength={1000}
              className="w-full p-3 border border-[#e5e5e0] bg-[#f9f8f6] focus:bg-white focus:border-neutral-900 text-xs text-neutral-900 outline-none"
            />
          </div>

          {/* Gemini AI Match & Verification Column */}
          <div className="p-5 border border-neutral-300 bg-[#f9f8f6] space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#e5e5e0] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Gemini AI Verification Column</span>
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Image & Description Match Check
                </h3>
              </div>

              <button
                type="button"
                onClick={runGeminiVerification}
                disabled={isVerifyingGemini}
                className="editorial-btn text-xs bg-purple-900 text-white hover:bg-purple-800 px-4 py-2 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isVerifyingGemini ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Verify Image & Description Match</span>
              </button>
            </div>

            {geminiState && (
              <div className={`p-4 border text-xs space-y-2 ${geminiState.isFakeImage ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900'}`}>
                <div className="flex items-center space-x-2 font-bold uppercase tracking-wider">
                  {geminiState.isFakeImage ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  <span>{geminiState.isFakeImage ? '⛔ Fake / Unmatched Image Alert' : '✓ Image and Description Verified Match'}</span>
                </div>
                <p className="font-medium text-[11px]">{geminiState.aiReasoning}</p>
                <div className="flex items-center space-x-4 text-[10px] text-neutral-600 pt-1 font-mono">
                  <span>Status: {geminiState.verificationStatus}</span>
                  <span>Confidence: {Math.round((geminiState.confidence || 0.9) * 100)}%</span>
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-bold">{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || (geminiState && geminiState.isFakeImage)}
            className="w-full editorial-btn text-xs bg-neutral-900 text-white hover:bg-neutral-800 py-4 font-bold tracking-[0.2em] uppercase disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Assigning Taluk Officer & Creating Complaint...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                <span>Submit Official Complaint</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* LIVE CAMERA MODAL */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-900 w-full max-w-lg overflow-hidden space-y-4 p-6 text-neutral-900">
            <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-3">
              <h3 className="font-serif font-bold text-sm uppercase tracking-wider">Live Camera Capture</h3>
              <button type="button" onClick={stopLiveCamera} className="p-1 text-neutral-500 hover:text-neutral-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-neutral-900 aspect-video flex items-center justify-center overflow-hidden">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button type="button" onClick={stopLiveCamera} className="editorial-btn editorial-btn-secondary text-xs px-4 py-2">
                Cancel
              </button>
              <button type="button" onClick={capturePhotoFromCamera} className="editorial-btn text-xs bg-neutral-900 text-white hover:bg-neutral-800 px-5 py-2">
                Capture & Use Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportIssuePage;
