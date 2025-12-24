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
  images?: { id: string; url: string }[];
  description?: string;
  about?: Record<string, unknown>;
  coordinates?: { lat: number; lon: number };
  created_at?: string;
  updated_at?: string;
}

export interface CommentResponse {
  comment_id: string;
  place_id: string;
  user_id: string;
  content: string;
  rating: number;
  created_at: string;
  updated_at?: string;
  images?: ImageResponse[];
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

  // Places endpoints
  async getPlaces(params?: {
    skip?: number;
    limit?: number;
    category?: string;
    city?: string;
  }): Promise<PlaceInfo[]> {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.set("skip", params.skip.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.category) searchParams.set("category", params.category);
    if (params?.city) searchParams.set("city", params.city);

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
  }): Promise<PlaceInfo[]> {
    const searchParams = new URLSearchParams();
    searchParams.set("q", params.q);
    if (params.category) searchParams.set("category", params.category);
    if (params.city) searchParams.set("city", params.city);
    if (params.limit) searchParams.set("limit", params.limit.toString());

    return this.request(`/api/places/search?${searchParams.toString()}`);
  }

  async getNearbyPlaces(params: {
    latitude: number;
    longitude: number;
    radius?: number;
    limit?: number;
  }): Promise<PlaceInfo[]> {
    const searchParams = new URLSearchParams();
    searchParams.set("latitude", params.latitude.toString());
    searchParams.set("longitude", params.longitude.toString());
    if (params.radius) searchParams.set("radius", params.radius.toString());
    if (params.limit) searchParams.set("limit", params.limit.toString());

    return this.request(`/api/places/nearby?${searchParams.toString()}`);
  }

  async getCategories(): Promise<string[]> {
    return this.request("/api/places/categories");
  }

  // Comments endpoints
  async getPlaceComments(
    placeId: string,
    params?: { skip?: number; limit?: number }
  ): Promise<APIResponse<CommentResponse[]>> {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.set("skip", params.skip.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    return this.request(
      `/api/places/${placeId}/comments${query ? `?${query}` : ""}`
    );
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
