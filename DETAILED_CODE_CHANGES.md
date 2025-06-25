# CertTracker - Detailed Code Changes

This document provides the exact code changes made to each file for easy integration by team members.

## 📁 New Files Created

### 1. `frontend/src/pages/BountyBoard/index.tsx`
```tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Box,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  CheckCircle as CheckIcon,
  Schedule as PendingIcon,
  Cancel as RejectedIcon,
} from '@mui/icons-material';
import { getBounties, claimBounty, getUserBountyClaims } from '../../services/bountyApi';

interface Bounty {
  id: string;
  title: string;
  description: string;
  points: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  requirements: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface BountyClaim {
  id: string;
  bountyId: string;
  bountyTitle: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  claimedAt: string;
  points: number;
}

const BountyBoard: React.FC = () => {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [claims, setClaims] = useState<BountyClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [tabValue, setTabValue] = useState(0);
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bountiesData, claimsData] = await Promise.all([
        getBounties(),
        getUserBountyClaims()
      ]);
      setBounties(bountiesData);
      setClaims(claimsData);
    } catch (error) {
      console.error('Error loading bounty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimBounty = async (bountyId: string) => {
    try {
      setClaiming(true);
      await claimBounty(bountyId);
      await loadData(); // Refresh data
      setDialogOpen(false);
      setSelectedBounty(null);
    } catch (error) {
      console.error('Error claiming bounty:', error);
    } finally {
      setClaiming(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'success';
      case 'Intermediate': return 'warning';
      case 'Advanced': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckIcon color="success" />;
      case 'PENDING': return <PendingIcon color="warning" />;
      case 'REJECTED': return <RejectedIcon color="error" />;
      default: return null;
    }
  };

  const filteredBounties = bounties.filter(bounty => {
    const matchesSearch = bounty.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bounty.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || bounty.category === selectedCategory;
    const notClaimed = !claims.some(claim => claim.bountyId === bounty.id);
    return matchesSearch && matchesCategory && notClaimed && bounty.status === 'ACTIVE';
  });

  const categories = ['All', ...Array.from(new Set(bounties.map(b => b.category)))];

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <TrophyIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Bounty Board
        </Typography>
      </Box>

      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="Available Bounties" />
        <Tab label={`My Claims (${claims.length})`} />
      </Tabs>

      {tabValue === 0 && (
        <>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search bounties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {categories.map(category => (
                <Chip
                  key={category}
                  label={category}
                  onClick={() => setSelectedCategory(category)}
                  color={selectedCategory === category ? 'primary' : 'default'}
                  variant={selectedCategory === category ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>

          {filteredBounties.length === 0 ? (
            <Alert severity="info">
              No bounties available matching your criteria.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {filteredBounties.map((bounty) => (
                <Grid item xs={12} md={6} lg={4} key={bounty.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Chip
                          label={bounty.difficulty}
                          color={getDifficultyColor(bounty.difficulty) as any}
                          size="small"
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <StarIcon sx={{ color: 'gold', mr: 0.5 }} />
                          <Typography variant="body2" fontWeight="bold">
                            {bounty.points} pts
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="h6" component="h2" gutterBottom>
                        {bounty.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {bounty.description}
                      </Typography>
                      <Chip label={bounty.category} variant="outlined" size="small" />
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedBounty(bounty);
                          setDialogOpen(true);
                        }}
                        variant="contained"
                        fullWidth
                      >
                        View Details & Claim
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          {claims.map((claim) => (
            <Grid item xs={12} md={6} lg={4} key={claim.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    {getStatusIcon(claim.status)}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <StarIcon sx={{ color: 'gold', mr: 0.5 }} />
                      <Typography variant="body2" fontWeight="bold">
                        {claim.points} pts
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {claim.bountyTitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status: {claim.status}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Claimed: {new Date(claim.claimedAt).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedBounty && (
          <>
            <DialogTitle>{selectedBounty.title}</DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={selectedBounty.difficulty}
                  color={getDifficultyColor(selectedBounty.difficulty) as any}
                  sx={{ mr: 1 }}
                />
                <Chip label={selectedBounty.category} variant="outlined" />
              </Box>
              <Typography variant="body1" paragraph>
                {selectedBounty.description}
              </Typography>
              <Typography variant="h6" gutterBottom>
                Requirements:
              </Typography>
              <Typography variant="body2" paragraph>
                {selectedBounty.requirements}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <StarIcon sx={{ color: 'gold', mr: 0.5 }} />
                <Typography variant="h6">
                  {selectedBounty.points} Points
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => handleClaimBounty(selectedBounty.id)}
                variant="contained"
                disabled={claiming}
              >
                {claiming ? <CircularProgress size={20} /> : 'Claim Bounty'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default BountyBoard;
```

