import { apiClient } from "./api";
import i18n from "../lib/i18n";

export interface JerseyOfTheDay {
  id: string;
  frontImageUrl: string;
  backImageUrl?: string | null;
  playerName?: string | null;
  number?: number | null;
  season?: string | null;
  type: string;
  version: string;
  club: {
    name: string;
    logoUrl?: string | null;
  };
  story: string;
  likesCount: number;
  hasLiked: boolean;
}

export const kotdService = {
  getJerseyOfTheDay: async () => {
    console.log("Langue envoyée:", i18n.language);
    const response = await apiClient.get(`/kotd?locale=${i18n.language}`);
    return response.data;
  },

  toggleLike: async (jerseyId: string) => {
    const response = await apiClient.post(`/kotd/${jerseyId}/like`);
    return response.data;
  },

 
};
