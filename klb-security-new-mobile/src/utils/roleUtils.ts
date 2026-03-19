/**
 * Roles that can monitor ALL sites in the organization.
 */
export const isAdministrativeRole = (role?: string): boolean => {
    const normalizedRole = (role || '').toLowerCase().trim();
    const adminRoles = [
        'officer',
        'admin',
        'manager',
        'deployment manager',
        'deploymentmanager',
        'owner',
        'higher officer',
        'higherofficer',
        'so',
        'security officer',
        'securityofficer'
    ];
    return adminRoles.includes(normalizedRole);
};

/**
 * Roles that can access the Monitoring Dashboard (OfficerDashboard).
 * Includes both full admins and supervisory roles (SO) who only see assigned sites.
 */
export const canAccessMonitoringDashboard = (role?: string): boolean => {
    const normalizedRole = (role || '').toLowerCase().trim();
    const monitoringRoles = [
        'so',
        'security officer'
    ];
    return isAdministrativeRole(role) || monitoringRoles.includes(normalizedRole);
};

/**
 * Roles that can search and select ANY site in their organization for visits.
 */
export const canSelectAllSitesForVisits = (role?: string): boolean => {
    const normalizedRole = (role || '').toLowerCase().trim();
    const visitAllowedRoles = [
        'so',
        'security officer',
        'sg',
        'security guard'
    ];
    return isAdministrativeRole(role) || visitAllowedRoles.includes(normalizedRole);
};
