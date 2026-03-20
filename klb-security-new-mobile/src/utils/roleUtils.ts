/**
 * Roles that can monitor ALL sites in the organization.
 */
export const isAdministrativeRole = (role?: string): boolean => {
    const rawRole = (role || '').toLowerCase().trim();
    
    // Explicit exclusions for staff roles
    if (rawRole.includes('security officer') || rawRole === 'so' || rawRole === 'sg' || rawRole === 'new_user') {
        return false;
    }

    // Keyword matching for monitoring/administrative roles
    return (
        rawRole.includes('owner') ||
        rawRole.includes('manager') ||
        rawRole.includes('officer') ||
        rawRole.includes('so')
    );
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
