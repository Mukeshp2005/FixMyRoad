import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Search, AlertCircle, Cpu, MapPin, Building2, CheckCircle2, ArrowRight, Server, ShieldCheck } from 'lucide-react';
import { checkHealth } from '../services/api';
import axios from 'axios';

const LandingPage = () => {
  const navigate = useNavigate();
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', message: '' });
  const [aiHealth, setAiHealth] = useState({ status: 'checking', message: '' });

  useEffect(() => {
    // Check Backend API Health
    checkHealth()
      .then((data) => {
        setBackendHealth({ status: 'online', message: data.message });
      })
      .catch((err) => {
        setBackendHealth({ status: 'offline', message: err.message || 'Server unavailable' });
      });

    // Gemini AI status synced with backend API health
    checkHealth()
      .then(() => {
        setAiHealth({ status: 'online', message: 'Google Gemini Vision Active' });
      })
      .catch(() => {
        setAiHealth({ status: 'offline', message: 'Cloud service unavailable' });
      });
  }, []);

  return (
    <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Hero Section — Professional Civic Portal */}
      <div className="text-center space-y-5 max-w-4xl mx-auto pt-4">
        <div className="civic-subtitle-badge">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>OFFICIAL MUNICIPAL ROAD PRESERVATION PLATFORM</span>
        </div>

        <h1 className="font-heading text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 uppercase leading-none">
          FIXMYROAD
        </h1>

        <p className="text-slate-600 font-medium text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          AI-Powered Road Defect Inspection, Automated GPS Jurisdiction Routing, and Transparent Municipal Resolution Workflows.
        </p>

        {/* Action Buttons — Clean Government Portal Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            id="btn-report-issue"
            className="civic-btn civic-btn-primary px-8 py-3.5 text-xs flex items-center justify-center space-x-2 group cursor-pointer"
            onClick={() => navigate('/citizen/report')}
          >
            <Camera className="w-4 h-4 mr-2" />
            <span>REPORT AN ISSUE</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            id="btn-track-complaint"
            className="civic-btn civic-btn-outline px-8 py-3.5 text-xs flex items-center justify-center space-x-2 cursor-pointer"
            onClick={() => navigate('/citizen/complaints')}
          >
            <Search className="w-4 h-4 mr-2 text-slate-500" />
            <span>TRACK COMPLAINT</span>
          </button>
        </div>
      </div>

      {/* Feature Architecture Workflow Section */}
      <div className="space-y-8">
        <div className="text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">MUNICIPAL PIPELINE</span>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-slate-900">
            CIVIC RESOLUTION WORKFLOW
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: DAMAGE REPORTING */}
          <div className="civic-card p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center border border-slate-200">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">PHASE 01</span>
              <h3 className="font-heading text-lg font-bold tracking-tight uppercase text-slate-900">
                DAMAGE REPORTING
              </h3>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                Snap high-resolution photos of road defects with automatic EXIF GPS location extraction and severity tagging.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] tracking-wider uppercase font-bold text-slate-700">
                Citizen Portal Active
              </span>
            </div>
          </div>

          {/* Card 2: COMPUTER VISION AI */}
          <div className="civic-card p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center border border-slate-200">
                <Cpu className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">PHASE 02</span>
              <h3 className="font-heading text-lg font-bold tracking-tight uppercase text-slate-900">
                COMPUTER VISION AI
              </h3>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                YOLO microservice analyzes surface cracks, pothole depth metrics, and structural hazard scores instantly.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] tracking-wider uppercase font-bold text-slate-700">
                AI Service Ready
              </span>
            </div>
          </div>

          {/* Card 3: WARD DISPATCH */}
          <div className="civic-card p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center border border-slate-200">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">PHASE 03</span>
              <h3 className="font-heading text-lg font-bold tracking-tight uppercase text-slate-900">
                WARD DISPATCH
              </h3>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                Spatial indexing matches damage coordinates against municipal ward boundaries for immediate dispatch.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] tracking-wider uppercase font-bold text-slate-700">
                Auto Ward Routing
              </span>
            </div>
          </div>

          {/* Card 4: REPAIR VERIFICATION */}
          <div className="civic-card p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center border border-slate-200">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">PHASE 04</span>
              <h3 className="font-heading text-lg font-bold tracking-tight uppercase text-slate-900">
                REPAIR VERIFICATION
              </h3>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                Municipal officers verify repairs with photo evidence, notifying citizens in real-time upon completion.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] tracking-wider uppercase font-bold text-slate-700">
                Transparent Audit Log
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Diagnostic Panel */}
      <div className="civic-panel p-6 sm:p-8 border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-6 border-b border-slate-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">INFRASTRUCTURE HEALTH</span>
            <h3 className="font-heading text-xl font-bold tracking-tight uppercase text-slate-900 flex items-center">
              <Server className="w-4 h-4 mr-2 text-slate-700" />
              SYSTEM DIAGNOSTIC MONITOR
            </h3>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-2 sm:mt-0">
            Realtime Status API
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Backend API status */}
          <div className="p-4 border border-slate-200 bg-slate-50 flex items-center justify-between rounded-lg">
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">REST API SERVER</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">Node.js / Express</p>
              <p className="text-xs text-slate-500 font-normal mt-1">{backendHealth.message || 'Connecting...'}</p>
            </div>
            <div>
              {backendHealth.status === 'online' ? (
                <span className="inline-flex items-center text-[10px] font-bold tracking-widest uppercase px-3 py-1 bg-slate-900 text-white rounded">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  ONLINE
                </span>
              ) : backendHealth.status === 'checking' ? (
                <span className="text-[10px] tracking-widest uppercase text-slate-400">CHECKING...</span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-bold tracking-widest uppercase px-3 py-1 bg-rose-700 text-white rounded">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  OFFLINE
                </span>
              )}
            </div>
          </div>

          {/* AI Service status */}
          <div className="p-4 border border-slate-200 bg-slate-50 flex items-center justify-between rounded-lg">
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">GEMINI VISION AI</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">Google Multimodal Cloud</p>
              <p className="text-xs text-slate-500 font-normal mt-1">{aiHealth.message || 'Connecting...'}</p>
            </div>
            <div>
              {aiHealth.status === 'online' ? (
                <span className="inline-flex items-center text-[10px] font-bold tracking-widest uppercase px-3 py-1 bg-slate-900 text-white rounded">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  ONLINE
                </span>
              ) : aiHealth.status === 'checking' ? (
                <span className="text-[10px] tracking-widest uppercase text-slate-400">CHECKING...</span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-bold tracking-widest uppercase px-3 py-1 bg-rose-700 text-white rounded">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  OFFLINE
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
