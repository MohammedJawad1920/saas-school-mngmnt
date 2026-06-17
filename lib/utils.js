import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function generateSecureOTP() {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return Array.from(array, (num) => num % 10).join("");
}

const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NODE_ENV === "development"
      ? `http://localhost:${process.env.PORT || 3000}`
      : process.env.NEXT_PUBLIC_BASE_URL;



const getDefaultValues = (data, formFields) => {
  const defaults = {};
  
  if (!formFields || !Array.isArray(formFields)) return defaults;

  let flatData = data;
  if (data && typeof data === 'object') {
    flatData = {
      ...data,
      ...(data.address || {}),
      ...(data.profilePic || {}),
      ...(data.contact || {})
    };
  }

  formFields.forEach((field) => {
    const value = flatData ? flatData[field.name] : undefined;

    if (flatData && value !== undefined && value !== null) {
      // Handle objects for select/async fields by extracting the ID
      if (value && typeof value === 'object' && !Array.isArray(value) && 
          ['select', 'async-text'].includes(field.inputType)) {
        defaults[field.name] = value._id || value.id || value;
      } else if (field.type === "date") {
        if (typeof value === "string" && value.includes("T")) {
          defaults[field.name] = value.split("T")[0];
        } else {
          try {
            const parsedDate = new Date(value);
            if (!isNaN(parsedDate.getTime())) {
               defaults[field.name] = parsedDate.toISOString().split("T")[0];
            } else {
               defaults[field.name] = value;
            }
          } catch(e) {
            defaults[field.name] = value;
          }
        }
      } else {
        defaults[field.name] = value;
      }
    } else if (field.defaultValue !== undefined) {
      defaults[field.name] = field.defaultValue;
    } else if (field.inputType === "multiSelect") {
      defaults[field.name] = [];
    } else if (field.type === "number") {
      defaults[field.name] = "";
    } else if (field.type === "object" || field.inputType === "image") {
      defaults[field.name] = undefined;
    } else {
      defaults[field.name] = "";
    }
  });
  return defaults;
};

const OPERATORS = {
  EQUALS: "equals",
  NOT_EQUALS: "notEquals",
  CONTAINS: "contains",
  NOT_CONTAINS: "notContains",
  STARTS_WITH: "startsWith",
  ENDS_WITH: "endsWith",
  GREATER_THAN: "greaterThan",
  LESS_THAN: "lessThan",
  GREATER_THAN_OR_EQUAL: "greaterThanOrEqual",
  LESS_THAN_OR_EQUAL: "lessThanOrEqual",
  BETWEEN: "between",
  INCLUDES: "includes",
  EXCLUDES: "excludes",
  IS_EMPTY: "isEmpty",
  IS_NOT_EMPTY: "isNotEmpty",
  IS_NULL: "isNull",
  IS_NOT_NULL: "isNotNull",
  REGEX: "regex",
  DATE_RANGE: "dateRange",
};

const parseUser = (headerStore) => {
  const userHeader = headerStore.get("x-user");
  return userHeader && userHeader !== "undefined" ? JSON.parse(userHeader) : {};
};

async function fetchData(endpoint, searchParams, revalidateTime = 60, key) {
  const apiKey = process.env.API_KEY;
  const url = `${baseURL}/api/${endpoint}?${searchParams ? searchParams : ""}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      next: { revalidate: revalidateTime },
      credentials: "include",
    });

    if (!response.ok) {
      const text = await response.text();
      const errorMessage = `Fetch failed for ${url}: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data[key ? key : endpoint] || [];
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return [];
  }
}

const formatOptions = (items = [], labelKey, valueKey = "_id") =>
  (items || []).map((item) => {
    let label;
    if (Array.isArray(labelKey)) {
      label = labelKey.map((k) => item[k]).filter(Boolean).join(" - ");
    } else if (labelKey) {
      label = item[labelKey];
    } else {
      // Default fallback or specific logic
      label = item.endYear ? `${item.name} (${item.endYear})` : item.name;
    }
    return {
      value: item[valueKey],
      label: label || "Unknown",
      ...item,
    };
  });

const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
];

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (dateString) => {
  if (!dateString) {
    return null;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }
  const dayOfMonth = date.getDate();
  const monthName = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();
  const dayOfWeek = date.toLocaleString("en-US", { weekday: "long" });

  return `${dayOfMonth} ${monthName} ${year}, ${dayOfWeek}`;
};

const formatDateMonthYear = (dateString) => {
  if (!dateString) {
    return null;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }
  const dayOfMonth = date.getDate();
  const monthName = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();

  return `${dayOfMonth} ${monthName} ${year}`;
};

