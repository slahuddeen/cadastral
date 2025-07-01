import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Map, { Layer, Source, Popup } from 'react-map-gl';
import { cadastralService, CadastralParcel } from '@/lib/supabase';
import 'mapbox-gl/dist/mapbox-gl.css';

interface CadastralMapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
}

const CadastralMap: React.FC<CadastralMapProps> = ({
  initialCenter = [98.7, 3.52], // Default to your data area
  initialZoom = 13
}) => {
  const [viewState, setViewState] = useState({
    longitude: initialCenter[0],
    latitude: initialCenter[1],
    zoom: initialZoom
  });

  const [parcels, setParcels] = useState<CadastralParcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<CadastralParcel | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [popupInfo, setPopupInfo] = useState<{
    longitude: number;
    latitude: number;
    parcel: CadastralParcel;
  } | null>(null);

  // Load parcels when map moves
  const loadParcels = useCallback(async () => {
    if (viewState.zoom < 10) return; // Don't load parcels when zoomed out too far

    setLoading(true);
    try {
      // Calculate bounds from current view
      const bounds = {
        north: viewState.latitude + 0.01,
        south: viewState.latitude - 0.01,
        east: viewState.longitude + 0.01,
        west: viewState.longitude - 0.01
      };

      const parcelsData = await cadastralService.getParcelsInBounds(bounds);
      setParcels(parcelsData);
    } catch (error) {
      console.error('Error loading parcels:', error);
    } finally {
      setLoading(false);
    }
  }, [viewState.latitude, viewState.longitude, viewState.zoom]);

  useEffect(() => {
    loadParcels();
  }, [loadParcels]);

  // Search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const results = await cadastralService.searchParcelsByOwner(searchQuery);
      if (results.length > 0) {
        const firstResult = results[0];
        // Get center of first polygon
        const coords = firstResult.geometry.coordinates[0];
        const centerLng = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length;
        const centerLat = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length;
        
        setViewState(prev => ({
          ...prev,
          longitude: centerLng,
          latitude: centerLat,
          zoom: 16
        }));
        
        setSelectedParcel(firstResult);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convert parcels to GeoJSON
  const geojsonData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: parcels.map(parcel => ({
      type: 'Feature' as const,
      properties: {
        id: parcel.id,
        parcel_id: parcel.parcel_id,
        owner_name: parcel.owner_name,
        land_use: parcel.land_use,
        area_sqm: parcel.area_sqm,
        status: parcel.status
      },
      geometry: parcel.geometry
    }))
  }), [parcels]);

  const onClick = useCallback((event: any) => {
    if (event.features && event.features.length > 0) {
      const feature = event.features[0];
      const parcel = parcels.find(p => p.id === feature.properties.id);
      
      if (parcel) {
        setPopupInfo({
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
          parcel
        });
      }
    }
  }, [parcels]);

  return (
    <div className="relative h-full w-full">
      {/* Search Bar */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by owner name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="outline-none text-sm w-64"
          />
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            Search
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2">
            <Loader className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      )}

      {/* Info Panel */}
      {selectedParcel && (
        <div className="absolute top-20 left-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 mt-1" />
            <div>
              <h3 className="font-semibold text-sm">Parcel {selectedParcel.parcel_id}</h3>
              {selectedParcel.owner_name && (
                <p className="text-sm text-gray-600">Owner: {selectedParcel.owner_name}</p>
              )}
              {selectedParcel.land_use && (
                <p className="text-sm text-gray-600">Use: {selectedParcel.land_use}</p>
              )}
              <p className="text-sm text-gray-600">
                Area: {selectedParcel.area_sqm.toLocaleString()} m²
              </p>
              <p className="text-sm text-gray-600">Status: {selectedParcel.status}</p>
            </div>
            <button 
              onClick={() => setSelectedParcel(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Map */}
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        onClick={onClick}
        interactiveLayerIds={['parcels-fill', 'parcels-line']}
      >
        <Source id="parcels" type="geojson" data={geojsonData}>
          <Layer
            id="parcels-fill"
            type="fill"
            paint={{
              'fill-color': [
                'case',
                ['==', ['get', 'status'], 'active'], '#22c55e',
                ['==', ['get', 'status'], 'pending'], '#f59e0b',
                '#ef4444'
              ],
              'fill-opacity': 0.3
            }}
          />
          <Layer
            id="parcels-line"
            type="line"
            paint={{
              'line-color': '#1f2937',
              'line-width': 2
            }}
          />
        </Source>

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="max-w-sm"
          >
            <div className="p-2">
              <h3 className="font-semibold text-sm">Parcel {popupInfo.parcel.parcel_id}</h3>
              {popupInfo.parcel.owner_name && (
                <p className="text-sm">Owner: {popupInfo.parcel.owner_name}</p>
              )}
              {popupInfo.parcel.land_use && (
                <p className="text-sm">Use: {popupInfo.parcel.land_use}</p>
              )}
              <p className="text-sm">Area: {popupInfo.parcel.area_sqm.toLocaleString()} m²</p>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default CadastralMap;
