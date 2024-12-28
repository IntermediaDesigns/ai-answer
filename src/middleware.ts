import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Client, Databases } from "appwrite";

// Initialize Appwrite
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "")
  .setProject(process.env.APPWRITE_PROJECT_ID || "");

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "";
const RATELIMIT_COLLECTION_ID =
  process.env.APPWRITE_RATELIMIT_COLLECTION_ID || "";

// Rate limit configuration
const WINDOW_SIZE = 10; // seconds
const MAX_REQUESTS = 10; // requests per window

export async function middleware(request: NextRequest) {
  try {
    // Get user IP for rate limiting
    const rawIp =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "127.0.0.1";

    // Create a valid document ID from IP by ensuring it starts with a letter and contains only valid chars
    const ip = "ip_" + rawIp.replace(/[^a-zA-Z0-9\-_.]/g, "_").slice(0, 32);

    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const windowStart = now - WINDOW_SIZE; // Start of current window

    let rateLimit;
    try {
      // Try to get existing rate limit document
      rateLimit = await databases.getDocument(
        DATABASE_ID,
        RATELIMIT_COLLECTION_ID,
        ip
      );

      // If document exists but window has expired, reset counts
      if (rateLimit.window_start < windowStart) {
        rateLimit = await databases.updateDocument(
          DATABASE_ID,
          RATELIMIT_COLLECTION_ID,
          ip,
          {
            window_start: now,
            window_requests: 1,
            requests: rateLimit.requests + 1,
          }
        );
      } else {
        // Update request count in current window
        rateLimit = await databases.updateDocument(
          DATABASE_ID,
          RATELIMIT_COLLECTION_ID,
          ip,
          {
            window_requests: rateLimit.window_requests + 1,
            requests: rateLimit.requests + 1,
          }
        );
      }
    } catch {
      // If document doesn't exist, create it
      rateLimit = await databases.createDocument(
        DATABASE_ID,
        RATELIMIT_COLLECTION_ID,
        ip,
        {
          ip,
          window_start: now,
          window_requests: 1,
          requests: 1,
        }
      );
    }

    // Calculate rate limit values
    const remaining = Math.max(0, MAX_REQUESTS - rateLimit.window_requests);
    const reset = rateLimit.window_start + WINDOW_SIZE;

    // Set rate limit headers
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", MAX_REQUESTS.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", reset.toString());

    // If rate limit exceeded, return 429 Too Many Requests
    if (rateLimit.window_requests > MAX_REQUESTS) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": MAX_REQUESTS.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }

    return response;
  } catch (error) {
    console.error("Rate limiting error:", error);
    // On error, allow the request to proceed
    return NextResponse.next();
  }
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