const formatMonthYear = (dateString) => {
  if (!dateString) {
    return null;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }
  const monthName = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();

  return `${monthName} ${year}`;
};

const formatDateShort = (dateString) => {
  if (!dateString) {
    return null;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

const twelveHourFormatLocalTime = (input) => {
  const date = new Date(input); // works with Date or ISO string

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata", // force IST
  }).format(date);
};

const parseDate = (dateString) => {
  const [year, month, day] = dateString.split("-");
  return new Date(year, month - 1, day);
};

function applyCorsHeaders(req, res) {
  console.log("Applying CORS headers");
  res.headers.set("Access-Control-Allow-Origin", baseURL);
  res.headers.set("Access-Control-Allow-Credentials", "true");

  return res;
}

function removeEmptyValuesDeep(obj) {
  if (Array.isArray(obj)) {
    return obj
      .map(removeEmptyValuesDeep)
      .filter((v) => v !== undefined && v !== null && v !== "");
  } else if (typeof obj === "object" && obj !== null) {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      const cleaned = removeEmptyValuesDeep(value);
      if (
        cleaned !== undefined &&
        cleaned !== null &&
        cleaned !== "" &&
        (typeof cleaned !== "object" || Object.keys(cleaned).length > 0)
      ) {
        acc[key] = cleaned;
      }
      return acc;
    }, {});
  }
  return obj;
}

const applyPrintStyles = () => {
  const style = document.createElement("style");
  style.id = "pdf-print-style";

  style.textContent = `
    @page {
      size: portrait;
      margin: 15mm;
    }
    .print\\:block {
      display: block !important;
    }
    .print\\:flex {
      display: flex !important;
    }
    .print\\:inline {
      display: inline !important;
    }
    .print\\:inline-block {
      display: inline-block !important;
    }
    .print\\:hidden {
      display: none !important;
    }
    .print\\:table {
      display: table !important;
    }
    .print\\:table-row-group {
      display: table-row-group !important;
    }
    .table-print {
      max-height: 100% !important;
      overflow: visible !important;
    }
    .print\\:max-h-none {
      max-height: none !important;
    }
    .print\\:overflow-visible {
      overflow: visible !important;
    }  
  `;

  document.head.appendChild(style);
};

const removePrintStyles = () => {
  const style = document.getElementById("pdf-print-style");
  if (style) style.remove();
};

/**
 * Generate unique letters from the first N letters of alphabet in random order
 * @param {number} count - Number of letters to generate (1-26)
 * @param {number} [seed] - Optional seed for deterministic results
 * @returns {string[]} Array of first N letters in random order
 */
export function generateRandomLetters(count) {
  const clampedCount = Math.max(1, Math.min(26, count));

  // Create first N letters array
  const letters = [];
  for (let i = 0; i < clampedCount; i++) {
    letters.push(String.fromCharCode(97 + i));
  }

  // Enhanced Fisher-Yates shuffle with multiple passes
  for (let pass = 0; pass < 3; pass++) {
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
  }

  return letters;
}

const CLASS_ORDER = [
  "PLUS ONE A",
  "PLUS ONE B",
  "PLUS TWO",
  "DEGREE FIRST YEAR",
  "DEGREE SECOND YEAR",
  "DEGREE THIRD YEAR",
  "PG FIRST YEAR",
  "PG SECOND YEAR",
  "8TH STD",
  "9TH STD",
  "10TH STD",
  "11TH STD",
  "12TH STD",
].map(name => name.replace(/\s/g, "").toUpperCase());

const sortClasses = (a, b, getName = (item) => item.name) => {
  const nameA = String(getName(a) || "").trim().toUpperCase().replace(/\s/g, "");
  const nameB = String(getName(b) || "").trim().toUpperCase().replace(/\s/g, "");

  const indexA = CLASS_ORDER.indexOf(nameA);
  const indexB = CLASS_ORDER.indexOf(nameB);

  if (indexA !== -1 && indexB !== -1) {
    return indexA - indexB;
  }
  if (indexA !== -1) {
    return -1;
  }
  if (indexB !== -1) {
    return 1;
  }
  return nameA.localeCompare(nameB);
};

export {
  cn,
  generateSecureOTP,
  baseURL,
  getDefaultValues,
  OPERATORS,
  parseUser,
  fetchData,
  formatOptions,
  DAYS,
  WEEKDAYS,
  formatDate,
  formatDateForDisplay,
  formatDateMonthYear,
  formatMonthYear,
  formatDateShort,
  twelveHourFormatLocalTime,
  parseDate,
  applyCorsHeaders,
  removeEmptyValuesDeep,
  applyPrintStyles,
  removePrintStyles,
  CLASS_ORDER,
  sortClasses,
};
