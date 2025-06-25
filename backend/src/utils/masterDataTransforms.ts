// Master Data Integration and Transformation Layer
// Phase 2: Bridge between Certification Management master data and user certification system

/**
 * Master certification data structure from certification management system
 */
export interface MasterCertification {
  id: string;
  fullName: string;
  shortName: string;
  version: string;
  vendor: string;
  dateIntroduced: string;
  dateExpired: string | null;
  level: 'ENTRY' | 'ASSOCIATE' | 'PROFESSIONAL' | 'EXPERT';
  pointsValue: number;
  validityMonths: number;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * User-facing certification format (maintains backward compatibility)
 */
export interface UserFacingCertification {
  id: string;
  name: string;
  vendor: {
    name: string;
    logoUrl: string | null;
  };
  level: string;
  pointsValue: number;
  isBonusEligible: boolean;
  validityMonths: number;
  description: string;
}

/**
 * Enhanced user certification with master data integration
 */
export interface EnhancedUserCertification {
  id: string;
  userId: string;
  masterCertificationId: string; // Reference to master data
  certification: UserFacingCertification; // Transformed for display
  obtainedDate: string;
  expirationDate: string;
  certificateNumber?: string;
  verificationUrl?: string;
  certificateFileUrl?: string;
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'ADMIN_ASSIGNED' | 'EXPIRED' | 'REJECTED';
  bonusClaimed: boolean;
  bonusPaidDate?: string;
  notes?: string;
  assignedDate?: string;
  assignedBy?: string;
  deadline?: string;
  bonusEligible?: boolean;
  bonusAmount?: number;
  assignmentId?: string;
}

/**
 * Transform master certification data to user-facing format
 * Maintains backward compatibility with existing frontend components
 */
export function transformMasterToUserFacing(master: MasterCertification): UserFacingCertification {
  return {
    id: master.id,
    name: master.fullName,
    vendor: {
      name: master.vendor,
      logoUrl: null // TODO: Add vendor logo mapping
    },
    level: master.level,
    pointsValue: master.pointsValue,
    isBonusEligible: determineBonusEligibility(master),
    validityMonths: master.validityMonths,
    description: master.description
  };
}

/**
 * Business logic for bonus eligibility determination
 * Based on master certification metadata
 */
export function determineBonusEligibility(master: MasterCertification): boolean {
  // Business rules for bonus eligibility
  if (master.level === 'PROFESSIONAL' || master.level === 'EXPERT') {
    return true;
  }
  if (master.pointsValue >= 20) {
    return true;
  }
  // Specific vendor bonus programs
  if (master.vendor === 'AWS' && master.pointsValue >= 15) {
    return true;
  }
  if (master.vendor === 'Microsoft' && master.level === 'ASSOCIATE') {
    return true;
  }
  return false;
}

/**
 * Calculate competency tier based on user's certifications using master data points
 */
export function calculateCompetencyTier(userCertifications: EnhancedUserCertification[]): string {
  const activeCerts = userCertifications.filter(uc => uc.status === 'ACTIVE');
  const totalPoints = activeCerts.reduce((sum, uc) => sum + uc.certification.pointsValue, 0);
  
  // Enhanced tier calculation with more granular thresholds
  if (totalPoints >= 100) return 'Platinum';
  if (totalPoints >= 75) return 'Gold+';
  if (totalPoints >= 50) return 'Gold';
  if (totalPoints >= 35) return 'Silver+';
  if (totalPoints >= 25) return 'Silver';
  if (totalPoints >= 15) return 'Bronze+';
  if (totalPoints >= 10) return 'Bronze';
  return 'Entry';
}

/**
 * Calculate competency scores by vendor using master data
 */
export function calculateCompetencyScores(userCertifications: EnhancedUserCertification[]): Record<string, number> {
  const activeCerts = userCertifications.filter(uc => uc.status === 'ACTIVE');
  const scoresByVendor: Record<string, number> = {};
  
  activeCerts.forEach(uc => {
    const vendorName = uc.certification.vendor.name;
    if (!scoresByVendor[vendorName]) {
      scoresByVendor[vendorName] = 0;
    }
    scoresByVendor[vendorName] += uc.certification.pointsValue;
  });
  
  return scoresByVendor;
}

/**
 * Validate certification assignment against master catalog
 */
export function validateCertificationAssignment(
  masterCertificationId: string,
  userId: string,
  existingUserCertifications: EnhancedUserCertification[],
  masterCatalog: MasterCertification[]
): { isValid: boolean; error?: string; masterCert?: MasterCertification } {
  // Check if master certification exists and is active
  const masterCert = masterCatalog.find(mc => mc.id === masterCertificationId && mc.isActive);
  if (!masterCert) {
    return { isValid: false, error: 'Master certification not found or inactive' };
  }
  
  // FIXED: Allow ADMIN_ASSIGNED → PENDING_APPROVAL transitions
  // Only block ACTIVE and PENDING_APPROVAL certifications, allow ADMIN_ASSIGNED to be submitted
  const existingCert = existingUserCertifications.find(uc =>
    uc.masterCertificationId === masterCertificationId &&
    uc.userId === userId &&
    ['ACTIVE', 'PENDING_APPROVAL'].includes(uc.status) // REMOVED ADMIN_ASSIGNED from blocking list
  );
  
  if (existingCert) {
    return {
      isValid: false,
      error: 'User already has this certification (active or pending approval)'
    };
  }
  
  return { isValid: true, masterCert };
}

/**
 * Create enhanced user certification from master data
 */
export function createUserCertificationFromMaster(
  masterCert: MasterCertification,
  userId: string,
  assignmentData?: {
    assignedBy?: string;
    deadline?: string;
    bonusEligible?: boolean;
    bonusAmount?: number;
    adminNotes?: string;
  }
): Partial<EnhancedUserCertification> {
  const userFacingCert = transformMasterToUserFacing(masterCert);
  
  const baseCertification: Partial<EnhancedUserCertification> = {
    userId,
    masterCertificationId: masterCert.id,
    certification: userFacingCert,
    obtainedDate: '',
    expirationDate: '',
    status: 'ADMIN_ASSIGNED',
    bonusClaimed: false
  };
  
  // Add assignment-specific data if provided
  if (assignmentData) {
    return {
      ...baseCertification,
      assignedDate: new Date().toISOString().split('T')[0],
      assignedBy: assignmentData.assignedBy,
      deadline: assignmentData.deadline,
      bonusEligible: assignmentData.bonusEligible ?? userFacingCert.isBonusEligible,
      bonusAmount: assignmentData.bonusAmount || 0,
      notes: assignmentData.adminNotes,
      assignmentId: `assignment-${Date.now()}`
    };
  }
  
  return baseCertification;
}

/**
 * Calculate expiration date based on master data validity period
 */
export function calculateExpirationDate(obtainedDate: string, masterCert: MasterCertification): string {
  const obtained = new Date(obtainedDate);
  const expiration = new Date(obtained);
  expiration.setMonth(expiration.getMonth() + masterCert.validityMonths);
  return expiration.toISOString().split('T')[0];
}

/**
 * Get certification display name with version info
 */
export function getCertificationDisplayName(masterCert: MasterCertification): string {
  if (masterCert.version && masterCert.version !== masterCert.shortName) {
    return `${masterCert.fullName} (${masterCert.version})`;
  }
  return masterCert.fullName;
}

/**
 * Check if certification is approaching expiration for bonus eligibility
 */
export function checkBonusEligibilityWindow(
  userCert: EnhancedUserCertification,
  masterCert: MasterCertification
): boolean {
  if (!userCert.certification.isBonusEligible || userCert.bonusClaimed) {
    return false;
  }
  
  // Bonus must be claimed within validity period
  const expirationDate = new Date(userCert.expirationDate);
  const now = new Date();
  
  return now <= expirationDate;
}

/**
 * Integration utilities for backward compatibility
 */
export class MasterDataIntegration {
  private masterCatalog: MasterCertification[];
  
  constructor(masterCatalog: MasterCertification[]) {
    this.masterCatalog = masterCatalog;
  }
  
  /**
   * Find master certification by various identifiers for migration support
   */
  findMasterCertification(identifier: {
    id?: string;
    name?: string;
    vendor?: string;
    version?: string;
  }): MasterCertification | null {
    return this.masterCatalog.find(mc => {
      if (identifier.id && mc.id === identifier.id) return true;
      if (identifier.name && identifier.vendor) {
        return mc.fullName.toLowerCase().includes(identifier.name.toLowerCase()) &&
               mc.vendor.toLowerCase() === identifier.vendor.toLowerCase();
      }
      return false;
    }) || null;
  }
  
  /**
   * Get active master certifications for catalog display
   */
  getActiveCatalog(): MasterCertification[] {
    return this.masterCatalog.filter(mc => mc.isActive);
  }
  
  /**
   * Transform master catalog for legacy API compatibility
   */
  transformCatalogForLegacyAPI(): UserFacingCertification[] {
    return this.getActiveCatalog().map(transformMasterToUserFacing);
  }
}