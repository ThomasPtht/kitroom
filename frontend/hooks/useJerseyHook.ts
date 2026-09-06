import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jerseyService } from "@/services/jersey.service";
import { sportsService } from "@/services/sport.service";
import { kotdService } from "@/services/kotd.service";
import i18n from "@/lib/i18n";

// Get all jerseys query hook
export const useJerseys = () => {
  return useQuery({
    queryKey: ["jerseys"],
    queryFn: jerseyService.getAll,
  });
};

// Create a jersey mutation hook
export const useCreateJersey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => jerseyService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jerseys"] });
      queryClient.invalidateQueries({ queryKey: ["jerseyCount"] });
      queryClient.invalidateQueries({ queryKey: ["mostRepresentedClub"] });
      queryClient.invalidateQueries({ queryKey: ["collectionAnalytics"] });
    },
    onError: (error) => {
      console.error("Error creating jersey:", error);
    },
  });
};

export const useJerseyCount = () => {
  return useQuery({
    queryKey: ["jerseyCount"],
    queryFn: async () => {
      const count = await jerseyService.getTotalJerseysCount();
      return count !== undefined ? count : 0; // Return 0 if count is undefined
    },
  });
};

export const useMostRepresentedClub = () => {
  return useQuery({
    queryKey: ["mostRepresentedClub"],
    queryFn: async () => {
      const club = await jerseyService.getMostRepresentedClub();
      return club;
    },
  });
};

export const useSports = () => {
  return useQuery({
    queryKey: ["sports"],
    queryFn: sportsService.getSports,
  });
};

export const useJerseyOfTheDay = () => {
  return useQuery({
    queryKey: ["kotd", i18n.language],
    queryFn: kotdService.getJerseyOfTheDay,
  });
};

export const useToggleLikeJersey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jerseyId: string) => kotdService.toggleLike(jerseyId),
    // Update the cached data for the jersey of the day after toggling like
    onSuccess: (data: { liked: boolean }) => {
      queryClient.setQueryData(["kotd", i18n.language], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          hasLiked: data.liked,
          likesCount: data.liked
            ? oldData.likesCount + 1
            : oldData.likesCount - 1,
        };
      });
      // Invalidate the locker query to refresh the data after toggling like
      queryClient.invalidateQueries({ queryKey: ["locker"] });
    },
    onError: (error) => {
      console.error("Error toggling like:", error);
    },
  });
};

export const useJerseyLikes = (jerseyId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["jerseyLikes", jerseyId],
    queryFn: () => jerseyService.getJerseyLikes(jerseyId),
    enabled,
  });
};

export const useCollectionAnalytics = () => {
  return useQuery({
    queryKey: ["collectionAnalytics"],
    queryFn: jerseyService.getCollectionAnalytics,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export const useUpdateJersey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      jerseyService.updateJersey(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jerseys"] });
      queryClient.invalidateQueries({ queryKey: ["jerseyCount"] });
      queryClient.invalidateQueries({ queryKey: ["mostRepresentedClub"] });
      queryClient.invalidateQueries({ queryKey: ["collectionsAnalytics"] });
    },
    onError: (error) => {
      console.error("Error updating jersey:", error);
    },
  });
};

export const useDeleteJersey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jerseyService.deleteJersey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jerseys"] });
      queryClient.invalidateQueries({ queryKey: ["jerseyCount"] });
      queryClient.invalidateQueries({ queryKey: ["mostRepresentedClub"] });
      queryClient.invalidateQueries({ queryKey: ["collectionAnalytics"] });
      queryClient.invalidateQueries({ queryKey: ["kotd"] });
    },
    onError: (error) => {
      console.error("Error deleting jersey:", error);
    },
  });
};
