// Turning a tapped notification into a route (KT-36). Pure so it can be tested with a fake response.
export const REMINDER_KIND_TAG = 'knowthem-reminder';

/** The minimal slice of expo-notifications' NotificationResponse that routing reads. */
export interface ResponseLike {
  actionIdentifier?: string;
  notification: { request: { identifier?: string; content: { data?: unknown } } };
}

/** The person a notification is about, or null for anything else. */
export function personIdFromResponse(response: ResponseLike | null | undefined): string | null {
  const data = response?.notification.request.content.data;
  if (!data || typeof data !== 'object') return null;
  const { personId } = data as { personId?: unknown };
  return typeof personId === 'string' && personId !== '' ? personId : null;
}

/** `/person/<id>` for a tap on a reminder, else null. */
export function routeForResponse(response: ResponseLike | null | undefined): string | null {
  const id = personIdFromResponse(response);
  return id ? `/person/${encodeURIComponent(id)}` : null;
}

/** Stable key so each tap is handled once even if the response is delivered twice. */
export function responseKey(response: ResponseLike): string {
  return `${response.notification.request.identifier ?? ''}:${response.actionIdentifier ?? ''}`;
}
