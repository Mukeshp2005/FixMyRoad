import React from 'react';
import { MapPin, Navigation, AlertTriangle, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

const LocationStatus = ({ status, accuracy, source, errorMessage }) => {
  if (status === 'detecting') {
    return (
      <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs flex items-center space-x-2">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        <span>Detecting your GPS location with high accuracy...</span>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
        <div className="flex items-center space-x-2 font-semibold text-amber-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Location Permission Denied</span>
        </div>
        <p className="text-slate-300">
          Location permission was denied by your browser. Please enable location permissions or select your road issue position manually on the map below.
        </p>
      </div>
    );
  }

  if (status === 'unavailable' || status === 'timeout' || status === 'error') {
    return (
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
        <div className="flex items-center space-x-2 font-semibold text-rose-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{status === 'timeout' ? 'GPS Request Timed Out' : 'Unable to Determine Location'}</span>
        </div>
        <p className="text-slate-300">{errorMessage || 'Could not fetch GPS location. Please pick location on the map.'}</p>
      </div>
    );
  }

  if (status === 'success') {
    const isGpsLowAccuracy = source === 'GPS' && accuracy && accuracy > 100;
    const isIpLocation = accuracy && accuracy > 5000;

    let sourceLabel = 'Browser GPS';
    if (source === 'MAP') sourceLabel = 'Interactive Map Pin';
    if (source === 'SEARCH') sourceLabel = 'Locality Search';

    return (
      <div className="space-y-2">
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold text-white">Location: {sourceLabel}</span>
          </div>
          {source === 'GPS' && accuracy && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              {accuracy > 1000 ? `~${Math.round(accuracy / 1000)} km (IP)` : `~${Math.round(accuracy)}m (GPS)`}
            </span>
          )}
          {source !== 'GPS' && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300">
              Exact Pinpoint
            </span>
          )}
        </div>

        {isGpsLowAccuracy && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
            <div className="flex items-center space-x-1.5 font-semibold text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{isIpLocation ? 'PC/Laptop Internet Location' : 'Low GPS Accuracy'}</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {isIpLocation
                ? 'Desktop browsers lack satellite GPS chips and estimate location using your ISP internet hub. Use the search bar or click on the map to place the pin on your exact road.'
                : `GPS estimated position within ~${Math.round(accuracy)}m. Click anywhere on the map to adjust to the exact road defect.`}
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default LocationStatus;