### 2. `frontend/src/services/bountyApi.ts`
```typescript
const API_BASE_URL = 'http://localhost:3001/api';

export interface Bounty {
  id: string;
  title: string;
  description: string;
  points: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  requirements: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface BountyClaim {
  id: string;
  bountyId: string;
  bountyTitle: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  claimedAt: string;
  points: number;
}

export interface AdminBounty extends Bounty {
  claimsCount: number;
  totalPointsAwarded: number;
}

export const getBounties = async (): Promise<Bounty[]> => {
  const response = await fetch(`${API_BASE_URL}/bounties`);
  if (!response.ok) {
    throw new Error('Failed to fetch bounties');
  }
  return response.json();
};

export const claimBounty = async (bountyId: string): Promise<{ success: boolean; claimId: string }> => {
  const response = await fetch(`${API_BASE_URL}/bounties/${bountyId}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to claim bounty');
  }
  return response.json();
};

export const getUserBountyClaims = async (): Promise<BountyClaim[]> => {
  const response = await fetch(`${API_BASE_URL}/user/bounty-claims`);
  if (!response.ok) {
    throw new Error('Failed to fetch user bounty claims');
  }
  return response.json();
};

// Admin functions
export const getAdminBounties = async (): Promise<AdminBounty[]> => {
  const response = await fetch(`${API_BASE_URL}/admin/bounties`);
  if (!response.ok) {
    throw new Error('Failed to fetch admin bounties');
  }
  return response.json();
};

