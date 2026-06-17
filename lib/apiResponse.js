import { NextResponse } from "next/server";
import { handleApiError, ApiError } from "./errorHandler";

/**
 * ============================================================================
 * STANDARDIZED API RESPONSE UTILITY
 * ============================================================================
 *
 * ALL API responses MUST use one of these helpers to ensure consistency.
 *
 * SUCCESS RESPONSE SHAPE:
 * {
 *   success: true,
 *   data: <any>,           // Primary payload (object, array, primitive)
 *   message: <string>,     // Human-readable success message
 *   meta?: <object>        // Optional metadata (pagination, counts, etc.)
 * }
 *
 * ERROR RESPONSE SHAPE:
 * {
 *   success: false,
 *   error: <string>,       // User-facing error message
 *   code: <string>,        // Machine-readable error code
 *   details?: <object>     // Optional error details (validation errors, etc.)
 * }
 */

// ============================================================================
// SUCCESS RESPONSES
// ============================================================================

/**
 * Standard success response for GET/POST/PUT operations
 * @param {*} data - Primary response data
 * @param {string} message - Success message
 * @param {object} meta - Optional metadata (pagination, etc.)
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export function apiSuccess(
  data,
  message = "Operation successful",
  meta = null,
  statusCode = 200
) {
  const response = {
    success: true,
    data,
    message,
  };

  // Only include meta if it exists
  if (meta) {
    response.meta = meta;
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Success response for resource creation (POST)
 * Automatically sets status 201
 */
export function apiCreated(data, message = "Resource created successfully") {
  return apiSuccess(data, message, null, 201);
}

/**
 * Success response for no content (DELETE with no return data)
 * Returns 204 No Content
 */
export function apiNoContent() {
  return new NextResponse(null, { status: 204 });
}

// ============================================================================
// ERROR RESPONSES
// ============================================================================

/**
 * Standard error response
 * @param {Error|string} error - Error object or message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} code - Machine-readable error code
 * @param {object} details - Additional error details
 */
export function apiError(
  error,
  statusCode = 500,
  code = "INTERNAL_ERROR",
  details = null
) {
  // Process error through errorHandler
  const processedError =
    error instanceof ApiError ? error : handleApiError(error);

  const response = {
    success: false,
    error: processedError.message,
    code: processedError.code || code,
  };

  // Only include details if they exist
  if (processedError.details || details) {
    response.details = processedError.details || details;
  }

  return NextResponse.json(response, {
    status: processedError.statusCode || statusCode,
  });
}

/**
 * Validation error (400 Bad Request)
 */
export function apiBadRequest(message = "Invalid request", details = null) {
  return apiError(
    new ApiError(message, 400, "VALIDATION_ERROR", details),
    400,
    "VALIDATION_ERROR",
    details
  );
}

/**
 * Unauthorized error (401)
 */
export function apiUnauthorized(message = "Authentication required") {
  return apiError(
    new ApiError(message, 401, "UNAUTHORIZED"),
    401,
    "UNAUTHORIZED"
  );
}

/**
 * Forbidden error (403)
 */
export function apiForbidden(message = "Access denied") {
  return apiError(new ApiError(message, 403, "FORBIDDEN"), 403, "FORBIDDEN");
}

/**
 * Not found error (404)
 */
export function apiNotFound(resource = "Resource") {
  return apiError(
    new ApiError(`${resource} not found`, 404, "NOT_FOUND"),
    404,
    "NOT_FOUND"
  );
}

/**
 * Conflict error (409) - for duplicate resources
 */
export function apiConflict(
  message = "Resource already exists",
  details = null
) {
  return apiError(
    new ApiError(message, 409, "CONFLICT", details),
    409,
    "CONFLICT",
    details
  );
}

/**
 * Internal server error (500)
 */
export function apiServerError(message = "Internal server error") {
  return apiError(
    new ApiError(message, 500, "INTERNAL_ERROR"),
    500,
    "INTERNAL_ERROR"
  );
}

// ============================================================================
// LEGACY COMPATIBILITY (DEPRECATED - DO NOT USE)
// ============================================================================

/**
 * @deprecated Use apiSuccess() instead
 */
export const apiResponse = {
  success: (data, message, meta) => apiSuccess(data, message, meta),
  error: (error) => apiError(error),
};

// ============================================================================
// EXPORTS
// ============================================================================

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  success: apiSuccess,
  created: apiCreated,
  noContent: apiNoContent,
  error: apiError,
  badRequest: apiBadRequest,
  unauthorized: apiUnauthorized,
  forbidden: apiForbidden,
  notFound: apiNotFound,
  conflict: apiConflict,
  serverError: apiServerError,
};
