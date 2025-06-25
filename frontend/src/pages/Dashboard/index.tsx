import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Avatar,
  Button,
  Alert,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  Schedule,
  Warning,
  EmojiEvents,
  WorkspacePremium,
  Notifications,
  Assignment,
  CheckCircleOutline,
  AccessTime,
  Refresh,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { userApi, certificationApi, certificationMasterApi, reportApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { competencyColors, statusColors } from '@/theme';
import { safeFormatDate, getAssignmentDateDisplay } from '@/utils/dateUtils';
import { CompetencyCalculation, EnhancedUserCertification } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const Dashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [highlightBonusEligible, setHighlightBonusEligible] = useState(false);

  // Debug logging for authentication state
  console.log('🏠 Dashboard: Render - user authenticated:', isAuthenticated, 'user ID:', user?.id);

  // Fetch user profile with stats - refresh every 5 minutes
  // Include user ID in query key to make it user-specific
  const { data: profileData, isLoading: profileLoading, refetch: refetchProfile } = useQuery(
    ['userProfile', user?.id],
    () => {
      console.log('🏠 Dashboard: Fetching user profile for user ID:', user?.id);
      return userApi.getProfile();
    },
    {
      enabled: !!user && !!user.id,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
      refetchOnMount: true, // Force refetch when component mounts
      refetchOnWindowFocus: false // Prevent excessive refetching
    }
  );

  // Fetch user certifications - refresh every 2 minutes for assignments
  // Include user ID in query key to make it user-specific
  const { data: certifications, isLoading: certsLoading, refetch: refetchCertifications } = useQuery(
    ['userCertifications', user?.id],
    () => {
      console.log('🏠 Dashboard: Fetching certifications for user ID:', user?.id);
      return certificationApi.getUserCertifications();
    },
    {
      enabled: !!user && !!user.id,
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
      refetchOnMount: true, // Force refetch when component mounts
      refetchOnWindowFocus: false // Prevent excessive refetching
    }
  );

  // Fetch expiring certifications
  // Include user ID in query key to make it user-specific
  const { data: expiringCerts, isLoading: expiringLoading } = useQuery(
    ['expiringCertifications', user?.id],
    () => {
      console.log('🏠 Dashboard: Fetching expiring certifications for user ID:', user?.id);
      return reportApi.getExpiringCertifications(30);
    },
    {
      enabled: !!user && !!user.id,
      refetchOnMount: true,
      refetchOnWindowFocus: false
    }
  );

  // Debug useEffect to track authentication state changes
  useEffect(() => {
    console.log('🏠 Dashboard: Authentication state changed');
    console.log('🏠 Dashboard: user:', user ? `${user.firstName} ${user.lastName} (ID: ${user.id})` : 'null');
    console.log('🏠 Dashboard: isAuthenticated:', isAuthenticated);
  }, [user, isAuthenticated]);

  // Debug useEffect to track certification data changes
  useEffect(() => {
    console.log('🏠 Dashboard: Certifications data changed');
    console.log('🏠 Dashboard: certifications:', certifications?.data?.certifications?.length || 0, 'items');
    if (certifications?.data?.certifications) {
      const assigned = certifications.data.certifications.filter((cert: any) => cert.status === 'ADMIN_ASSIGNED');
      console.log('🏠 Dashboard: ADMIN_ASSIGNED certifications:', assigned.length);
      assigned.forEach((cert: any, index: number) => {
        console.log(`🏠 Dashboard: Assigned cert ${index + 1}:`, cert.certification?.name, 'Status:', cert.status);
      });
    }
  }, [certifications]);

  // Manual refresh function
  const handleRefresh = () => {
    console.log('🏠 Dashboard: Manual refresh triggered');
    refetchProfile();
    refetchCertifications();
  };

  if (profileLoading || certsLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  const userStats = profileData?.data?.user?.stats;
  const userCertifications = certifications?.data?.certifications || [];
  const expiring = expiringCerts?.data?.expiringCertifications || [];

  // Filter assigned certifications
  const assignedCertifications = userCertifications.filter(cert => cert.status === 'ADMIN_ASSIGNED');
  
  // Quick stats cards
  const statsCards = [
    {
      title: 'Total Certifications',
      value: userStats?.totalCertifications || 0,
      icon: <WorkspacePremium />,
      color: 'primary',
    },
    {
      title: 'Active Certifications',
      value: userStats?.activeCertifications || 0,
      icon: <TrendingUp />,
      color: 'success',
    },
    {
      title: 'Assigned Tasks',
      value: assignedCertifications.length,
      icon: <Assignment />,
      color: 'info',
      urgent: assignedCertifications.length > 0,
    },
    {
      title: 'Expiring Soon',
      value: userStats?.expiringCertifications || 0,
      icon: <Warning />,
      color: 'warning',
    },
    {
      title: 'Bonus Eligible',
      value: userStats?.bonusEligible || 0,
      icon: <EmojiEvents />,
      color: 'secondary',
      onClick: () => setHighlightBonusEligible(!highlightBonusEligible),
    },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Welcome back, {user?.firstName}!
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={profileLoading || certsLoading}
          sx={{ ml: 2 }}
        >
          Refresh
        </Button>
      </Box>
      
      {/* User competency overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: user?.competencyTier 
                  ? competencyColors[user.competencyTier as keyof typeof competencyColors]
                  : 'grey.500',
                mr: 2,
                width: 56,
                height: 56,
              }}
            >
              <EmojiEvents />
            </Avatar>
            <Box>
              <Typography variant="h6">
                Current Tier: {user?.competencyTier || 'Junior'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Points: {userStats?.totalPoints || 0}
              </Typography>
              {userStats?.competencyBreakdown && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Active: {userStats.competencyBreakdown.activeCertifications || 0} •
                  Expiring: {userStats.competencyBreakdown.expiringCertifications || 0} •
                  Assigned: {assignedCertifications.length}
                </Typography>
              )}
            </Box>
          </Box>
          
          {/* Progress bar to next tier */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Progress to next tier
            </Typography>
            <LinearProgress
              variant="determinate"
              value={75} // Calculate based on actual progress
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              25 points to Architect tier
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                cursor: stat.onClick ? 'pointer' : 'default',
                '&:hover': stat.onClick ? { boxShadow: 6 } : {},
                border: stat.urgent ? '2px solid #ff5722' : 'none',
                backgroundColor: stat.urgent ? 'rgba(255, 87, 34, 0.05)' : 'background.paper',
                position: 'relative',
                overflow: 'visible'
              }}
              onClick={stat.onClick}
            >
              {stat.urgent && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: '#ff5722',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
                    !
                  </Typography>
                </Box>
              )}
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" sx={{ color: stat.urgent ? '#ff5722' : 'inherit' }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: stat.urgent ? '#ff5722' : `${stat.color}.main` }}>
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Assigned Certifications Section - Prominent Display */}
      {assignedCertifications.length > 0 && (
        <Card sx={{ mb: 3, border: '2px solid #ff5722', backgroundColor: 'rgba(255, 87, 34, 0.05)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Assignment sx={{ color: '#ff5722', mr: 2, fontSize: 32 }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h5" sx={{ color: '#ff5722', fontWeight: 'bold' }}>
                  🎯 Certifications Assigned by Admin
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  These certifications have been specifically assigned to you. Complete them to earn points and bonuses!
                </Typography>
              </Box>
              <Chip
                label={`${assignedCertifications.length} Pending`}
                sx={{
                  backgroundColor: '#ff5722',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.875rem'
                }}
              />
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              {assignedCertifications.map((cert: any) => (
                <Grid item xs={12} md={6} key={cert.id}>
                  <Card
                    sx={{
                      border: '1px solid #ffccbc',
                      backgroundColor: 'background.paper',
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s ease'
                      }
                    }}
                  >
                    <CardContent sx={{ pb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                        <WorkspacePremium sx={{ color: '#ff5722', mr: 2, mt: 0.5 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>
                            {cert.certification.name}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                            {cert.certification.vendor.name} • {cert.certification.level}
                          </Typography>
                          
                          {/* Assignment Information */}
                          {cert.assignmentDetails && (
                            <Box sx={{ mb: 2, p: 2, backgroundColor: 'rgba(255, 87, 34, 0.1)', borderRadius: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#ff5722', mb: 1 }}>
                                📋 Assignment Details
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                  <strong>Assigned by:</strong> {cert.assignmentDetails.assignedByName}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                  <strong>Assigned on:</strong> {cert.assignmentDetails.assignedDate ?
                                    safeFormatDate(cert.assignmentDetails.assignedDate) :
                                    'Recently assigned'}
                                </Typography>
                                {cert.assignmentDetails.deadline && (
                                  <Typography variant="body2" sx={{ color: '#d32f2f' }}>
                                    <strong>Deadline:</strong> {safeFormatDate(cert.assignmentDetails.deadline)}
                                  </Typography>
                                )}
                                {cert.assignmentDetails.bonusAmount && cert.assignmentDetails.bonusAmount > 0 && (
                                  <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                                    <strong>Bonus Amount:</strong> ${cert.assignmentDetails.bonusAmount}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          )}

                          {/* Certification Details */}
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                            <Chip
                              size="small"
                              icon={<EmojiEvents />}
                              label={`${cert.certification.pointsValue} Points`}
                              color="primary"
                              variant="outlined"
                            />
                            {(cert.assignmentDetails?.bonusEligible || cert.certification.isBonusEligible) && (
                              <Chip
                                size="small"
                                icon={<EmojiEvents />}
                                label={`$${cert.assignmentDetails?.bonusAmount || cert.certification.bonusAmount || 'TBD'} Bonus`}
                                sx={{
                                  backgroundColor: '#4caf50',
                                  color: 'white',
                                  '& .MuiChip-icon': { color: 'white' }
                                }}
                              />
                            )}
                            <Chip
                              size="small"
                              icon={<AccessTime />}
                              label={`${cert.certification.validityMonths} months validity`}
                              variant="outlined"
                            />
                          </Box>

                          {/* Admin Notes */}
                          {(cert.assignmentDetails?.adminNotes || cert.notes) && (
                            <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                              <Typography variant="body2">
                                <strong>Admin Note:</strong> {cert.assignmentDetails?.adminNotes ||
                                  (typeof cert.notes === 'string' ? cert.notes : (cert.notes as any)?.adminNote || 'Complete this certification as assigned.')}
                              </Typography>
                            </Alert>
                          )}

                          {/* Action Button */}
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<CheckCircleOutline />}
                            sx={{
                              backgroundColor: '#ff5722',
                              '&:hover': { backgroundColor: '#e64a19' },
                              fontWeight: 'bold'
                            }}
                            onClick={() => {
                              // Navigate to certifications page or specific cert
                              window.location.href = '/certifications';
                            }}
                          >
                            Start Certification
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
            {assignedCertifications.length > 2 && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  sx={{ color: '#ff5722', borderColor: '#ff5722' }}
                  onClick={() => window.location.href = '/certifications?filter=assigned'}
                >
                  View All Assigned Certifications ({assignedCertifications.length})
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Recent Certifications */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Certifications
              </Typography>
              <List>
                {userCertifications.slice(0, 5).map((cert: any) => {

                  const getSecondaryText = (cert: any) => {
                    const dateDisplay = getAssignmentDateDisplay(cert);
                    if (cert.status === 'ADMIN_ASSIGNED' && cert.assignmentDetails?.assignedByName) {
                      return `${cert.certification.vendor.name} • ${dateDisplay} by ${cert.assignmentDetails.assignedByName}`;
                    }
                    return `${cert.certification.vendor.name} • ${dateDisplay}`;
                  };

                  return (
                    <ListItem
                      key={cert.id}
                      sx={{
                        backgroundColor: highlightBonusEligible && cert.certification.isBonusEligible
                          ? 'rgba(255, 193, 7, 0.1)'
                          : cert.status === 'ADMIN_ASSIGNED'
                          ? 'rgba(255, 87, 34, 0.05)'
                          : 'transparent',
                        border: highlightBonusEligible && cert.certification.isBonusEligible
                          ? '2px solid #ffc107'
                          : cert.status === 'ADMIN_ASSIGNED'
                          ? '1px solid rgba(255, 87, 34, 0.3)'
                          : 'none',
                        borderRadius: (highlightBonusEligible && cert.certification.isBonusEligible) || cert.status === 'ADMIN_ASSIGNED' ? 1 : 0,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <ListItemIcon>
                        <WorkspacePremium
                          color={cert.status === 'ADMIN_ASSIGNED' ? 'error' : 'primary'}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={cert.certification.name}
                        secondary={getSecondaryText(cert)}
                        secondaryTypographyProps={{
                          sx: cert.status === 'ADMIN_ASSIGNED' ? { color: '#ff5722' } : {}
                        }}
                      />
                      <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column', alignItems: 'flex-end' }}>
                        <Chip
                          label={cert.status === 'ADMIN_ASSIGNED' ? 'ASSIGNED' : cert.status}
                          size="small"
                          sx={{
                            bgcolor: statusColors[cert.status as keyof typeof statusColors],
                            color: 'white',
                          }}
                        />
                        {cert.certification.isBonusEligible && (
                          <Chip
                            label="Bonus Eligible"
                            size="small"
                            color="secondary"
                            sx={{ color: 'white' }}
                          />
                        )}
                        {cert.status === 'ADMIN_ASSIGNED' && cert.assignmentDetails?.deadline && (
                          <Chip
                            label={`Due: ${safeFormatDate(cert.assignmentDetails.deadline, 'MMM dd')}`}
                            size="small"
                            sx={{
                              bgcolor: '#d32f2f',
                              color: 'white',
                              fontSize: '0.65rem'
                            }}
                          />
                        )}
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Expiring Certifications */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Expiring Soon
                </Typography>
                <IconButton size="small">
                  <Notifications />
                </IconButton>
              </Box>
              <List>
                {expiring.slice(0, 5).map((cert: any) => {
                  const getExpirationDisplay = (expirationDate: string) => {
                    if (!expirationDate || expirationDate === '') {
                      return 'Expiration date pending';
                    }
                    const formatted = safeFormatDate(expirationDate, 'MMM dd, yyyy', 'Invalid expiration date');
                    return formatted === 'Invalid expiration date' ? formatted : `Expires: ${formatted}`;
                  };

                  return (
                    <ListItem key={cert.id}>
                      <ListItemIcon>
                        <Schedule color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary={cert.certification.name}
                        secondary={getExpirationDisplay(cert.expirationDate)}
                      />
                    </ListItem>
                  );
                })}
                {expiring.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No certifications expiring soon"
                      secondary="Great job staying current!"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;