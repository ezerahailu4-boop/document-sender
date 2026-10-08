import { prisma } from "@/lib/prisma";

/**
 * Track an analytics event
 * @param eventType - Type of event (e.g., "document_registered", "route_opened")
 * @param documentId - Optional document ID
 * @param userId - Optional user ID
 * @param eventData - Optional additional data as object
 */
export async function trackAnalyticsEvent(
  eventType: string,
  documentId: string | null = null,
  userId: string | null = null,
  eventData: Record<string, any> | null = null
) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        documentId,
        userId,
        eventType,
        eventData: eventData ? JSON.stringify(eventData) : null
      }
    });
  } catch (error) {
    // Silently fail - analytics should never disrupt user experience
    console.warn("Failed to track analytics event:", error);
  }
}

/**
 * Track document registration
 */
export async function trackDocumentRegistration(documentId: string, userId: string) {
  await trackAnalyticsEvent("document_registered", documentId, userId);
}

/**
 * Track route opened
 */
export async function trackRouteOpened(routeId: string, userId: string) {
  await trackAnalyticsEvent("route_opened", null, userId, { routeId });
}

/**
 * Track route completed
 */
export async function trackRouteCompleted(routeId: string, userId: string, note: string | null) {
  await trackAnalyticsEvent("route_completed", null, userId, { routeId, note });
}

/**
 * Track document forwarded
 */
export async function trackDocumentForwarded(documentId: string, userId: string, fromLabel: string, toLabel: string) {
  await trackAnalyticsEvent("document_forwarded", documentId, userId, { fromLabel, toLabel });
}

/**
 * Track document returned
 */
export async function trackDocumentReturned(documentId: string, userId: string, fromLabel: string, toLabel: string, reason: string) {
  await trackAnalyticsEvent("document_returned", documentId, userId, { fromLabel, toLabel, reason });
}

/**
 * Track comment added
 */
export async function trackCommentAdded(documentId: string, userId: string, routeId: string | null) {
  await trackAnalyticsEvent("comment_added", documentId, userId, { routeId });
}