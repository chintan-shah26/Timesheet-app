/**
 * logAction — insert an audit record inside an existing DB transaction.
 *
 * @param {import('pg').PoolClient} db  - pool client already inside BEGIN
 * @param {object} params
 * @param {number|null} params.actorId
 * @param {string}      params.actorName
 * @param {string}      params.action      - approve | reject | submit | recall |
 *                                           create_user | delete_user | change_role | reset_password
 * @param {string}      params.targetType  - 'timesheet' | 'user'
 * @param {number|null} params.targetId
 * @param {string|null} params.targetName
 * @param {object|null} params.metadata
 */
async function logAction(
  db,
  { actorId, actorName, action, targetType, targetId, targetName, metadata },
) {
  await db.query(
    `INSERT INTO audit_logs
       (actor_id, actor_name, action, target_type, target_id, target_name, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      actorId ?? null,
      actorName ?? null,
      action,
      targetType,
      targetId ?? null,
      targetName ?? null,
      metadata ? JSON.stringify(metadata) : null,
    ],
  );
}

module.exports = { logAction };
