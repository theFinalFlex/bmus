import { api } from './api';

export interface BountyCertification {
  id: string;
  name: string;
  vendor: string;
  level: string;
  pointsValue: number;
  examUrl?: string;
}

export interface Bounty {
  id: string;
  title: string;
  description: string;
  certifications: BountyCertification[];
  bountyAmount: number;
  baseBonusAmount: number;
  totalReward: number;
  deadline: string;
  maxClaims: number;
  currentClaims: number;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  createdBy: string;
  createdDate: string;
  requirements: string[];
  tags: string[];
  claimedBy: string[];
}

export interface BountyClaim {
  id: string;
  bountyId: string;
  userId: string;
  claimedDate: string;
  status: 'CLAIMED' | 'SUBMITTED' | 'APPROVED' | 'PAID';
  certificationSubmissions: string[];
  bounty?: Bounty;
}

export interface BountyApiResponse {
  bounties: Bounty[];
}

export interface BountyClaimResponse {
  message: string;
  claim: BountyClaim;
  bounty: Bounty;
}

export interface UserBountyClaimsResponse {
  claims: BountyClaim[];
}

// Get all active bounties
export const getBounties = async (): Promise<BountyApiResponse> => {
  const response = await api.get('/bounties');
  return response.data;
};

// Claim a bounty
export const claimBounty = async (bountyId: string): Promise<BountyClaimResponse> => {
  const response = await api.post(`/bounties/${bountyId}/claim`);
  return response.data;
};

// Get user's bounty claims
export const getUserBountyClaims = async (): Promise<UserBountyClaimsResponse> => {
  const response = await api.get('/bounties/my-claims');
  return response.data;
};

// Admin: Create new bounty
export const createBounty = async (bountyData: Partial<Bounty>): Promise<{ message: string; bounty: Bounty }> => {
  const response = await api.post('/admin/bounties', bountyData);
  return response.data;
};

// Admin: Get all bounties (including inactive)
export const getAllBounties = async (): Promise<{ bounties: Bounty[]; claims: BountyClaim[] }> => {
  const response = await api.get('/admin/bounties');
  return response.data;
};

// Utility functions
export const calculateDaysRemaining = (deadline: string): number => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

export const isDeadlinePassed = (deadline: string): boolean => {
  return new Date() > new Date(deadline);
};

export const getBountyStatusColor = (priority: string): string => {
  switch (priority) {
    case 'HIGH':
      return 'error';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
      return 'info';
    default:
      return 'default';
  }
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};