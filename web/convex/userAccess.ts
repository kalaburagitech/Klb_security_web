export const OWNER_PERMISSIONS = {
  users: true,
  sites: true,
  patrolPoints: true,
  patrolLogs: true,
  visitLogs: true,
  issues: true,
  analytics: true,
  attendance: true,
} as const;

export const NEW_USER_PERMISSIONS = {
  users: false,
  sites: false,
  patrolPoints: false,
  patrolLogs: false,
  visitLogs: false,
  issues: false,
  analytics: false,
  attendance: false,
} as const;

const ROLE_PRIORITY = [
  "Owner",
  "Deployment Manager",
  "Manager",
  "Visiting Officer",
  "SO",
  "Client",
  "NEW_USER",
] as const;

export type PermissionsPatch = {
  [K in keyof typeof OWNER_PERMISSIONS]?: boolean;
};

const ORG_ADMIN_ROLES = new Set<string>([
  "Owner",
  "Deployment Manager",
  "Manager",
]);

/** True if the user has any org-wide admin role (site list / admin flows). */
export function isOrgAdminRoles(roles: string[]): boolean {
  return roles.some((r) => ORG_ADMIN_ROLES.has(r));
}

/** Highest-privilege role wins (permissions + JWT `role` claim). */
export function pickPrimaryRoleForPermissions(roles: string[]): string {
  if (!roles.length) return "NEW_USER";
  let best = roles[0];
  let bestIdx: number = ROLE_PRIORITY.length;
  for (const r of roles) {
    const i = ROLE_PRIORITY.indexOf(r as (typeof ROLE_PRIORITY)[number]);
    if (i !== -1 && i < bestIdx) {
      bestIdx = i;
      best = r;
    }
  }
  return best;
}

export function normalizePermissionsForRole(
  role: string,
  permissions?: PermissionsPatch
) {
  if (role === "Owner") {
    return { ...OWNER_PERMISSIONS };
  }

  if (role === "NEW_USER") {
    return { ...NEW_USER_PERMISSIONS };
  }

  return {
    ...NEW_USER_PERMISSIONS,
    ...permissions,
  };
}

export function normalizePermissionsForRoles(
  roles: string[],
  permissions?: PermissionsPatch
) {
  const primary = pickPrimaryRoleForPermissions(roles);
  return normalizePermissionsForRole(primary, permissions);
}
