import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Avatar,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  EmojiEvents,
  AccessTime,
  People,
  AttachMoney,
  CheckCircle,
  Info,
  Close,
  WorkspacePremium,
  TrendingUp,
  Schedule,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '@/contexts/AuthContext';
import { safeFormatDate } from '@/utils/dateUtils';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  getBounties,
  claimBounty,
  getUserBountyClaims,
  calculateDaysRemaining,
  isDeadlinePassed,
  getBountyStatusColor,
  formatCurrency,
  type Bounty,
  type BountyClaim
} from '../../services/bountyApi';

const BountyBoard: React.FC = () => {
  const { user } = useAuth();
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch bounties from API
  const { data: bountiesData, isLoading, error } = useQuery(
    'bounties',
    getBounties,
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: false,
    }
  );

  // Fetch user's bounty claims
  const { data: userClaims } = useQuery(
    'user-bounty-claims',
    getUserBountyClaims,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );

  // Claim bounty mutation
  const claimBountyMutation = useMutation(claimBounty, {
    onSuccess: () => {
      // Refresh bounties and user claims
      queryClient.invalidateQueries('bounties');
      queryClient.invalidateQueries('user-bounty-claims');
      setClaimDialogOpen(false);
      setSelectedBounty(null);
    },
    onError: (error: any) => {
      console.error('Failed to claim bounty:', error);
      // You could show an error toast here
    }
  });

  const handleViewDetails = (bounty: Bounty) => {
    setSelectedBounty(bounty);
  };

  const handleClaimBounty = (bounty: Bounty) => {
    setSelectedBounty(bounty);
    setClaimDialogOpen(true);
  };

  const handleClaimConfirm = () => {
    if (selectedBounty) {
      claimBountyMutation.mutate(selectedBounty.id);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return '#d32f2f';
      case 'MEDIUM': return '#ed6c02';
      case 'LOW': return '#2e7d32';
      default: return '#1976d2';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#2e7d32';
      case 'EXPIRED': return '#d32f2f';
      case 'COMPLETED': return '#1976d2';
      default: return '#666';
    }
  };

  const calculateProgress = (current: number, max: number) => {
    return max > 0 ? (current / max) * 100 : 0;
  };

  // Check if user has already claimed a bounty
  const hasUserClaimedBounty = (bountyId: string) => {
    return userClaims?.claims?.some(claim => claim.bountyId === bountyId) || false;
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading bounty board..." />;
  }

  if (error) {
    return (
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Alert severity="error">
          Failed to load bounties. Please try again later.
        </Alert>
      </Box>
    );
  }

  const activeBounties = bountiesData?.bounties || [];

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <EmojiEvents sx={{ fontSize: 40, color: '#ffd700' }} />
          🎯 Certification Bounty Board
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Time-limited certification rewards and spiffs. Complete these certifications within the deadline to earn extra bonuses!
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>How it works:</strong> These are special time-limited bonuses on top of regular certification rewards. 
            Complete the required certifications within the deadline to claim your bounty!
          </Typography>
        </Alert>
      </Box>

      {/* Active Bounties Grid */}
      <Grid container spacing={3}>
        {activeBounties.map((bounty: Bounty) => {
          const daysRemaining = calculateDaysRemaining(bounty.deadline);
          const progress = calculateProgress(bounty.currentClaims, bounty.maxClaims);
          const isExpired = isDeadlinePassed(bounty.deadline);
          const isFullyClaimed = bounty.currentClaims >= bounty.maxClaims;
          const hasUserClaimed = hasUserClaimedBounty(bounty.id);
          
          return (
            <Grid item xs={12} lg={6} key={bounty.id}>
              <Card
                sx={{
                  height: '100%',
                  border: `2px solid ${getPriorityColor(bounty.priority)}`,
                  backgroundColor: isExpired || isFullyClaimed ? 'rgba(0,0,0,0.05)' : 'background.paper',
                  position: 'relative',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease'
                  }
                }}
              >
                {/* Priority Badge */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: 16,
                    zIndex: 1
                  }}
                >
                  <Chip
                    label={bounty.priority}
                    size="small"
                    sx={{
                      backgroundColor: getPriorityColor(bounty.priority),
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                </Box>

                <CardContent sx={{ pb: 2 }}>
                  {/* Header */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, pr: 6 }}>
                      {bounty.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {bounty.description}
                    </Typography>
                  </Box>

                  {/* Reward Information */}
                  <Box sx={{ mb: 3, p: 2, backgroundColor: 'rgba(255, 193, 7, 0.1)', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#f57c00' }}>
                        {formatCurrency(bounty.totalReward)}
                      </Typography>
                      <Chip
                        icon={<AttachMoney />}
                        label="Total Reward"
                        size="small"
                        sx={{ backgroundColor: '#f57c00', color: 'white' }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {formatCurrency(bounty.bountyAmount)} spiff + {formatCurrency(bounty.baseBonusAmount)} base bonus
                      {bounty.maxClaims > 1 && ` (per certification)`}
                    </Typography>
                  </Box>

                  {/* Certifications Required */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Required Certifications:
                    </Typography>
                    {bounty.certifications.map((cert: any, index: number) => (
                      <Box key={cert.id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <WorkspacePremium sx={{ color: '#1976d2', mr: 1, fontSize: 20 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {cert.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {cert.vendor} • {cert.level} • {cert.pointsValue} points
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  {/* Timeline and Claims */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTime sx={{ fontSize: 16, color: daysRemaining <= 7 ? '#d32f2f' : '#666' }} />
                        <Typography variant="body2" sx={{ color: daysRemaining <= 7 ? '#d32f2f' : 'text.primary' }}>
                          {isExpired ? 'EXPIRED' : `${daysRemaining} days left`}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <People sx={{ fontSize: 16 }} />
                        <Typography variant="body2">
                          {bounty.currentClaims}/{bounty.maxClaims} claimed
                        </Typography>
                      </Box>
                    </Box>
                    
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: isFullyClaimed ? '#d32f2f' : '#2e7d32'
                        }
                      }}
                    />
                    
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Deadline: {safeFormatDate(bounty.deadline, 'MMM dd, yyyy')}
                    </Typography>
                  </Box>

                  {/* Tags */}
                  <Box sx={{ mb: 3 }}>
                    {bounty.tags.map((tag: string) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Info />}
                      onClick={() => handleViewDetails(bounty)}
                    >
                      Details
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={hasUserClaimed ? <CheckCircle /> : <EmojiEvents />}
                      onClick={() => handleClaimBounty(bounty)}
                      disabled={isExpired || isFullyClaimed || hasUserClaimed || claimBountyMutation.isLoading}
                      sx={{
                        backgroundColor: hasUserClaimed ? '#2e7d32' : getPriorityColor(bounty.priority),
                        '&:hover': {
                          backgroundColor: hasUserClaimed ? '#2e7d32' : getPriorityColor(bounty.priority),
                          filter: 'brightness(0.9)'
                        }
                      }}
                    >
                      {claimBountyMutation.isLoading && selectedBounty?.id === bounty.id ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : hasUserClaimed ? (
                        'Claimed'
                      ) : isExpired ? (
                        'Expired'
                      ) : isFullyClaimed ? (
                        'Fully Claimed'
                      ) : (
                        'Claim Bounty'
                      )}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Details Dialog */}
      <Dialog
        open={!!selectedBounty && !claimDialogOpen}
        onClose={() => setSelectedBounty(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{selectedBounty?.title}</Typography>
          <IconButton onClick={() => setSelectedBounty(null)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedBounty && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedBounty.description}
              </Typography>
              
              <Typography variant="h6" sx={{ mb: 1 }}>Requirements:</Typography>
              <List dense>
                {selectedBounty.requirements.map((req: string, index: number) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircle sx={{ color: '#2e7d32', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText primary={req} />
                  </ListItem>
                ))}
              </List>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="body2" color="text.secondary">
                Created by {selectedBounty.createdBy} on {safeFormatDate(selectedBounty.createdDate)}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Claim Dialog */}
      <Dialog
        open={claimDialogOpen}
        onClose={() => setClaimDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Claim Bounty</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            You're about to claim this bounty. This will redirect you to the certifications page where you can 
            submit your certification for approval.
          </Alert>
          <Typography variant="body1">
            <strong>Bounty:</strong> {selectedBounty?.title}
          </Typography>
          <Typography variant="body1">
            <strong>Reward:</strong> ${selectedBounty?.totalReward?.toLocaleString()}
          </Typography>
          <Typography variant="body1">
            <strong>Deadline:</strong> {selectedBounty && safeFormatDate(selectedBounty.deadline)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setClaimDialogOpen(false)}
            disabled={claimBountyMutation.isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleClaimConfirm}
            disabled={claimBountyMutation.isLoading}
            startIcon={claimBountyMutation.isLoading ? <CircularProgress size={16} /> : undefined}
          >
            {claimBountyMutation.isLoading ? 'Claiming...' : 'Claim & Start Certification'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BountyBoard;