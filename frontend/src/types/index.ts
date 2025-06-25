// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ENGINEER' | 'MANAGER' | 'ADMIN' | 'HR';
  department?: string;
  competencyTier?: string;
  competencyScores?: Record<string, number>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Vendor types
export interface Vendor {
  id: string;
  name: string;
  description?: string;
  websiteUrl?: string;
  logoUrl?: string;
  isActive: boolean;
}

// Certification types
export interface Certification {
  id: string;
  vendorId: string;
  name: string;
  code: string;
  level: 'FOUNDATION' | 'ASSOCIATE' | 'PROFESSIONAL' | 'EXPERT' | 'SPECIALTY';
  description?: string;
  pointsValue: number;
  isBonusEligible: boolean;
  bonusAmount?: number;
  validityMonths: number;
  prerequisites?: any;
  tierContribution?: string;
  difficultyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  isActive: boolean;
  vendor?: Vendor;
}

// User Certification types
export interface UserCertification {
  id: string;
  userId: string;
  certificationId: string;
  obtainedDate: string;
  expirationDate: string;
  certificateNumber?: string;
  verificationUrl?: string;
  certificateFileUrl?: string;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'INACTIVE' | 'REJECTED' | 'ADMIN_ASSIGNED';
  bonusClaimed: boolean;
  bonusPaidDate?: string;
  notes?: any;
  certification: Certification;
  user?: User;
  assignmentDetails?: {
    assignedBy: string;
    assignedByName: string;
    assignedDate: string;
    deadline?: string;
    bonusEligible: boolean;
    bonusAmount: number;
    adminNotes: string;
  };
}

// Search types
export interface SearchFilters {
  searchTerm?: string;
  vendors?: string[];
  levels?: string[];
  statuses?: string[];
  expirationRange?: {
    from?: string;
    to?: string;
  };
  departments?: string[];
  competencyTiers?: string[];
  bonusEligible?: boolean;
}

export interface SearchResults {
  users?: User[];
  certifications?: Certification[];
  vendors?: Vendor[];
}

// Alert Configuration types
export interface AlertConfiguration {
  id: string;
  userId: string;
  notificationChannels: Record<string, boolean>;
  alertTiming: Record<string, number>;
  emailEnabled: boolean;
  teamsEnabled: boolean;
  teamsWebhook?: string;
  daysBeforeExpiration: number;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    status: number;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Dashboard Stats
export interface DashboardStats {
  totalCertifications: number;
  activeCertifications: number;
  expiringCertifications: number;
  totalPoints: number;
  bonusEligible: number;
}

// Competency Tier
export interface CompetencyTier {
  id: string;
  tierName: string;
  tierColor: string;
  minPointsRequired: number;
  requiredCertTypes: any;
  badgeIcon?: string;
  description?: string;
}

// Certification Path
export interface CertificationPath {
  id: string;
  pathName: string;
  targetRole: string;
  description?: string;
  treeStructure: any;
  prerequisitesMap: any;
  estimatedMonths: number;
  isActive: boolean;
}

// Form types for React Hook Form
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  department?: string;
}

export interface CertificationFormData {
  certificationId: string;
  obtainedDate: string;
  certificateNumber?: string;
  verificationUrl?: string;
  notes?: string;
  certificateFile?: File;
}

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  department?: string;
}

// Navigation and UI types
export interface NavItem {
  title: string;
  path: string;
  icon: string;
  roles?: string[];
  children?: NavItem[];
}

export interface TableColumn {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  format?: (value: any) => string;
}

// Certification Master types for Admin Management
export interface CertificationMaster {
  id: string;
  fullName: string;
  shortName: string;
  version: string;
  vendor: string;
  dateIntroduced: string;
  dateExpired?: string;
  level?: 'ENTRY' | 'ASSOCIATE' | 'PROFESSIONAL' | 'EXPERT';
  pointsValue?: number;
  validityMonths?: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CertificationMasterFormData {
  fullName: string;
  shortName: string;
  version: string;
  vendor: string;
  dateIntroduced: string;
  dateExpired?: string;
  level?: 'ENTRY' | 'ASSOCIATE' | 'PROFESSIONAL' | 'EXPERT';
  pointsValue?: number;
  validityMonths?: number;
  description?: string;
  isActive: boolean;
}

// Enhanced Master Data Types for Phase 3
export interface MasterCertification {
  id: string;
  fullName: string;
  shortName: string;
  version: string;
  vendor: {
    id: string;
    name: string;
    logoUrl?: string;
    description?: string;
  };
  level: 'FOUNDATION' | 'ASSOCIATE' | 'PROFESSIONAL' | 'EXPERT' | 'SPECIALTY';
  pointsValue: number;
  validityMonths: number;
  description?: string;
  prerequisites?: string[];
  difficultyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  isBonusEligible: boolean;
  bonusAmount?: number;
  tierContribution?: Record<string, number>;
  examDetails?: {
    duration?: number;
    passingScore?: number;
    numberOfQuestions?: number;
    examCost?: number;
  };
  isActive: boolean;
  dateIntroduced: string;
  dateExpired?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MasterCatalogFilters {
  vendor?: string;
  level?: string;
  search?: string;
  tags?: string[];
  minPoints?: number;
  maxPoints?: number;
  bonusEligible?: boolean;
  isActive?: boolean;
}

export interface CertificationAssignmentRequest {
  userId: string;
  certificationId: string;
  assignedBy: string;
  deadline?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  bonusEligible?: boolean;
  customBonusAmount?: number;
  adminNotes?: string;
  requiredDocuments?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
  duplicateDetected?: boolean;
  existingCertifications?: UserCertification[];
}

export interface EnhancedUserCertification extends UserCertification {
  masterData?: MasterCertification;
  assignmentDetails?: {
    assignedBy: string;
    assignedByName: string;
    assignedDate: string;
    deadline?: string;
    priority?: string;
    bonusEligible: boolean;
    bonusAmount?: number;
    adminNotes?: string;
    requiredDocuments?: string[];
  };
  validationStatus?: {
    isValidated: boolean;
    validatedBy?: string;
    validatedAt?: string;
    validationNotes?: string;
  };
}

// Enhanced competency calculation types
export interface CompetencyCalculation {
  totalPoints: number;
  categoryBreakdown: Record<string, number>;
  tierEligibility: {
    currentTier: string;
    nextTier?: string;
    pointsToNext?: number;
    requirements: Record<string, any>;
  };
  bonusEligibleAmount: number;
  recentAchievements: UserCertification[];
  expiringCertifications: UserCertification[];
}