import { useEffect, useRef, useCallback } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin } from "lucide-react";

interface PlaceMarker {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
}

interface ChatbotMapProps {
  places: PlaceMarker[];
  selectedPlaceId: string | null;
  onPlaceSelect: (placeId: string | null) => void;
}

// TrackAsia style URL - free Vietnam map tiles
const TRACKASIA_STYLE = "https://tiles.track-asia.com/styles/v1/streets.json?key=public";

// Fallback to OpenFreeMap if TrackAsia doesn't work
const FALLBACK_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export default function ChatbotMap({ places, selectedPlaceId, onPlaceSelect }: ChatbotMapProps) {
  const mapRef = useRef<any>(null);
  const selectedPlace = places.find(p => p.id === selectedPlaceId);

  // Center map on selected place
  useEffect(() => {
    if (selectedPlace && mapRef.current) {
      mapRef.current.flyTo({
        center: [selectedPlace.longitude, selectedPlace.latitude],
        zoom: 15,
        duration: 1000
      });
    }
  }, [selectedPlace]);

  // Fit bounds to show all places
  useEffect(() => {
    if (places.length > 0 && mapRef.current && !selectedPlaceId) {
      const bounds = places.reduce(
        (acc, place) => {
          return {
            minLng: Math.min(acc.minLng, place.longitude),
            maxLng: Math.max(acc.maxLng, place.longitude),
            minLat: Math.min(acc.minLat, place.latitude),
            maxLat: Math.max(acc.maxLat, place.latitude),
          };
        },
        { minLng: 180, maxLng: -180, minLat: 90, maxLat: -90 }
      );

      mapRef.current.fitBounds(
        [
          [bounds.minLng - 0.01, bounds.minLat - 0.01],
          [bounds.maxLng + 0.01, bounds.maxLat + 0.01]
        ],
        { padding: 50, duration: 1000 }
      );
    }
  }, [places, selectedPlaceId]);

  const handleMapLoad = useCallback((e: any) => {
    mapRef.current = e.target;
  }, []);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border">
      <Map
        onLoad={handleMapLoad}
        initialViewState={{
          longitude: 106.6297,
          latitude: 10.8231,
          zoom: 12
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={FALLBACK_STYLE}
        attributionControl={false}
      >
        <NavigationControl position="top-right" />
        
        {places.map((place) => (
          <Marker
            key={place.id}
            longitude={place.longitude}
            latitude={place.latitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onPlaceSelect(place.id);
            }}
          >
            <div 
              className={`cursor-pointer transition-transform hover:scale-110 ${
                selectedPlaceId === place.id ? "scale-125" : ""
              }`}
            >
              <div className={`p-2 rounded-full shadow-lg ${
                selectedPlaceId === place.id 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-card text-primary"
              }`}>
                <MapPin className="h-5 w-5" />
              </div>
            </div>
          </Marker>
        ))}

        {selectedPlace && (
          <Popup
            longitude={selectedPlace.longitude}
            latitude={selectedPlace.latitude}
            anchor="bottom"
            offset={35}
            onClose={() => onPlaceSelect(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <div className="p-2 max-w-[200px]">
              <h3 className="font-semibold text-sm text-foreground mb-1">
                {selectedPlace.name}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {selectedPlace.address}
              </p>
              {selectedPlace.rating && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-yellow-500">★</span>
                  <span className="text-xs">{selectedPlace.rating}</span>
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
