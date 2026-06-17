import axios from "axios";
import Cookies from "js-cookie";

const formatErrorMessage = (error) => {
  if (error.response?.data?.details?.errors) {
    return "Validation failed. Please check the highlighted fields.";
  } else if (error.response?.data?.message) {
    return error.response.data.message;
  } else if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error.message) return error.message;
  if (error.response?.statusText) return `${error.response.status} ${error.response.statusText}`;
  if (error.response?.status) return `HTTP Error ${error.response.status}`;

  return "An unexpected error occurred.";
};

// Function to handle API errors
const handleApiError = (error) => {
  // If it's an Axios error, extract the response data
  if (axios.isAxiosError(error)) {
    const errData = error.response ? error.response.data : error.message;
    if (!error.response) {
      console.error("No response received from server. Possible Network Error or CORS issue.");
      if (error.config) {
        console.error("Failed Request URL:", error.config.url);
        console.error("Failed Request Headers:", error.config.headers);
      }
    }
    console.error("API Error Data:", JSON.stringify(errData, null, 2));
    console.error("Full API Error details:", error);

    const errorMessage = formatErrorMessage(error);

    // Create a more structured error object
    const apiError = new Error(errorMessage);
    apiError.code = error.response?.data?.code;
    apiError.statusCode = error.response?.status;

    // Pass through field-specific validation errors if they exist
    if (error.response?.data?.details?.errors) {
      apiError.details = {
        errors: error.response.data.details.errors,
      };
    }

    throw apiError;
  }

  // For non-Axios errors, simply pass through
  throw error;
};

// Fetch items with pagination and filtering
export const fetchItems = async (
  apiEndpoint,
  apiKey,
  page = 0,
  limit = 20,
  filters = {}
) => {
  try {
    // Construct query parameters
    const queryParams = new URLSearchParams({
      page,
      limit,
    });

    // Add any filter parameters if provided
    if (filters && Object.keys(filters).length > 0) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          queryParams.append(key, value);
        }
      });
    }

    const activeYear = Cookies.get("active-year");
    if (activeYear && !queryParams.has("year") && apiEndpoint !== "syllabus") {
      queryParams.append("year", activeYear);
    }

    const url = `/api/${apiEndpoint}?${queryParams.toString()}`;
    const response = await axios.get(
      url,
      {
        headers: {
          "api-key": apiKey,
        },
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Fetch a single item by ID
export const fetchItemById = async (apiEndpoint, id, apiKey) => {
  try {
    const response = await axios.get(`/api/${apiEndpoint}/${id}`, {
      headers: {
        "api-key": apiKey,
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Add a new item
export const addItem = async (apiEndpoint, data, apiKey) => {
  try {
    const activeRole = Cookies.get("active-role");
    const activeYear = Cookies.get("active-year");
    const response = await axios.post(`/api/${apiEndpoint}`, data, {
      headers: {
        "api-key": apiKey,
        "active-role": activeRole,
        "active-year": activeYear,
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update an existing item
export const updateItem = async (apiEndpoint, data, apiKey) => {
  try {
    const activeRole = Cookies.get("active-role");
    const activeYear = Cookies.get("active-year");
    const response = await axios.put(`/api/${apiEndpoint}`, data, {
      headers: {
        "api-key": apiKey,
        "active-role": activeRole,
        "active-year": activeYear,
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Delete an item
export const deleteItem = async (apiEndpoint, data, apiKey) => {
  try {
    const activeRole = Cookies.get("active-role");
    const activeYear = Cookies.get("active-year");
    const response = await axios.delete(`/api/${apiEndpoint}`, {
      headers: {
        "api-key": apiKey,
        "active-role": activeRole,
        "active-year": activeYear,
      },
      data,
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
