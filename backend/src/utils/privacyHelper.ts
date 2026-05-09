// Privacy helper utilities
import { Request } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from './logger';

export interface PrivacySettings {
  analyticsEnabled: boolean;
  dataSharingEnabled: boolean;
  locationServicesEnabled: boolean;
}

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  analyticsEnabled: true,
  dataSharingEnabled: true,
  locationServicesEnabled: false,
};

/**
 * Get privacy settings from request headers or query params
 * Frontend passes privacy settings in headers or query params
 */
function getPrivacySettingsFromRequest(req: Request): PrivacySettings {
  // Check for privacy settings in headers (preferred)
  const dataSharingEnabled = req.headers['x-data-sharing-enabled'];
  const analyticsEnabled = req.headers['x-analytics-enabled'];
  const locationServicesEnabled = req.headers['x-location-services-enabled'];
  
  // Also check query params as fallback
  const queryDataSharing = req.query.dataSharingEnabled;
  const queryAnalytics = req.query.analyticsEnabled;
  const queryLocation = req.query.locationServicesEnabled;
  
  return {
    analyticsEnabled: analyticsEnabled !== undefined 
      ? analyticsEnabled === 'true' || analyticsEnabled === '1'
      : queryAnalytics !== undefined
        ? queryAnalytics === 'true' || queryAnalytics === '1'
        : DEFAULT_PRIVACY_SETTINGS.analyticsEnabled,
    dataSharingEnabled: dataSharingEnabled !== undefined
      ? dataSharingEnabled === 'true' || dataSharingEnabled === '1'
      : queryDataSharing !== undefined
        ? queryDataSharing === 'true' || queryDataSharing === '1'
        : DEFAULT_PRIVACY_SETTINGS.dataSharingEnabled,
    locationServicesEnabled: locationServicesEnabled !== undefined
      ? locationServicesEnabled === 'true' || locationServicesEnabled === '1'
      : queryLocation !== undefined
        ? queryLocation === 'true' || queryLocation === '1'
        : DEFAULT_PRIVACY_SETTINGS.locationServicesEnabled,
  };
}

/**
 * Check if data sharing is enabled for recommendations from request
 */
export function isDataSharingEnabledFromRequest(req: Request): boolean {
  const settings = getPrivacySettingsFromRequest(req);
  return settings.dataSharingEnabled;
}

/**
 * Check if location services are enabled from request
 */
export function isLocationServicesEnabledFromRequest(req: Request): boolean {
  const settings = getPrivacySettingsFromRequest(req);
  return settings.locationServicesEnabled;
}

