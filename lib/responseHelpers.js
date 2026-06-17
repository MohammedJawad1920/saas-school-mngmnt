/**
 * Helper utilities for transforming legacy responses to new format
 * Use these during migration to avoid breaking existing frontend code
 */

/**
 * Wraps legacy response data in new standard format
 * @param {object} legacyResponse - Old response shape (e.g., { batches, pagination, message })
 * @param {string} dataKey - Primary data field name (e.g., "batches")
 * @returns {object} Standardized response
 */
export function wrapLegacyResponse(legacyResponse, dataKey) {
  const { message, ...rest } = legacyResponse;

  // Extract primary data
  const data = rest[dataKey];

  // Extract metadata (pagination, counts, etc.)
  const meta = { ...rest };
  delete meta[dataKey];

  return {
    success: true,
    data,
    message: message || "Operation successful",
    meta: Object.keys(meta).length > 0 ? meta : undefined,
  };
}

/**
 * Builds pagination metadata object
 */
export function buildPaginationMeta(page, limit, total) {
  const totalPages = limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit));

  return {
    pagination: {
      page: parseInt(page),
      limit: limit === Infinity ? total : parseInt(limit),
      total,
      totalPages,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 0,
    },
  };
}

/**
 * Combines data with pagination metadata
 */
export function withPagination(data, page, limit, total, message = "Data fetched successfully") {
  return {
    success: true,
    data,
    message,
    meta: buildPaginationMeta(page, limit, total),
  };
}
