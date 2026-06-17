import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchItems,
  fetchItemById,
  addItem,
  updateItem,
  deleteItem,
} from "@/lib/api";

const useCrud = (apiEndpoint, apiKey) => {
  // Fetch items with pagination support
  const useFetchItems = (page = 0, limit = 20, filters = {}, options = {}) => {
    return useQuery({
      queryKey: [apiEndpoint, page, limit, filters],
      queryFn: () => fetchItems(apiEndpoint, apiKey, page, limit, filters),
      ...options,
    });
  };

  // Fetch a single item by ID
  const useFetchItemById = (id, enabled = true) => {
    return useQuery({
      queryKey: [apiEndpoint, id],
      queryFn: () => fetchItemById(apiEndpoint, id, apiKey),
      enabled: !!id && enabled,
    });
  };

  // Add an item
  const useAddItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (data) => addItem(apiEndpoint, data, apiKey),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [apiEndpoint],
          exact: false,
        });

        // Cross-resource invalidation for attendance actions
        if (apiEndpoint === "attendances") {
          queryClient.invalidateQueries({ queryKey: ["teacherAttendances"] });
          queryClient.invalidateQueries({ queryKey: ["timeTables"] });
          queryClient.invalidateQueries({ queryKey: ["leave-records"] });
        }
      },
    });
  };

  // Update an item
  const useUpdateItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ data }) => updateItem(apiEndpoint, data, apiKey),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [apiEndpoint],
          exact: false,
        });

        // Cross-resource invalidation for attendance actions
        if (apiEndpoint === "attendances") {
          queryClient.invalidateQueries({ queryKey: ["teacherAttendances"] });
          queryClient.invalidateQueries({ queryKey: ["timeTables"] });
          queryClient.invalidateQueries({ queryKey: ["leave-records"] });
        }
      },
    });
  };

  // Delete an item
  const useDeleteItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ data }) =>
        deleteItem(apiEndpoint, data, apiKey),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [apiEndpoint] });

        // Cross-resource invalidation for attendance actions
        if (apiEndpoint === "attendances") {
          queryClient.invalidateQueries({ queryKey: ["teacherAttendances"] });
          queryClient.invalidateQueries({ queryKey: ["timeTables"] });
          queryClient.invalidateQueries({ queryKey: ["leave-records"] });
        }
      },
    });
  };

  return {
    useFetchItems,
    useFetchItemById,
    useAddItem,
    useUpdateItem,
    useDeleteItem,
  };
};

export default useCrud;