export const createBounty = async (bounty: Omit<Bounty, 'id'>): Promise<Bounty> => {
  const response = await fetch(`${API_BASE_URL}/admin/bounties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bounty),
  });
  if (!response.ok) {
    throw new Error('Failed to create bounty');
  }
  return response.json();
};

export const updateBountyStatus = async (bountyId: string, status: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/bounties/${bountyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error('Failed to update bounty status');
  }
};
```

### 3. `frontend/src/pages/Admin/BountyManagement/index.tsx`
```tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  EmojiEvents as TrophyIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { getAdminBounties, createBounty, AdminBounty, Bounty } from '../../../services/bountyApi';

const BountyManagement: React.FC = () => {
  const [bounties, setBounties] = useState<AdminBounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBounty, setNewBounty] = useState<Omit<Bounty, 'id'>>({
    title: '',
    description: '',
    points: 0,
    difficulty: 'Beginner',
    category: '',
    requirements: '',
    status: 'ACTIVE',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadBounties();
  }, []);

  const loadBounties = async () => {
    try {
      setLoading(true);
      const data = await getAdminBounties();
      setBounties(data);
    } catch (error) {
      console.error('Error loading bounties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBounty = async () => {
    try {
      setCreating(true);
      await createBounty(newBounty);
      await loadBounties();
      setCreateDialogOpen(false);
      setNewBounty({
        title: '',
        description: '',
        points: 0,
        difficulty: 'Beginner',
        category: '',
        requirements: '',
        status: 'ACTIVE',
      });
    } catch (error) {
      console.error('Error creating bounty:', error);
    } finally {
      setCreating(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'success';
      case 'Intermediate': return 'warning';
      case 'Advanced': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'ACTIVE' ? 'success' : 'default';
  };

  const totalBounties = bounties.length;
  const activeBounties = bounties.filter(b => b.status === 'ACTIVE').length;
  const totalClaims = bounties.reduce((sum, b) => sum + b.claimsCount, 0);
  const totalPointsAwarded = bounties.reduce((sum, b) => sum + b.totalPointsAwarded, 0);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TrophyIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Bounty Management
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Bounty
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Bounties
              </Typography>
              <Typography variant="h4">
                {totalBounties}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Bounties
              </Typography>
              <Typography variant="h4">
                {activeBounties}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Claims
              </Typography>
              <Typography variant="h4">
                {totalClaims}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Points Awarded
              </Typography>
              <Typography variant="h4">
                {totalPointsAwarded}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bounties Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            All Bounties
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Difficulty</TableCell>
                  <TableCell>Points</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Claims</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bounties.map((bounty) => (
                  <TableRow key={bounty.id}>
                    <TableCell>{bounty.title}</TableCell>
                    <TableCell>{bounty.category}</TableCell>
                    <TableCell>
                      <Chip
                        label={bounty.difficulty}
                        color={getDifficultyColor(bounty.difficulty) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{bounty.points}</TableCell>
                    <TableCell>
                      <Chip
                        label={bounty.status}
                        color={getStatusColor(bounty.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{bounty.claimsCount}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => {/* View details */}}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Bounty Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Bounty</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={newBounty.title}
                  onChange={(e) => setNewBounty({ ...newBounty, title: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={newBounty.description}
                  onChange={(e) => setNewBounty({ ...newBounty, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Points"
                  type="number"
                  value={newBounty.points}
                  onChange={(e) => setNewBounty({ ...newBounty, points: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Difficulty</InputLabel>
                  <Select
                    value={newBounty.difficulty}
                    label="Difficulty"
                    onChange={(e) => setNewBounty({ ...newBounty, difficulty: e.target.value as any })}
                  >
                    <MenuItem value="Beginner">Beginner</MenuItem>
                    <MenuItem value="Intermediate">Intermediate</MenuItem>
                    <MenuItem value="Advanced">Advanced</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Category"
                  value={newBounty.category}
                  onChange={(e) => setNewBounty({ ...newBounty, category: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Requirements"
                  multiline
                  rows={3}
                  value={newBounty.requirements}
                  onChange={(e) => setNewBounty({ ...newBounty, requirements: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateBounty}
            variant="contained"
            disabled={creating || !newBounty.title || !newBounty.description}
          >
            {creating ? <CircularProgress size={20} /> : 'Create Bounty'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BountyManagement;
```

### 4. `backend/src/services/emailService.ts`
```typescript
import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid';
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  sendgrid?: {
    apiKey: string;
  };
  from: {
    email: string;
    name: string;
  };
}

export interface CertificationReminderData {
  userName: string;
  userEmail: string;
  certificationName: string;
  vendor: string;
  expirationDate: string;
  daysUntilExpiration: number;
  renewalUrl?: string;
  urgencyLevel: 'planning' | 'preparation' | 'action' | 'urgent' | 'critical' | 'expired';
}

export class EmailService {
  private config: EmailConfig;
  private transporter?: nodemailer.Transporter;

  constructor(config: EmailConfig) {
    this.config = config;
    this.initialize();
  }

  private initialize() {
    if (this.config.provider === 'smtp' && this.config.smtp) {
      this.transporter = nodemailer.createTransporter({
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        secure: this.config.smtp.secure,
        auth: this.config.smtp.auth,
      });
    } else if (this.config.provider === 'sendgrid' && this.config.sendgrid) {
      sgMail.setApiKey(this.config.sendgrid.apiKey);
    }
  }

  private getVendorRenewalUrl(vendor: string): string {
    const vendorUrls: Record<string, string> = {
      'AWS': 'https://aws.amazon.com/certification/recertification/',
      'Microsoft': 'https://docs.microsoft.com/en-us/learn/certifications/renew-your-microsoft-certification',
      'Google': 'https://cloud.google.com/certification/recertification',
      'CompTIA': 'https://www.comptia.org/continuing-education',
      'Cisco': 'https://www.cisco.com/c/en/us/training-events/training-certifications/recertification-policy.html',
      'VMware': 'https://www.vmware.com/education-services/certification/vcp-recertification.html',
      'Oracle': 'https://education.oracle.com/oracle-certification-program/recertification',
      'Salesforce': 'https://trailhead.salesforce.com/credentials/administratoroverview',
      'Red Hat': 'https://www.redhat.com/en/services/certification/recertification',
      'ISACA': 'https://www.isaca.org/credentialing/how-to-maintain-your-certification',
    };
    return vendorUrls[vendor] || 'https://www.google.com/search?q=' + encodeURIComponent(vendor + ' certification renewal');
  }

  private getUrgencyConfig(urgencyLevel: string) {
    const configs = {
      planning: {
        subject: '📅 Certification Renewal Planning',
        color: '#2196F3',
        icon: '📅',
        priority: 'Low',
        actionText: 'Start Planning'
      },
      preparation: {
        subject: '📚 Time to Prepare for Certification Renewal',
        color: '#FF9800',
        icon: '📚',
        priority: 'Medium',
        actionText: 'Begin Preparation'
      },
      action: {
        subject: '⚡ Action Required: Certification Renewal',
        color: '#FF5722',
        icon: '⚡',
        priority: 'High',
        actionText: 'Take Action Now'
      },
      urgent: {
        subject: '🚨 URGENT: Certification Expires Soon',
        color: '#F44336',
        icon: '🚨',
        priority: 'Urgent',
        actionText: 'Renew Immediately'
      },
      critical: {
        subject: '🔥 CRITICAL: Certification Expires This Week',
        color: '#D32F2F',
        icon: '🔥',
        priority: 'Critical',
        actionText: 'Emergency Renewal'
      },
      expired: {
        subject: '❌ Certification Has Expired',
        color: '#424242',
        icon: '❌',
        priority: 'Expired',
        actionText: 'Recertify Now'
      }
    };
    return configs[urgencyLevel as keyof typeof configs] || configs.planning;
  }

  private generateEmailTemplate(data: CertificationReminderData): { subject: string; html: string } {
    const urgencyConfig = this.getUrgencyConfig(data.urgencyLevel);
    const renewalUrl = data.renewalUrl || this.getVendorRenewalUrl(data.vendor);
    
    const subject = `${urgencyConfig.subject} - ${data.certificationName}`;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header {