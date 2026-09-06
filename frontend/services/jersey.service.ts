import { apiClient } from "./api";

export interface JerseyData {
  id?: string;
  sportId: string;
  clubId: string;
  playerName?: string;
  number?: number;
  season?: string;
  type?: string;
  size?: string;
  condition?: string;
  version?: string;
  description?: string;
  frontImageUri: string;
  frontImageUrl?: string;
  backImageUri?: string | null;
  backImageUrl?: string | null;
  club?: {
    name: string;
  };
  isOfficial: boolean;
  brand: string;
  purchasePrice: number;
  likesCount?: number;
  hasLiked?: boolean;
}

export const jerseyService = {
  getAll: async () => {
    const { data } = await apiClient.get("/jerseys");
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get(`/jerseys/${id}`);
    return data;
  },

  create: async (formData: FormData) => {
    const { data } = await apiClient.post("/jerseys", formData);

    return data;
  },

  getTotalJerseysCount: async () => {
    const { data } = await apiClient.get("/jerseys/total");

    return data;
  },

  getMostRepresentedClub: async () => {
    const { data } = await apiClient.get("/jerseys/MostRepresentedClub");

    return data;
  },

  exportCollection: async () => {
    const { data } = await apiClient.get("/jerseys/export");
    return data;
  },

  getCollectionAnalytics: async () => {
    const { data } = await apiClient.get("/jerseys/analytics");
    return data;
  },

  updateJersey: async (id: string, formData: FormData) => {
    const { data } = await apiClient.patch(`/jerseys/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  },

  deleteJersey: async (id: string) => {
    const { data } = await apiClient.delete(`/jerseys/${id}`);
    return data;
  },

  getJerseyLikes: async (jerseyId: string) => {
    const { data } = await apiClient.get(`/jerseys/${jerseyId}/likes`);
    return data;
  },
};
