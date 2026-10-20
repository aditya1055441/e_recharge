import type { Pool } from "pg";
import type { AuthUser } from "./auth";

/**
 * Returns true if target user is the actor or a descendant of the actor.
 * ADMIN may access any user. API_MANAGER is not granted financial hierarchy access by default.
 */
export async function canAccessUser(db: Pool, actor: AuthUser, targetUserId: number): Promise<boolean> {
  if (actor.role === "ADMIN") return true;
  if (actor.id === targetUserId) return true;
  if (!["MASTER_DISTRIBUTOR", "DISTRIBUTOR"].includes(actor.role)) return false;

  const result = await db.query(
    `WITH RECURSIVE descendants AS (
       SELECT id FROM users WHERE parent_user_id = $1
       UNION ALL
       SELECT u.id FROM users u
       JOIN descendants d ON u.parent_user_id = d.id
     )
     SELECT 1 FROM descendants WHERE id = $2 LIMIT 1`,
    [actor.id, targetUserId]
  );
  return (result.rowCount ?? 0) > 0;
}
