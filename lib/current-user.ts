import "server-only";
import { getSession, Role, SessionArea, writerState, proofreaderState } from "./auth";
import { prisma } from "./prisma";

/**
 * The signed-in user, read fresh from the database. Use this in pages instead
 * of the role inside the session cookie: the cookie keeps whatever role the
 * user had when they signed in, so an approval or role change would otherwise
 * not show until they signed out and back in.
 *
 * `area` picks which sign-in to read: the CMS (default) or the proofreading desk.
 */
export async function getCurrentUser(area: SessionArea = "cms") {
  const session = await getSession(area);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      proofreaderStatus: true,
      emailVerified: true,
    },
  });
  if (!user) return null;
  return {
    ...user,
    role: user.role as Role,
    writer: writerState(user),
    proofreader: proofreaderState(user),
  };
}
