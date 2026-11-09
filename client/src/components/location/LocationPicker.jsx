import React, { useState } from 'react';
import { Navigation, MapPin, CheckCircle2, RefreshCw, AlertCircle, Loader2, ShieldCheck, Map, Search } from 'lucide-react';
import LocationMap from './LocationMap';
import LocationStatus from './LocationStatus';
import { reverseGeocodeApi, searchPlacesApi } from '../../services/geocodingService';

const LocationPicker = ({ onLocationConfirmed }) => {
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null, accuracy: null });
  const [addressData, setAddressData] = useState(null);
  const [source, setSource] = useState('GPS'); // 'GPS' | 'MAP' | 'SEARCH'
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | detecting | success | denied | unavailable | timeout | error
  const [gpsErrorMsg, setGpsErrorMsg] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Search locality state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // 1. Browser GPS Geolocation Handler
  const handleDetectLocation = () => {
    setGpsStatus('detecting');
    setGpsErrorMsg('');
    setIsConfirmed(false);

    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      setGpsErrorMsg('Browser geolocation is not supported on this device.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const acc = position.coords.accuracy;

        setCoordinates({ latitude: lat, longitude: lon, accuracy: acc });
        setSource('GPS');
        setGpsStatus('success');

        // Reverse geocode position via Express backend API
        fetchReverseGeocode(lat, lon);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus('denied');
          setGpsErrorMsg('Location permission was denied. Please select location manually on the map.');
        } else if (error.code === error.TIMEOUT) {
          setGpsStatus('timeout');
          setGpsErrorMsg('GPS location request timed out. Please try again or pick on map.');
        } else {
          setGpsStatus('unavailable');
          setGpsErrorMsg('Unable to determine location. Please select location manually on map.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // 2. Manual Map Click Handler
  const handleMapClick = (lat, lon) => {
    setCoordinates({ latitude: lat, longitude: lon, accuracy: null });
    setSource('MAP');
    setGpsStatus('success');
    setIsConfirmed(false);
    fetchReverseGeocode(lat, lon);
  };

  // 3. Search Area / Locality Handler
  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setSearchError('');
      const res = await searchPlacesApi(searchQuery.trim());
      if (res.data && res.data.length > 0) {
        setSearchResults(res.data);
      } else {
        setSearchResults([]);
        setSearchError('No places found. Try a nearby landmark, street, or city.');
      }
    } catch (err) {
      setSearchError('Failed to search location. Please click directly on the map.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (place) => {
    setCoordinates({ latitude: place.latitude, longitude: place.longitude, accuracy: null });
    setAddressData({
      address: place.address || place.displayName,
      city: place.city || '',
      district: place.district || '',
      state: place.state || '',
      country: place.country || '',
      postalCode: place.postalCode || '',
    });
    setSource('SEARCH');
    setGpsStatus('success');
    setIsConfirmed(false);
    setSearchResults([]);
    setSearchError('');
  };

  // 4. Reverse Geocode API call via Express Backend
  const fetchReverseGeocode = async (lat, lon) => {
    try {
      setIsGeocoding(true);
      const res = await reverseGeocodeApi(lat, lon);

      if (res.success && res.data) {
        setAddressData(res.data);
      } else {
        setAddressData(null);
      }
    } catch (err) {
      setAddressData({
        address: 'Unknown Road Address',
        city: 'Local Area',
        district: '',
        state: '',
        country: '',
        postalCode: '',
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  // 5. Confirm Location Action
  const handleConfirmLocation = () => {
    if (!coordinates.latitude || !coordinates.longitude) return;

    setIsConfirmed(true);

    const locationPayload = {
      coordinates: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracy: coordinates.accuracy,
      },
      address: addressData || {
        address: 'Selected Map Location',
        city: '',
        district: '',
        state: '',
        country: '',
        postalCode: '',
      },
      source,
      confirmed: true,
    };

    if (onLocationConfirmed) {
      onLocationConfirmed(locationPayload);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            <span>Select Defect Location</span>
          </h2>
          <p className="text-xs text-slate-400">Detect GPS position or click directly on map</p>
        </div>

        {/* Detect My Location Action */}
        <button
          id="btn-detect-gps"
          type="button"
          onClick={handleDetectLocation}
          disabled={gpsStatus === 'detecting'}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 font-semibold text-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
        >
          <Navigation className="w-4 h-4" />
          <span>{gpsStatus === 'detecting' ? 'Detecting GPS...' : 'Detect My Location'}</span>
        </button>
      </div>

      {/* Status Alerts */}
      <LocationStatus
        status={gpsStatus}
        accuracy={coordinates.accuracy}
        source={source}
        errorMessage={gpsErrorMsg}
      />

      {/* Locality / Street Search Bar */}
      <div className="relative">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search locality, street, or landmark (e.g. Gandhipuram, Anna Nagar, T Nagar)..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>{isSearching ? 'Searching...' : 'Search'}</span>
          </button>
        </form>

        {searchError && (
          <p className="text-[11px] text-amber-400 mt-1 pl-1">{searchError}</p>
        )}

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-[1500] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-800 max-h-60 overflow-y-auto">
            {searchResults.map((res, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSearchResult(res)}
                className="w-full text-left p-3 hover:bg-slate-800/80 transition-colors flex items-start space-x-2 text-xs cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">{res.address}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{res.displayName}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Map */}
      <LocationMap
        lat={coordinates.latitude}
        lon={coordinates.longitude}
        source={source}
        onMapClick={handleMapClick}
      />

      {/* Selected Coordinates & Address Info Box */}
      {coordinates.latitude && coordinates.longitude && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <p className="text-xs text-slate-400">Selected Coordinates ({source})</p>
              <p className="text-sm font-mono font-semibold text-white mt-0.5">
                {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
              </p>
            </div>
            {isGeocoding ? (
              <div className="flex items-center text-xs text-cyan-400">
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                <span>Reverse geocoding address...</span>
              </div>
            ) : (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Geocoded via Express
              </span>
            )}
          </div>

          {/* Address Data Output */}
          {addressData && (
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-white text-sm">{addressData.address}</p>
              <p className="text-slate-400">
                {[addressData.city, addressData.district, addressData.state, addressData.country, addressData.postalCode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          )}

          {/* Confirm Button */}
          {!isConfirmed ? (
            <button
              id="btn-confirm-location"
              type="button"
              onClick={handleConfirmLocation}
              disabled={isGeocoding}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-md shadow-cyan-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Use This Location</span>
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Location Confirmed ✓</span>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmed(false)}
                className="text-[11px] underline text-slate-300 hover:text-white cursor-pointer"
              >
                Change
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
