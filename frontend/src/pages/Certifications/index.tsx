import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Avatar,
  Fab,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  GetApp as DownloadIcon,
  EmojiEvents,
  Assignment as AssignmentIcon,
  CheckCircle as ActiveIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { certificationApi } from '@/services/api';
import { statusColors, competencyColors } from '@/theme';
import { safeFormatDate } from '@/utils/dateUtils';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

const Certifications: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: '',
    vendor: '',
    level: '',
  });
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showRefreshNotification, setShowRefreshNotification] = useState(false);

  const {
    data: certifications,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery(
    ['userCertifications', user?.id, filters],
    () => certificationApi.getUserCertifications(filters),
    {
      refetchOnWindowFocus: true, // Enable automatic refresh when user returns to page
      refetchOnMount: 'always', // Always fetch fresh data when component mounts
      retry: 3,
      retryDelay: 1000,
      staleTime: 0, // Data is considered stale immediately
      cacheTime: 1000 * 60 * 5, // Cache for 5 minutes
      refetchInterval: 1000 * 60 * 2, // Auto-refresh every 2 minutes
      refetchIntervalInBackground: false, // Don't refresh when tab is not active
      onSuccess: (data) => {
        setLastRefresh(new Date());
        if (refreshing) {
          setRefreshing(false);
          setShowRefreshNotification(true);
        }
      },
      onError: () => {
        if (refreshing) {
          setRefreshing(false);
        }
      },
    }
  );

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries(['userCertifications']);
      await refetch();
    } catch (error) {
      console.error('Failed to refresh certifications:', error);
      setRefreshing(false);
    }
  }, [queryClient, refetch]);

  // Listen for storage events to detect when admin actions occur in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'certifications_updated') {
        console.log('Detected certification update from admin action, refreshing...');
        handleManualRefresh();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [handleManualRefresh]);

  // Detect when user comes back to the page (tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, refreshing certifications...');
        handleManualRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleManualRefresh]);

  if (isLoading) {
    return <LoadingSpinner message="Loading your certifications..." />;
  }

  if (error) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            My Certifications
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleManualRefresh}
            disabled={refreshing}
          >
            Retry
          </Button>
        </Box>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={handleManualRefresh}>
              Retry
            </Button>
          }
          sx={{ mb: 3 }}
        >
          Failed to load certifications. This might be due to network connectivity or server issues.
          Your certifications are automatically refreshed every 2 minutes, or you can manually refresh using the button above.
        </Alert>
      </Box>
    );
  }

  const userCertifications = (certifications?.data as any)?.certifications || [];
  
  // Include all relevant certification statuses, including admin-assigned ones
  const displayCertifications = userCertifications.filter((cert: any) =>
    ['ACTIVE', 'PENDING_APPROVAL', 'EXPIRING_SOON', 'EXPIRED', 'REJECTED', 'ADMIN_ASSIGNED'].includes(cert.status)
  );

  const getStatusColor = (status: string) => {
    const colors = {
      PENDING_APPROVAL: '#ff9800',
      REJECTED: '#d32f2f',
      ...statusColors
    };
    return colors[status as keyof typeof colors] || statusColors[status as keyof typeof statusColors] || '#ccc';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL': return '⏳';
      case 'ACTIVE': return '✅';
      case 'EXPIRING_SOON': return '⚠️';
      case 'EXPIRED': return '❌';
      case 'REJECTED': return '🚫';
      default: return '📋';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL': return 'Pending Approval';
      case 'ACTIVE': return 'Active';
      case 'EXPIRING_SOON': return 'Expiring Soon';
      case 'EXPIRED': return 'Expired';
      case 'REJECTED': return 'Rejected';
      case 'ADMIN_ASSIGNED': return 'Admin Assigned';
      default: return status.replace('_', ' ');
    }
  };

  const getStatusChipProps = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          icon: <ActiveIcon sx={{ fontSize: '16px !important' }} />,
          color: 'success' as const,
          variant: 'filled' as const,
        };
      case 'PENDING_APPROVAL':
        return {
          icon: <WarningIcon sx={{ fontSize: '16px !important' }} />,
          color: 'warning' as const,
          variant: 'filled' as const,
        };
      case 'EXPIRING_SOON':
        return {
          icon: <WarningIcon sx={{ fontSize: '16px !important' }} />,
          color: 'warning' as const,
          variant: 'outlined' as const,
        };
      case 'EXPIRED':
        return {
          icon: <ErrorIcon sx={{ fontSize: '16px !important' }} />,
          color: 'error' as const,
          variant: 'filled' as const,
        };
      case 'REJECTED':
        return {
          icon: <ErrorIcon sx={{ fontSize: '16px !important' }} />,
          color: 'error' as const,
          variant: 'outlined' as const,
        };
      case 'ADMIN_ASSIGNED':
        return {
          icon: <AssignmentIcon sx={{ fontSize: '16px !important' }} />,
          color: 'info' as const,
          variant: 'filled' as const,
        };
      default:
        return {
          color: 'default' as const,
          variant: 'outlined' as const,
        };
    }
  };

  const getDaysUntilExpiration = (expirationDate: string) => {
    if (!expirationDate) return 0;
    const today = new Date();
    const expiry = new Date(expirationDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">
            My Certifications
          </Typography>
          {lastRefresh && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Last updated: {safeFormatDate(lastRefresh.toISOString(), 'MMM dd, yyyy HH:mm:ss')}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleManualRefresh}
            disabled={refreshing || isLoading}
            size="small"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/certifications/add')}
          >
            Add Certification
          </Button>
        </Box>
      </Box>

      {/* Auto-refresh indicator */}
      {(isLoading || refreshing) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {refreshing ? 'Refreshing your certifications...' : 'Loading certifications...'}
          </Typography>
        </Alert>
      )}

      {displayCertifications.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <EmojiEvents sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No certifications yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Start tracking your professional certifications to unlock career opportunities
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/certifications/add')}
            >
              Add Your First Certification
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={4}>
          {displayCertifications.map((cert: any) => {
            const daysUntilExpiry = getDaysUntilExpiration(cert.expirationDate);
            const statusChipProps = getStatusChipProps(cert.status);
            const isAssigned = cert.status === 'ADMIN_ASSIGNED';
            
            return (
              <Grid item xs={12} sm={6} lg={4} key={cert.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: isAssigned ? '2px solid' : '1px solid',
                    borderColor: isAssigned ? 'info.main' : 'divider',
                    position: 'relative',
                    minHeight: 420,
                    mx: { xs: 1, sm: 0 }, // Add horizontal margin on mobile
                  }}
                >
                  {isAssigned && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'info.main',
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                      }}
                    >
                      ASSIGNED
                    </Box>
                  )}
                  
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                      <Avatar
                        sx={{
                          bgcolor: 'primary.main',
                          mr: 2,
                          width: 56,
                          height: 56,
                          flexShrink: 0,
                        }}
                        src={cert.certification.vendor?.logoUrl}
                      >
                        {cert.certification.vendor?.name?.[0] || 'C'}
                      </Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography
                          variant="h6"
                          component="h3"
                          gutterBottom
                          sx={{
                            fontSize: '1.1rem',
                            lineHeight: 1.3,
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            mb: 1,
                          }}
                          title={cert.certification.name}
                        >
                          {cert.certification.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {cert.certification.vendor?.name || 'Unknown Vendor'}
                        </Typography>
                        {cert.certification.description && (
                          <Box
                            sx={{
                              maxHeight: 60,
                              overflow: 'auto',
                              scrollbarWidth: 'thin',
                              '&::-webkit-scrollbar': {
                                width: '4px',
                              },
                              '&::-webkit-scrollbar-track': {
                                background: '#f1f1f1',
                                borderRadius: '2px',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                background: '#c1c1c1',
                                borderRadius: '2px',
                              },
                              '&::-webkit-scrollbar-thumb:hover': {
                                background: '#a8a8a8',
                              },
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: 'block',
                                lineHeight: 1.4,
                              }}
                            >
                              {cert.certification.description}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        <Chip
                          {...statusChipProps}
                          label={getStatusText(cert.status)}
                          size="small"
                        />
                        <Chip
                          label={cert.certification.level}
                          size="small"
                          variant="outlined"
                        />
                        {cert.certification.pointsValue && (
                          <Chip
                            label={`${cert.certification.pointsValue} pts`}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {cert.certification.isBonusEligible && !cert.bonusClaimed && cert.status === 'ACTIVE' && (
                          <Chip
                            label="💰 Bonus Eligible"
                            size="small"
                            color="secondary"
                          />
                        )}
                        {cert.certification.difficultyLevel && (
                          <Chip
                            label={cert.certification.difficultyLevel}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>

                    {cert.obtainedDate && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Obtained:</strong> {safeFormatDate(cert.obtainedDate)}
                      </Typography>
                    )}
                    {cert.expirationDate && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Expires:</strong> {safeFormatDate(cert.expirationDate)}
                      </Typography>
                    )}
                    
                    {/* Show assignment details for admin-assigned certifications */}
                    {cert.status === 'ADMIN_ASSIGNED' && cert.assignmentDetails && (
                      <Typography variant="body2" sx={{ mb: 1, color: 'info.main' }}>
                        <strong>Assigned:</strong> {safeFormatDate(cert.assignmentDetails.assignedDate)}
                        {cert.assignmentDetails.deadline && (
                          <span style={{ marginLeft: 8 }}>
                            <strong>Due:</strong> {safeFormatDate(cert.assignmentDetails.deadline)}
                          </span>
                        )}
                      </Typography>
                    )}
                    
                    {/* For assigned certifications without obtained/expiration dates */}
                    {cert.status === 'ADMIN_ASSIGNED' && !cert.obtainedDate && (
                      <Alert severity="info" sx={{ mb: 1, py: 0 }}>
                        <Typography variant="body2">
                          Complete this certification to earn {cert.certification.pointsValue} points
                          {cert.assignmentDetails?.bonusEligible && ` and $${cert.assignmentDetails.bonusAmount} bonus`}
                        </Typography>
                      </Alert>
                    )}
                    
                    {/* Expiration warnings */}
                    {cert.status === 'EXPIRING_SOON' && daysUntilExpiry > 0 && (
                      <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
                        <Typography variant="body2">
                          Expires in {daysUntilExpiry} days
                        </Typography>
                      </Alert>
                    )}
                    {cert.status === 'EXPIRED' && (
                      <Alert severity="error" sx={{ mb: 1, py: 0 }}>
                        <Typography variant="body2">
                          Expired {Math.abs(daysUntilExpiry)} days ago
                        </Typography>
                      </Alert>
                    )}
                    {cert.status === 'REJECTED' && (
                      <Alert severity="error" sx={{ mb: 1, py: 0 }}>
                        <Typography variant="body2">
                          Application rejected
                        </Typography>
                      </Alert>
                    )}

                    {cert.certificateNumber && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Certificate #:</strong> {cert.certificateNumber}
                      </Typography>
                    )}

                    {cert.notes && cert.status === 'REJECTED' && (
                      <Typography variant="body2" color="error.main" sx={{ mb: 1 }}>
                        <strong>Reason:</strong> {cert.notes}
                      </Typography>
                    )}
                  </CardContent>

                  {/* Only show download button, no edit/delete for regular users */}
                  <Box sx={{ p: 3, pt: 0, display: 'flex', justifyContent: 'flex-start', gap: 1 }}>
                    {cert.certificateFileUrl && (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => window.open(cert.certificateFileUrl, '_blank')}
                        title="Download Certificate"
                        sx={{
                          border: '1px solid',
                          borderColor: 'primary.main',
                          '&:hover': {
                            backgroundColor: 'primary.main',
                            color: 'white',
                          },
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    )}
                    {cert.verificationUrl && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => window.open(cert.verificationUrl, '_blank')}
                      >
                        Verify
                      </Button>
                    )}
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Fab
        color="primary"
        aria-label="add certification"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => navigate('/certifications/add')}
      >
        <AddIcon />
      </Fab>

      {/* Success notification for refresh */}
      <Snackbar
        open={showRefreshNotification}
        autoHideDuration={3000}
        onClose={() => setShowRefreshNotification(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setShowRefreshNotification(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          Certifications updated successfully
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Certifications;