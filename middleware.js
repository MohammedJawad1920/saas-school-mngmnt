import { jwtVerify } from "jose";
import { NextResponse } from "next/server";


// Pre-encode the secret key
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

// Cache configuration
const userCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes maximum TTL
const CACHE_SOFT_TTL = 5 * 60 * 1000; // 5 minutes soft TTL for stale-while-revalidate
const CACHE_MAX_SIZE = 1000; // Prevent unbounded cache growth

// Pages
const pages = [
  {
    title: "Dashboard",
    path: "/dashboard",
    allowedRoles: [
      "College Admin",
      "Teacher",
      "Org Admin",
      "Student",
      "Program Committee",
      "Program Leader",
      "Finance",
      "Literary Leader",
      "Spark Admin",
    ],
  },
  {
    title: "My Periods",
    path: "/dashboard/my-periods",
    allowedRoles: ["Teacher"],
  },
  {
    title: "Attendances",
    path: "/dashboard/attendances",
    allowedRoles: ["Teacher"],
  },
  {
    title: "My Time Table",
    path: "/dashboard/my-time-table",
    allowedRoles: ["Teacher"],
  },
  {
    title: "My Attendance",
    path: "/dashboard/my-attendance",
    allowedRoles: ["Teacher"],
  },
  {
    title: "Teachers",
    path: "/dashboard/teachers",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Batches",
    path: "/dashboard/batches",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Debtors",
    path: "/dashboard/debtors",
    allowedRoles: ["Org Admin"],
  },

  {
    title: "Spark Finance",
    path: "/dashboard/spark/finance",
    allowedRoles: ["Spark Admin"],
  },
  {
    title: "Spark Committee",
    path: "/dashboard/spark/committee",
    allowedRoles: ["Spark Admin"],
  },
  {
    title: "Spark Verification",
    path: "/dashboard/spark/verification",
    allowedRoles: ["Spark Admin"],
  },
  {
    title: "Spark Contacts",
    path: "/dashboard/spark/contacts",
    pattern: /^\/dashboard\/spark\/contacts(?:\/[^/]+)?$/,
    allowedRoles: ["Spark Admin"],
  },
  {
    title: "Spark Dashboard",
    path: "/dashboard/spark",
    allowedRoles: ["Student", "Spark Admin"],
  },
  {
    title: "Alumnies",
    path: "/dashboard/alumnies",
    allowedRoles: ["Student", "Spark Admin"],
  },
  {
    path: "/dashboard/alumnies",
    pattern: /^\/dashboard\/alumnies.*$/,
    allowedRoles: ["Student", "Spark Admin"],
  },
  {
    title: "Classes",
    path: "/dashboard/classes",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Students",
    path: "/dashboard/students",
    allowedRoles: ["College Admin", "Student"],
  },
  {
    title: "Faculty",
    path: "/dashboard/faculty",
    allowedRoles: ["Student", "College Admin", "Teacher", "Org Admin"],
  },
  {
    title: "Leave History",
    path: "/dashboard/leave-history",
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    title: "Subjects",
    path: "/dashboard/subjects",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Periods",
    path: "/dashboard/periods",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Time Tables",
    path: "/dashboard/time-tables",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Marks",
    path: "/dashboard/marks",
    allowedRoles: ["Teacher", "College Admin"],
  },
  {
    title: "Leave Register",
    path: "/dashboard/leave-register",
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    title: "Students Families",
    path: "/dashboard/students-families",
    allowedRoles: ["College Admin"],
  },
  {
    path: "/dashboard/leave-register",
    pattern: /^\/dashboard\/leave-register(?:\/[^/]+)?$/,
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    path: "/dashboard/remarks",
    pattern: /^\/dashboard\/remarks(?:\/[^/]+)?$/,
    allowedRoles: ["Teacher", "College Admin"],
  },

  {
    title: "Applications",
    path: "/dashboard/applications",
    allowedRoles: ["College Admin"],
  },

  {
    title: "Applicant Details",
    path: "/dashboard/applications",
    pattern: /^\/dashboard\/applications(?:\/[^/]+)?$/,
    allowedRoles: ["College Admin"],
  },

  {
    title: "Students Contacts",
    path: "/dashboard/students-contacts",
    pattern: /^\/dashboard\/students-contacts(?:\/[^/]+)?$/,
    allowedRoles: ["Teacher", "College Admin"],
  },

  {
    title: "Attendance History",
    path: "/dashboard/attendance-tracking",
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    title: "Students Reports",
    path: "/dashboard/students-reports",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Attendance Sheet",
    path: "/dashboard/attendance-sheet",
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    title: "Attendance Table",
    path: "/dashboard/attendance-table",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Identity Cards",
    path: "/dashboard/identity-cards",
    allowedRoles: ["College Admin", "Teacher", "Student"],
  },
  {
    title: "Literary Groups",
    path: "/dashboard/literary-groups",
    allowedRoles: ["Literary Leader"],
  },
  {
    title: "Literary Attendance",
    path: "/dashboard/literary-attendance",
    allowedRoles: ["Literary Leader"],
  },
  {
    title: "Literary Attendance Sheet",
    path: "/dashboard/literary-attendance/attendance-sheet",
    allowedRoles: ["Literary Leader"],
  },
  {
    title: "Literary Attendance Mark",
    path: "/dashboard/literary-attendance/mark-attendance",
    pattern: /^\/dashboard\/literary-attendance\/mark-attendance(?:\/[^/]+)?$/,
    allowedRoles: ["Literary Leader"],
  },

  {
    title: "Attendance History",
    path: "/dashboard/literary-attendance/attendance-tracking",
    allowedRoles: ["Literary Leader"],
  },
  {
    title: "Admission Register",
    path: "/dashboard/admission-register",
    pattern: /^\/dashboard\/admission-register(?:\/[^/]+)?$/,
    allowedRoles: ["College Admin"],
  },
  {
    title: "Finance",
    path: "/dashboard/finance",
    allowedRoles: ["Org Admin"],
  },
  {
    title: "Accounts",
    path: "/dashboard/accounts",
    allowedRoles: ["College Admin", "Org Admin"],
  },
  {
    title: "Students Fund",
    path: "/dashboard/students-fund",
    allowedRoles: ["Teacher"],
  },
  {
    title: "Student Coupon Fund",
    path: "/dashboard/student-coupon-fund",
    allowedRoles: ["Org Admin"],
  },
  {
    title: "Library Dashboard",
    path: "/library-dashboard",
    allowedRoles: ["Librarian"],
  },
  {
    title: "Books",
    path: "/dashboard/books",
    allowedRoles: ["Librarian"],
  },
  {
    title: "Rentals",
    path: "/dashboard/rentals",
    allowedRoles: ["Librarian"],
  },
  {
    title: "Library Requests",
    path: "/dashboard/library-requests",
    allowedRoles: ["Librarian"],
  },
  {
    title: "Downloads",
    path: "/dashboard/downloads",
    allowedRoles: ["College Admin", "Student", "Teacher"],
  },
  {
    title: "Syllabus",
    path: "/dashboard/syllabus",
    allowedRoles: ["College Admin", "Student", "Teacher"],
  },
  {
    path: "/dashboard/downloads",
    pattern: /^\/dashboard\/downloads(?:\/[^/]+)?$/,
    allowedRoles: ["College Admin", "Student", "Teacher"],
  },
  {
    title: "Divisions",
    path: "/dashboard/divisions",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Teams",
    path: "/dashboard/teams",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Participants",
    path: "/dashboard/participants",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Programs",
    path: "/dashboard/programs",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Program Registration",
    path: "/dashboard/program-registration",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Code Letters",
    path: "/dashboard/code-letters",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Grade Scheme",
    path: "/dashboard/grade-scheme",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Evaluation",
    path: "/dashboard/evaluation",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Results",
    path: "/dashboard/results",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Participants Card",
    path: "/dashboard/participants-card",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Schedules",
    path: "/dashboard/schedules",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Rules & Topics",
    path: "/dashboard/rules-topics",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Instructions",
    path: "/dashboard/instructions",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Team Points",
    path: "/dashboard/team-points",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Individual Points",
    path: "/dashboard/individual-points",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Declared Results",
    path: "/dashboard/declared-results",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Evaluation Sheets",
    path: "/dashboard/evaluation-sheets",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Unregistered programs",
    path: "/dashboard/unregistered-programs",
    allowedRoles: ["Program Committee", "Program Leader"],
  },
  {
    title: "Scratch cards",
    path: "/dashboard/scratch-cards",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Winners list",
    path: "/dashboard/winners-list",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Non Winners list",
    path: "/dashboard/non-winners",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Non Responders list",
    path: "/dashboard/non-responders",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "individual Results",
    path: "/dashboard/individual-results",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Settings",
    path: "/dashboard/settings",
    pattern: /^\/dashboard\/settings(?:\/[^/]+)?$/,
    allowedRoles: ["College Admin", "Program Committee", "Spark Admin", "Org Admin"],
  },
  {
    title: "Masjid Attendance",
    path: "/dashboard/masjid-attendance",
    allowedRoles: ["Org Admin", "Teacher"],
  },
  {
    title: "Masjid Attendance Mark",
    path: "/dashboard/masjid-attendance/mark",
    pattern: /^\/dashboard\/masjid-attendance\/mark(?:\/[^/]+)?$/,
    allowedRoles: ["Org Admin", "Teacher"],
  },
  {
    title: "Masjid Attendance History",
    path: "/dashboard/masjid-attendance/history",
    allowedRoles: ["Org Admin", "Teacher"],
  },
  {
    title: "Articles",
    path: "/dashboard/articles",
    allowedRoles: ["Org Admin"],
  },
  {
    title: "Updates",
    path: "/dashboard/updates",
    allowedRoles: ["Org Admin"],
  },
  {
    title: "No Role Users",
    path: "/dashboard/no-role-users",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Pending Code Letters",
    path: "/dashboard/pending-codeletters",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Pending Evaluation",
    path: "/dashboard/pending-evaluation",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Undeclared Results",
    path: "/dashboard/undeclared-results",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Results QR Code",
    path: "/dashboard/results-qr-code",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Poster Customizer",
    path: "/dashboard/poster-customizer",
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Reset",
    path: "/dashboard/program-management/reset",
    allowedRoles: ["Program Committee"],
  },

  {
    title: "Academic Calendar",
    path: "/dashboard/academic-calendar",
    allowedRoles: ["College Admin"],
  },
  {
    title: "Gate Pass",
    path: "/dashboard/gate-pass",
    allowedRoles: ["College Admin", "Gate Keeper", "Teacher"],
  },
];

