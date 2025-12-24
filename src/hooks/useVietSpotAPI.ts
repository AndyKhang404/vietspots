import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import vietSpotAPI, { PlaceInfo, ChatRequest, ChatResponse, CommentResponse } from "@/api/vietspot";

// Places hooks - matching mobile app params
export function usePlaces(params?: {
  skip?: number;
  limit?: number;
  category?: string;
  city?: string;
  minRating?: number;
  sortBy?: string;
}) {
  return useQuery({
    queryKey: ["places", params],
    queryFn: () => vietSpotAPI.getPlaces(params),
  });
}

export function usePlace(placeId: string) {
  return useQuery({
    queryKey: ["place", placeId],
    queryFn: () => vietSpotAPI.getPlace(placeId),
    enabled: !!placeId,
  });
}

export function useSearchPlaces(params: {
  q: string;
  category?: string;
  city?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["searchPlaces", params],
    queryFn: () => vietSpotAPI.searchPlaces(params),
    enabled: params.q.length > 0,
  });
}

export function useNearbyPlaces(params: {
  latitude: number;
  longitude: number;
  radius?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["nearbyPlaces", params],
    queryFn: () => vietSpotAPI.getNearbyPlaces(params),
    enabled: !!(params.latitude && params.longitude),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => vietSpotAPI.getCategories(),
  });
}

// Comments hooks
export function usePlaceComments(
  placeId: string,
  params?: { skip?: number; limit?: number }
) {
  return useQuery<CommentResponse[]>({
    queryKey: ["placeComments", placeId, params],
    queryFn: () => vietSpotAPI.getPlaceComments(placeId, params),
    enabled: !!placeId,
  });
}

// Images hooks
export function usePlaceImages(placeId: string) {
  return useQuery({
    queryKey: ["placeImages", placeId],
    queryFn: () => vietSpotAPI.getPlaceImages(placeId),
    enabled: !!placeId,
  });
}

// Chat hooks
export function useChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ChatRequest) => vietSpotAPI.chat(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
    },
  });
}

// Itinerary hooks
export function useGenerateItinerary() {
  return useMutation({
    mutationFn: (params: {
      destination: string;
      days: number;
      preferences?: string[];
    }) => vietSpotAPI.generateItinerary(params),
  });
}

// Health check hook
export function useHealthCheck() {
  return useQuery({
    queryKey: ["healthCheck"],
    queryFn: () => vietSpotAPI.healthCheck(),
    refetchInterval: 30000, // Check every 30 seconds
  });
}
