import { useEffect, useRef, useCallback, useState } from "react";
import { useTranslation } from 'react-i18next';
import Map, { Marker, Popup, NavigationControl, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Navigation, User, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PlaceMarker {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
}

interface RouteInfo {
  distance: number; // in km
  duration: number; // in minutes
  geometry: GeoJSON.LineString;
}

interface ChatbotMapProps {
  places: PlaceMarker[];
  selectedPlaceId: string | null;
  onPlaceSelect: (placeId: string | null) => void;
  userLocation?: { latitude: number; longitude: number };
  routeToPlaceId?: string | null;
  onRouteRequest?: (placeId: string) => void;
  onRouteClear?: () => void;
}

// Fallback to OpenFreeMap
const FALLBACK_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export default function ChatbotMap({
  places,
  selectedPlaceId,
  onPlaceSelect,
  userLocation,
  routeToPlaceId,
  onRouteRequest,
  onRouteClear
}: ChatbotMapProps) {
  const mapRef = useRef<any>(null);
  const selectedPlace = places.find(p => p.id === selectedPlaceId);
  const routePlace = places.find(p => p.id === routeToPlaceId);

  const [routeData, setRouteData] = useState<RouteInfo | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const { t } = useTranslation();

  // Fetch route when routeToPlaceId changes
  useEffect(() => {
    if (!routeToPlaceId || !routePlace || !userLocation) {
      setRouteData(null);
      return;
    }

    const fetchRoute = async () => {
      setIsLoadingRoute(true);

      const cacheKey = `route:${userLocation.latitude},${userLocation.longitude}:${routePlace.latitude},${routePlace.longitude}`;
      try {
        // Try session cache first
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          setRouteData(parsed);
          toast.success(t('route.used_cached', { distance: parsed.distance.toFixed(1) }));
          return;
        }

        const controller = new AbortController();
        const timeout = 8000; // 8s timeout
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.longitude},${userLocation.latitude};${routePlace.longitude},${routePlace.latitude}?overview=full&geometries=geojson`;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Routing service returned ${response.status}`);
        }

        const data = await response.json();

        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const payload = {
            distance: route.distance / 1000,
            duration: Math.round(route.duration / 60),
            geometry: route.geometry,
          };
          setRouteData(payload);
          // cache for this session to avoid repeated requests
          try { sessionStorage.setItem(cacheKey, JSON.stringify(payload)); } catch { }

          toast.success(t('route.route_info', { distance: (route.distance / 1000).toFixed(1), duration: Math.round(route.duration / 60) }));

          // Fit map to show route
          if (mapRef.current) {
            const coordinates = route.geometry.coordinates;
            const bounds = coordinates.reduce(
              (acc: any, coord: [number, number]) => {
                return {
                  minLng: Math.min(acc.minLng, coord[0]),
                  maxLng: Math.max(acc.maxLng, coord[0]),
                  minLat: Math.min(acc.minLat, coord[1]),
                  maxLat: Math.max(acc.maxLat, coord[1]),
                };
              },
              { minLng: 180, maxLng: -180, minLat: 90, maxLat: -90 }
            );

            mapRef.current.fitBounds(
              [
                [bounds.minLng - 0.01, bounds.minLat - 0.01],
                [bounds.maxLng + 0.01, bounds.maxLat + 0.01]
              ],
              { padding: 60, duration: 1000 }
            );
          }
        } else {
          throw new Error('No route found');
        }
      } catch (error: any) {
        console.error('Error fetching route:', error);
        // If aborted or routing service down, fallback to straight-line geometry
        if (error.name === 'AbortError' || /NetworkError|Failed to fetch/.test(String(error))) {
          const fallbackGeometry = {
            type: 'LineString',
            coordinates: [
              [userLocation.longitude, userLocation.latitude],
              [routePlace.longitude, routePlace.latitude]
            ]
          } as GeoJSON.LineString;

          const approxDistanceKm = Math.sqrt(
            Math.pow(userLocation.latitude - routePlace.latitude, 2) +
            Math.pow(userLocation.longitude - routePlace.longitude, 2)
          ) * 111; // rough deg->km

          const payload = {
            distance: approxDistanceKm,
            duration: Math.round((approxDistanceKm / 40) * 60), // assume 40km/h
            geometry: fallbackGeometry,
          };
          setRouteData(payload);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(payload)); } catch { }
          toast.error(t('route.fallback'));
        } else {
          toast.error(t('messages.cannot_load_route'));
        }
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [routeToPlaceId, routePlace, userLocation]);

  // Center map on selected place
  useEffect(() => {
    if (selectedPlace && mapRef.current && !routeToPlaceId) {
      mapRef.current.flyTo({
        center: [selectedPlace.longitude, selectedPlace.latitude],
        zoom: 15,
        duration: 1000
      });
    }
  }, [selectedPlace, routeToPlaceId]);

  // Fit bounds to show all places
  useEffect(() => {
    if (places.length > 0 && mapRef.current && !selectedPlaceId && !routeToPlaceId) {
      const allPoints = [...places];
      if (userLocation) {
        allPoints.push({
          id: 'user',
          name: 'You',
          address: '',
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        });
      }

      const bounds = allPoints.reduce(
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
  }, [places, selectedPlaceId, userLocation, routeToPlaceId]);

  const handleMapLoad = useCallback((e: any) => {
    mapRef.current = e.target;
  }, []);

  const handleShowRoute = (place: PlaceMarker) => {
    if (!userLocation) {
      toast.error(t('messages.enable_location'));
      return;
    }
    onRouteRequest?.(place.id);
  };

  const handleClearRoute = () => {
    setRouteData(null);
    onRouteClear?.();
  };

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border relative">
      <Map
        onLoad={handleMapLoad}
        initialViewState={{
          longitude: userLocation?.longitude || 106.6297,
          latitude: userLocation?.latitude || 10.8231,
          zoom: 12
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={FALLBACK_STYLE}
        attributionControl={false}
      >
        <NavigationControl position="top-right" />

        {/* Route Line */}
        {routeData && (
          <Source
            id="route"
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: routeData.geometry,
            }}
          >
            <Layer
              id="route-line"
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round',
              }}
              paint={{
                'line-color': '#3b82f6',
                'line-width': 5,
                'line-opacity': 0.8,
              }}
            />
          </Source>
        )}

        {/* User Location Marker */}
        {userLocation && (
          <Marker
            longitude={userLocation.longitude}
            latitude={userLocation.latitude}
            anchor="center"
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-blue-500/20 rounded-full animate-ping" />
              <div className="relative p-2 bg-blue-500 rounded-full shadow-lg">
                <User className="h-4 w-4 text-white" />
              </div>
            </div>
          </Marker>
        )}

        {/* Place Markers */}
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
              className={`cursor-pointer transition-transform hover:scale-110 ${selectedPlaceId === place.id || routeToPlaceId === place.id ? "scale-125" : ""
                }`}
            >
              <div className={`p-2 rounded-full shadow-lg ${routeToPlaceId === place.id
                ? "bg-green-500 text-white"
                : selectedPlaceId === place.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-primary"
                }`}>
                <MapPin className="h-5 w-5" />
              </div>
            </div>
          </Marker>
        ))}

        {selectedPlace && !routeToPlaceId && (
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
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {selectedPlace.address}
              </p>
              {selectedPlace.rating && (
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-yellow-500">★</span>
                  <span className="text-xs">{selectedPlace.rating}</span>
                </div>
              )}
              <button
                onClick={() => handleShowRoute(selectedPlace)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
                disabled={isLoadingRoute}
              >
                {isLoadingRoute ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Navigation className="h-3 w-3" />
                )}
                {t('messages.directions')}
              </button>
            </div>
          </Popup>
        )}
      </Map>

      {/* Route Info Overlay */}
      {routeData && routePlace && (
        <div className="absolute bottom-4 left-4 right-4 bg-card/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-border">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-foreground mb-1">
                {routePlace.name}
              </h4>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-primary" />
                  {routeData.distance.toFixed(1)} km
                </span>
                <span className="flex items-center gap-1">
                  <Navigation className="h-4 w-4 text-primary" />
                  {routeData.duration} {t('common.minutes')}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClearRoute}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoadingRoute && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm">{t('messages.loading_route')}</span>
          </div>
        </div>
      )}
    </div>
  );
}