import "server-only";
import { prisma } from "./prisma";

export type NotificationType =
  | "PUBLISH_CONFIRMATION"
  | "COMMENT_ALERT"
  | "SEO_ALERT"
  | "ACCOUNT"
  | "DRAFT_REMINDER"
  | "SYSTEM"
  | "REVIEW";

export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string
) {
  try {
    await prisma.notification.create({ data: { userId, type, title, body, link } });
  } catch (err) {
    // Notifications are a nice-to-have — never let a failure here break
    // the calling operation (publishing a post, moderating a comment...).
    console.error("Failed to create notification:", err);
  }
}
