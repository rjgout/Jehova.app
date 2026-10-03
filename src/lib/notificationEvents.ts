export const IN_APP_NOTIFICATION_EVENT = "versado:notification-received";

/** De minimale melding die de globale banner en het meldingencentrum delen. */
export interface InAppNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
}
