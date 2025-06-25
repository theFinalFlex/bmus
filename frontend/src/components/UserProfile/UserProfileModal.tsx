import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  IconButton,
  Paper,
  Stack
} from '@mui/material';
import {
  Close,
  Email as EmailIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon,
  Assignment as AssignmentIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { safeFormatDate } from '@/utils/dateUtils';

interface UserProfileModalProps {
  user: any | null;
  open: boolean;
  onClose: () => void;
  onEditUser?: (user: any) => void;
  onManageCertifications?: (user: any) => void;
  showActionButtons?: boolean;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ 
  user, 
  open, 
  onClose, 
  onEditUser, 
  onManageCertifications,
  showActionButtons = false
}) => {
  if (!user) return null;

  const getCompetencyColor = (tier: string) => {
    switch (tier) {
      case 'Entry': return '#4caf50';
      case 'Junior': return '#4caf50';
      case 'Senior': return '#2196f3';
      case 'Architect': return '#ff9800';
      case 'Principal': return '#9c27b0';
      default: return '#9e9e9e';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ 
              bgcolor: getCompetencyColor(user.competencyTier),
              width: 56,
              height: 56
            }}>
              {user.firstName[0]}{user.lastName[0]}
            </Avatar>
            <Box>
              <Typography variant="h6">
                {user.firstName} {user.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.department} • {user.competencyTier}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Profile Information */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, border: '2px solid', borderColor: 'primary.main' }}>
              <Typography variant="h6" gutterBottom color="primary">
                Profile Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <EmailIcon fontSize="small" color="action" />
                  <Typography><strong>Email:</strong> {user.email}</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <BusinessIcon fontSize="small" color="action" />
                  <Typography><strong>Department:</strong> {user.department}</Typography>
                </Box>
                <Typography>
                  <strong>Job Tier:</strong>
                  <Chip
                    label={user.competencyTier}
                    size="small"
                    sx={{
                      ml: 1,
                      bgcolor: getCompetencyColor(user.competencyTier),
                      color: 'white'
                    }}
                  />
                </Typography>
                <Chip
                  label={user.role}
                  color={user.role === 'ADMIN' ? 'error' : 'primary'}
                  size="small"
                  sx={{ alignSelf: 'flex-start' }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Certification Stats */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, border: '2px solid', borderColor: 'secondary.main' }}>
              <Typography variant="h6" gutterBottom color="secondary">
                Certification Stats
              </Typography>
              {user.stats ? (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary">
                        {user.stats.totalCertifications}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Certs
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main">
                        {user.stats.activeCertifications}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="info.main">
                        {user.stats.totalPoints}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Points
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="warning.main">
                        {user.stats.bonusEligible}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Bonus Eligible
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Stats not available
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Competency Scores */}
          {user.competencyScores && Object.keys(user.competencyScores).length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Competency Scores
                  </Typography>
                  {Object.entries(user.competencyScores).map(([vendor, score]) => (
                    <Box key={vendor} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">{vendor}</Typography>
                      <Chip
                        label={`${score} points`}
                        color={(score as number) >= 40 ? 'success' : (score as number) >= 20 ? 'warning' : 'default'}
                        size="small"
                      />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Current Certifications */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, border: '3px solid', borderColor: 'success.main', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom color="success.main">
                ✅ Current Certifications
              </Typography>
              {user.userCertifications?.filter((cert: any) => cert.status === 'ACTIVE').length > 0 ? (
                <Stack spacing={2}>
                  {user.userCertifications.filter((cert: any) => cert.status === 'ACTIVE').map((cert: any) => (
                    <Box key={cert.id} sx={{
                      p: 2,
                      bgcolor: 'success.50',
                      border: '1px solid',
                      borderColor: 'success.main',
                      borderRadius: 1
                    }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {cert.certification?.name || 'Unknown Certification'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {cert.certification?.vendor?.name || 'Unknown'} • {cert.certification?.level || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <Chip
                            label={cert.status}
                            size="small"
                            color="success"
                            variant="filled"
                          />
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2">
                            <strong>Expires:</strong> {cert.expirationDate ? safeFormatDate(cert.expirationDate, 'MMM dd, yyyy', 'N/A') : 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <Typography variant="body2">
                            <strong>Points:</strong> {cert.certification?.pointsValue || 0}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No current certifications.
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Admin Assigned Certifications */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, border: '3px dashed', borderColor: 'info.main', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom color="info.main">
                📋 Admin Assigned Certifications
              </Typography>
              {user.userCertifications?.filter((cert: any) => cert.status === 'ADMIN_ASSIGNED').length > 0 ? (
                <Stack spacing={2}>
                  {user.userCertifications.filter((cert: any) => cert.status === 'ADMIN_ASSIGNED').map((cert: any) => (
                    <Box key={cert.id} sx={{
                      p: 2,
                      bgcolor: 'info.50',
                      border: '1px dashed',
                      borderColor: 'info.main',
                      borderRadius: 1
                    }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {cert.certification?.name || 'Unknown Certification'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {cert.certification?.vendor?.name || 'Unknown'} • {cert.certification?.level || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <Chip
                            label="Assigned"
                            size="small"
                            color="info"
                            variant="filled"
                          />
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2">
                            <strong>Assigned:</strong> {cert.assignedDate ? safeFormatDate(cert.assignedDate, 'MMM dd, yyyy', 'N/A') : 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <Typography variant="body2">
                            <strong>Points:</strong> {cert.certification?.pointsValue || 0}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No assigned certifications.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {showActionButtons && onEditUser && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => onEditUser(user)}
            sx={{ mr: 1 }}
          >
            Edit User
          </Button>
        )}
        {showActionButtons && onManageCertifications && (
          <Button
            variant="contained"
            startIcon={<BadgeIcon />}
            onClick={() => onManageCertifications(user)}
          >
            Manage Certifications
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UserProfileModal;