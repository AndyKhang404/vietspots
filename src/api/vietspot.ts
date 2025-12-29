// VietSpot Backend API Client
const API_BASE_URL = "https://vietspotbackend-production.up.railway.app";

// Types based on API schema - matching actual API response
export interface PlaceInfo {
  id: string;
  place_id?: string;
  name: string;
  address: string;
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  phone?: string;
  website?: string;
  opening_hours?: Record<string, string> | string;
  rating?: number;
  rating_count?: number;
  total_comments?: number;
  image_url?: string;
  images?: { id: string; url: string }[] | string[];
  description?: string;
  about?: Record<string, unknown>;
  coordinates?: { lat: number; lon: number };
  created_at?: string;
  updated_at?: string;
  distance_km?: number;
}

export interface CommentResponse {
  id: string;
  place_id: string;
  user_id: string | null;
  author: string | null;
  rating: number;
  text: string | null;
  date: string;
  images: Array<{ id?: string; url?: string } | string>;
}

export interface ImageResponse {
  image_id: string;
  url: string;
  created_at: string;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  latitude?: number;
  longitude?: number;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  places?: PlaceInfo[];
  itinerary?: DayItinerary[];
}

export interface DayItinerary {
  day: number;
  date?: string;
  activities: ActivityDetail[];
}

export interface ActivityDetail {
  time: string;
  place: PlaceInfo;
  duration?: string;
  notes?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  total?: number;
}

class VietSpotAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Places endpoints - matching mobile app params
  async getPlaces(params?: {
    skip?: number;
    limit?: number;
    category?: string;
    city?: string;
    lat?: number;
    lon?: number;
    maxDistance?: number;
    minRating?: number;
    sortBy?: string;
    search?: string;
  }): Promise<PlaceInfo[]> {
    // If search is provided, use search endpoint
    if (params?.search && params.search.trim().length > 0) {
      return this.searchPlaces({
        q: params.search,
        category: params.category,
        city: params.city,
        limit: params.limit,
      });
    }

    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.set("skip", params.skip.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.category) searchParams.set("categories", params.category);
    if (params?.city) searchParams.set("location", params.city);
    if (params?.lat) searchParams.set("lat", params.lat.toString());
    if (params?.lon) searchParams.set("lon", params.lon.toString());
    if (params?.maxDistance) searchParams.set("max_distance", params.maxDistance.toString());
    if (params?.minRating) searchParams.set("min_rating", params.minRating.toString());
    if (params?.sortBy) searchParams.set("sort_by", params.sortBy);

    const query = searchParams.toString();
    return this.request(`/api/places${query ? `?${query}` : ""}`);
  }

  async getPlace(placeId: string): Promise<PlaceInfo> {
    return this.request(`/api/places/${placeId}`);
  }

  async searchPlaces(params: {
    q: string;
    category?: string;
    city?: string;
    limit?: number;
    lat?: number;
    lon?: number;
  }): Promise<PlaceInfo[]> {
    const searchParams = new URLSearchParams();
    searchParams.set("keyword", params.q); // API uses "keyword"
    if (params.category) searchParams.set("category", params.category);
    if (params.city) searchParams.set("city", params.city);
    if (params.limit) searchParams.set("limit", params.limit.toString());
    if (params.lat) searchParams.set("lat", params.lat.toString());
    if (params.lon) searchParams.set("lon", params.lon.toString());

    return this.request(`/api/places/search?${searchParams.toString()}`);
  }

  async getNearbyPlaces(params: {
    latitude: number;
    longitude: number;
    radius?: number;
    limit?: number;
    minRating?: number;
    categories?: string;
  }): Promise<PlaceInfo[]> {
    const searchParams = new URLSearchParams();
    searchParams.set("lat", params.latitude.toString());
    searchParams.set("lon", params.longitude.toString());
    if (params.radius) searchParams.set("radius", params.radius.toString());
    if (params.limit) searchParams.set("limit", params.limit.toString());
    if (params.minRating) searchParams.set("min_rating", params.minRating.toString());
    if (params.categories) searchParams.set("categories", params.categories);

    return this.request(`/api/places/nearby?${searchParams.toString()}`);
  }

  async getCategories(): Promise<string[]> {
    return this.request("/api/places/categories");
  }

  // Comments endpoints
  async getPlaceComments(
    placeId: string,
    params?: { skip?: number; limit?: number }
  ): Promise<CommentResponse[]> {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.set("skip", params.skip.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    const res = await this.request<any>(
      `/api/places/${placeId}/comments${query ? `?${query}` : ""}`
    );

    // Railway API currently returns a raw array (mobile expects this)
    if (Array.isArray(res)) return res as CommentResponse[];

    // Backward compatible: if API is wrapped
    if (res && typeof res === "object" && Array.isArray(res.data)) {
      return res.data as CommentResponse[];
    }

    return [];
  }

  // Images endpoints
  async getPlaceImages(placeId: string): Promise<APIResponse<ImageResponse[]>> {
    return this.request(`/api/places/${placeId}/images`);
  }

  // Chat endpoints
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.request("/api/chat", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getChatConfig(): Promise<any> {
    return this.request("/api/chat/config");
  }

  // Text-to-Speech: returns audio blob
  async tts(params: { text: string; language?: string; voice?: string } ): Promise<Blob> {
    const res = await fetch(`${this.baseUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: params.text, language: params.language || 'vi-VN', voice: params.voice }),
    });
    if (!res.ok) throw new Error(`TTS Error: ${res.status}`);
    return res.blob();
  }

  // Speech-to-Text: accepts FormData with file and optional language, returns transcription JSON
  async sttTranscribe(formData: FormData): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/stt/transcribe`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`STT Error: ${res.status}`);
    return res.json();
  }

  // Itinerary endpoints
  async generateItinerary(params: {
    destination: string;
    days: number;
    preferences?: string[];
  }): Promise<APIResponse<DayItinerary[]>> {
    return this.request("/api/itinerary/generate", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request("/health");
  }
}

export const vietSpotAPI = new VietSpotAPI();
export default vietSpotAPI;