// Pre-compile pages map/array for O(1) lookup
const exactPagesMap = new Map();
const patternPages = [];

pages.forEach((page) => {
  if (page.pattern) {
    patternPages.push(page);
  } else {
    exactPagesMap.set(page.path, page.allowedRoles);
  }
});

export async function middleware(req, event) {
  if (req.nextUrl.pathname === "/") {
    return NextResponse.next();
  }
  if (req.nextUrl.pathname === "/login") {
    return handleLoginPageRequest(req);
  }
  // Check if this is an API route
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return handleApiRequest(req);
  }

  // Handle regular authentication for dashboard routes
  return handleAuthRequest(req, event);
}

async function handleLoginPageRequest(req) {
  const token = req.cookies.get("auth-token")?.value;
  const activeRole = req.cookies.get("active-role")?.value;

  // If no token, allow access to login page
  if (!token) {
    return NextResponse.next();
  }

  try {
    // Verify JWT token to check if it's valid
    const { payload } = await jwtVerify(token, SECRET_KEY);

    if (activeRole === "Teacher") {
      return NextResponse.redirect(new URL("/dashboard/my-periods", req.url));
    }



    if (activeRole === "Librarian") {
      return NextResponse.redirect(
        new URL("/library-dashboard", req.url)
      );
    }

    if (activeRole === "Gate Keeper") {
      return NextResponse.redirect(new URL("/dashboard/gate-pass", req.url));
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (error) {
    // Token is invalid, allow access to login page
    console.error("Login page token verification error:", error.message);
    return NextResponse.next();
  }
}

async function handleApiRequest(req) {
  if (req.nextUrl.pathname === "/api/upload") return NextResponse.next();

  const url = new URL(req.url);
  const apiKey = req.headers.get("api-key");
  const cronSecret = url.searchParams.get("cronSecret");
  const authToken = req.cookies.get("auth-token")?.value;

  // Public GET endpoints that don't require API key
  const publicGet = [
    "/api/divisions",
    "/api/programs",
    "/api/results",
    "/api/settings",
    "/api/student-attendance-lookup",
    "/api/vcard",
    "/api/vcard/class",
  ];

  if (req.method === "GET" && publicGet.includes(url.pathname)) {
    return NextResponse.next();
  }

  if (cronSecret === process.env.CRON_SECRET) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.includes("/api/auth")) {
    return NextResponse.next();
  }

  // Allow authenticated users (with valid JWT) to access API without API key
  if (authToken) {
    try {
      const { payload } = await jwtVerify(authToken, SECRET_KEY);

      const user = {
        _id: payload.userId,
        roles: payload.roles || ["User"],
        name: payload.name || "User",
        userId: payload.userId,
      };

      const res = NextResponse.next();
      res.headers.set("x-user", JSON.stringify(user));
      return res;
    } catch (error) {
      // Token is invalid, continue to check API key
      console.error("Invalid auth token in API request:", error.message);
    }
  }

  // If no valid auth token, require API key
  if (apiKey !== process.env.API_KEY) {
    return NextResponse.json(
      { message: "Unauthorized - API key missing" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

async function handleAuthRequest(req, event) {
  const isE2ETest = req.headers.get("x-e2e-test") === "true";

  if (isE2ETest) {
    const activeRole = req.headers.get("active-role") || "College Admin";

    const mockUser = {
      _id: "e2e-test-user-id",
      roles: [activeRole],
      name: "E2E Test User",
    };

    const res = NextResponse.next();
    res.headers.set("x-user", JSON.stringify(mockUser));
    res.cookies.set("active-role", activeRole, {
      path: "/",
      sameSite: "lax",
    });

    if (!isUserAllowed(activeRole, req.nextUrl.pathname)) {
      return redirectTo404(req);
    }
    return res;
  }

  // Check for standard auth token first
  const token = req.cookies.get("auth-token")?.value;
  // Check for custom member token as fallback
  const customToken = req.cookies.get("custom-member-token")?.value;

  if (!token && !customToken) {
    return redirectToLogin(req);
  }

  const activeToken = token || customToken;

  try {
    // Verify JWT token
    const { payload } = await jwtVerify(activeToken, SECRET_KEY);
    const { userId } = payload;

    // For custom members without a userId in payload (older tokens), use email
    const effectiveUserId = userId || payload.email;

    if (!effectiveUserId) {
      return redirectToLogin(req);
    }

    // Check cache first
    const cachedEntry = getUserFromCache(effectiveUserId);

    if (cachedEntry) {
      const { user, timestamp } = cachedEntry;
      const now = Date.now();
      
      // If the cached item is stale but not expired, trigger background revalidation
      if (now - timestamp > CACHE_SOFT_TTL) {
        const revalidatePromise = fetchUserProfile(effectiveUserId, process.env.API_KEY, req.nextUrl.origin)
          .then((updatedUser) => {
            if (updatedUser) {
              storeUserInCache(effectiveUserId, updatedUser);
            }
          })
          .catch((err) => {
            console.error("Background cache revalidation failed:", err.message);
          });

        if (event && typeof event.waitUntil === "function") {
          event.waitUntil(revalidatePromise);
        }
      }

      return prepareResponse(req, activeToken, user);
    }

    try {
      // Try to fetch user (profile API now handles custom roles)
      const user = await fetchUserProfile(effectiveUserId, process.env.API_KEY, req.nextUrl.origin);

      if (user) {
        storeUserInCache(effectiveUserId, user);
        return prepareResponse(req, activeToken, user);
      }
    } catch (fetchError) {
      console.error("Error fetching user profile:", fetchError.message);

      // Fallback user from JWT payload
      const fallbackUser = createFallbackUser(payload);
      storeUserInCache(effectiveUserId, fallbackUser, 1 * 60 * 1000);

      return prepareResponse(req, activeToken, fallbackUser);
    }

    return redirectToLogin(req);
  } catch (error) {
    console.error("Authentication error:", error.message);
    return redirectToLogin(req);
  }
}

function isUserAllowed(activeRole, path) {
  if (!activeRole) return false;

  if (path === "/dashboard") {
    // Librarian has their own dashboard at /library-dashboard
    if (activeRole === "Librarian") return false;
    return true; // Any other authenticated role can see the dashboard
  }

  let allowedRoles = exactPagesMap.get(path);
  if (!allowedRoles) {
    const matchedPage = patternPages.find((p) => p.pattern.test(path));
    if (matchedPage) {
      allowedRoles = matchedPage.allowedRoles;
    }
  }

  if (!allowedRoles) return false;

  // Check if user has the required role
  return allowedRoles.includes(activeRole);
}

function createFallbackUser(payload) {
  // Create minimal user object from JWT token payload
  return {
    _id: payload.userId,
    roles: payload.roles || ["User"], // Use fallback role if not in token
    name: payload.name || "User",
    // Add other critical fields that your app needs
  };
}

function getUserFromCache(userId) {
  const cached = userCache.get(userId);
  if (!cached) return null;

  const { timestamp, ttl } = cached;
  const now = Date.now();

  if (now - timestamp > ttl) {
    userCache.delete(userId);
    return null;
  }

  // Move to the end of Map to maintain LRU order
  userCache.delete(userId);
  userCache.set(userId, cached);

  return cached;
}

function storeUserInCache(userId, user, customTtl = CACHE_TTL) {
  // Enforce size limit (LRU eviction)
  if (userCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = userCache.keys().next().value;
    if (oldestKey) {
      userCache.delete(oldestKey);
    }
  }

  userCache.set(userId, {
    user,
    timestamp: Date.now(),
    ttl: customTtl,
  });
}

async function fetchUserProfile(userId, apiKey, origin) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Extend to 5 seconds

    // Use origin passed from handleAuthRequest
    const response = await fetch(`${origin}/api/users/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({ userId }),
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      throw new Error("Empty response from API");
    }

    // Parse JSON safely
    const data = JSON.parse(text);
    return data.user;
  } catch (error) {
    throw error;
  }
}

function prepareResponse(req, token, user) {
  const res = NextResponse.next();

  if (
    req.cookies.has("active-role") &&
    !isUserAllowed(req.cookies.get("active-role")?.value, req.nextUrl.pathname)
  ) {
    return redirectTo404(req);
  }

  // Validate user object before JSON.stringify to prevent errors
  const safeUser = {
    ...user,
    userId: user?._id,
  };

  // Set headers safely with try/catch
  try {
    res.headers.set("x-user", JSON.stringify(safeUser));
    res.headers.set("x-auth-token", token);
  } catch (error) {
    console.error("Error setting headers:", error.message);
  }

  // Set cookie if not present
  // Get current activeRole from cookie or default to first valid role
  let activeRole = req.cookies.get("active-role")?.value;

  // If the current cookie value is not one of the user's roles, reset it
  if (!activeRole || !user.roles.includes(activeRole)) {
    activeRole = user.roles.includes("Teacher") ? "Teacher" : user.roles[0];

    res.cookies.set("active-role", activeRole, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // Now validate access
  if (!isUserAllowed(activeRole, req.nextUrl.pathname)) {

    if (activeRole === "Librarian" && req.nextUrl.pathname === "/dashboard") {
      return NextResponse.redirect(
        new URL("/library-dashboard", req.url)
      );
    }
    if (activeRole === "Gate Keeper" && req.nextUrl.pathname === "/dashboard") {
      return NextResponse.redirect(
        new URL("/dashboard/gate-pass", req.url)
      );
    }
    return redirectTo404(req);
  }

  return res;
}

function redirectToLogin(req) {
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function redirectTo404(req) {
  const notFoundUrl = new URL("/404", req.url);
  return NextResponse.redirect(notFoundUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/library-dashboard/:path*", "/library-dashboard", "/api/:path*", "/", "/login"],
};
