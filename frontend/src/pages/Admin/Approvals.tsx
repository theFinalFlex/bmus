import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  Paper,
  Stack,
  IconButton,
  Badge,
  FormControlLabel,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Schedule,
  Person,
  WorkspacePremium,
  FilePresent,
  Link as LinkIcon,
  Comment,
  Visibility,
  Close,
  Refresh,
  FilterList,
  NotificationImportant,
  TrendingUp,
  Group,
  Assessment,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminApi, certificationMasterApi } from '@/services/api';
import { safeFormatDate } from '@/utils/dateUtils';
import { ValidationResult, MasterCertification } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface PendingSubmission {
  id: string;
  userId: string;
  certificationId: string;
  obtainedDate: string;
  expirationDate: string;
  certificateNumber: string;
  verificationUrl?: string;
  notes?: string;
  certificateFileUrl?: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  submittedDate: string;
  certification: {
    id: string;
    name: string;
    vendor: { name: string };
    level: string;
    pointsValue: number;
    isBonusEligible: boolean;
    validityMonths: number;
    description: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    competencyTier: string;
  };
}

interface ApprovalHistoryItem {
  id: string;
  submissionId: string;
  action: 'APPROVED' | 'REJECTED';
  processedDate: string;
  processedBy: string;
  adminComments?: string;
  rejectionReason?: string;
  certification: {
    id: string;
    name: string;
    vendor: { name: string };
    level: string;
    pointsValue: number;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department: string;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`approval-tabpanel-${index}`}
      aria-labelledby={`approval-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminApprovals: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<PendingSubmission | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminComments, setAdminComments] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);

  // Fetch pending submissions
  const {
    data: pendingData,
    isLoading: pendingLoading,
    refetch: refetchPending
  } = useQuery(
    'pendingCertifications',
    () => adminApi.getPendingCertifications(),
    {
      refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30 seconds
      refetchOnWindowFocus: false
    }
  );

  // Fetch approval history
  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory
  } = useQuery(
    'approvalHistory',
    () => adminApi.getApprovalHistory(),
    {
      refetchInterval: autoRefresh ? 60000 : false,
      refetchOnWindowFocus: false
    }
  );

  // Fetch admin dashboard stats
  const { data: statsData, isLoading: statsLoading } = useQuery(
    'adminDashboardStats',
    () => adminApi.getDashboardStats(),
    {
      refetchInterval: autoRefresh ? 60000 : false,
      refetchOnWindowFocus: false
    }
  );

  // Approve certification mutation
  const approveMutation = useMutation(
    ({ submissionId, comments }: { submissionId: string; comments?: string }) =>
      adminApi.approveCertification(submissionId, comments),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pendingCertifications']);
        queryClient.invalidateQueries(['approvalHistory']);
        queryClient.invalidateQueries(['adminDashboardStats']);
        queryClient.invalidateQueries(['userCertifications']);
        queryClient.invalidateQueries(['search']);
        setShowApproveDialog(false);
        setSelectedSubmission(null);
        setAdminComments('');
        // Refresh data immediately
        refetchPending();
        refetchHistory();
      },
    }
  );

  // Reject certification mutation
  const rejectMutation = useMutation(
    ({ submissionId, reason, comments }: { submissionId: string; reason: string; comments?: string }) =>
      adminApi.rejectCertification(submissionId, reason, comments),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pendingCertifications']);
        queryClient.invalidateQueries(['approvalHistory']);
        queryClient.invalidateQueries(['adminDashboardStats']);
        setShowRejectDialog(false);
        setSelectedSubmission(null);
        setRejectionReason('');
        setAdminComments('');
        // Refresh data immediately
        refetchPending();
        refetchHistory();
      },
    }
  );

  const pendingSubmissions = (pendingData?.data as any)?.pendingSubmissions || [];
  const approvalHistory = (historyData?.data as any)?.approvalHistory || [];
  const stats = (statsData?.data as any)?.stats;

  const handleApprove = (submission: PendingSubmission) => {
    setSelectedSubmission(submission);
    setShowApproveDialog(true);
  };

  const handleReject = (submission: PendingSubmission) => {
    setSelectedSubmission(submission);
    setShowRejectDialog(true);
  };

  const handleConfirmApprove = () => {
    if (selectedSubmission) {
      approveMutation.mutate({
        submissionId: selectedSubmission.id,
        comments: adminComments
      });
    }
  };

  const handleConfirmReject = () => {
    if (selectedSubmission && rejectionReason.trim()) {
      rejectMutation.mutate({
        submissionId: selectedSubmission.id,
        reason: rejectionReason,
        comments: adminComments
      });
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'FOUNDATION': return '#4caf50';
      case 'ASSOCIATE': return '#2196f3';
      case 'PROFESSIONAL': return '#ff9800';
      case 'EXPERT': return '#f44336';
      case 'SPECIALTY': return '#9c27b0';
      default: return '#9e9e9e';
    }
  };

  const getCompetencyColor = (tier: string) => {
    switch (tier) {
      case 'Junior': return '#4caf50';
      case 'Senior': return '#2196f3';
      case 'Architect': return '#ff9800';
      case 'Principal': return '#9c27b0';
      default: return '#9e9e9e';
    }
  };

  if (pendingLoading && !pendingSubmissions.length) {
    return <LoadingSpinner message="Loading pending approvals..." />;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">
            Certification Approvals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review and approve pending certification submissions
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                color="primary"
              />
            }
            label="Auto-refresh"
          />
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => refetchPending()}
            disabled={pendingLoading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Admin Dashboard Stats */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Pending Approvals
                    </Typography>
                    <Typography variant="h4">
                      {stats.pendingApprovals}
                    </Typography>
                  </Box>
                  <Badge badgeContent={stats.pendingApprovals} color="error">
                    <NotificationImportant sx={{ color: 'warning.main', fontSize: 40 }} />
                  </Badge>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Total Users
                    </Typography>
                    <Typography variant="h4">
                      {stats.totalUsers}
                    </Typography>
                  </Box>
                  <Group sx={{ color: 'primary.main', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Total Certifications
                    </Typography>
                    <Typography variant="h4">
                      {stats.totalCertifications}
                    </Typography>
                  </Box>
                  <WorkspacePremium sx={{ color: 'secondary.main', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Recent Activity
                    </Typography>
                    <Typography variant="h4">
                      {stats.recentActivity?.lastWeek?.newSubmissions || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      New this week
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ color: 'success.main', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs for different views */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={currentTab} 
            onChange={(_, newValue) => setCurrentTab(newValue)}
            aria-label="approval tabs"
          >
            <Tab 
              label={
                <Badge badgeContent={pendingSubmissions.length} color="error" sx={{ '& .MuiBadge-badge': { right: -3, top: 13 } }}>
                  Pending Approvals
                </Badge>
              } 
            />
            <Tab label="Approval History" />
            <Tab label="Bulk Actions" />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          {/* Pending Submissions */}
          {pendingSubmissions.length === 0 ? (
            <Alert severity="info" sx={{ m: 3 }}>
              <Typography variant="h6">No pending approvals</Typography>
              <Typography>All certification submissions have been processed.</Typography>
            </Alert>
          ) : (
            <List>
              {pendingSubmissions.map((submission: PendingSubmission, index: number) => (
                <React.Fragment key={submission.id}>
                  <ListItem
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      p: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 2,
                      mx: 2
                    }}
                  >
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: getCompetencyColor(submission.user.competencyTier) }}>
                          <Person />
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {submission.user.firstName} {submission.user.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {submission.user.email} • {submission.user.department}
                          </Typography>
                          <Chip
                            label={submission.user.competencyTier}
                            size="small"
                            sx={{ 
                              bgcolor: getCompetencyColor(submission.user.competencyTier), 
                              color: 'white',
                              mt: 0.5
                            }}
                          />
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip
                          icon={<Schedule />}
                          label={`Submitted ${safeFormatDate(submission.submittedDate)}`}
                          size="small"
                          color="warning"
                        />
                      </Box>
                    </Box>

                    {/* Certification Details */}
                    <Paper sx={{
                      p: 2,
                      mb: 2,
                      bgcolor: 'grey.50',
                      '& .MuiTypography-root': {
                        color: 'text.primary'
                      }
                    }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={8}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              <WorkspacePremium />
                            </Avatar>
                            <Box>
                              <Typography variant="h6" color="primary">
                                {submission.certification.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {submission.certification.vendor.name} • {submission.certification.description}
                              </Typography>
                            </Box>
                          </Box>
                          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                            <Chip
                              label={submission.certification.level}
                              size="small"
                              sx={{ bgcolor: getLevelColor(submission.certification.level), color: 'white' }}
                            />
                            <Chip
                              label={`${submission.certification.pointsValue} points`}
                              size="small"
                              variant="outlined"
                              sx={{
                                color: 'text.primary',
                                borderColor: 'text.secondary'
                              }}
                            />
                            {submission.certification.isBonusEligible && (
                              <Chip
                                label="Bonus Eligible"
                                size="small"
                                color="secondary"
                              />
                            )}
                          </Stack>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="subtitle2" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
                            Submission Details
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.primary', mb: 0.5 }}>
                            <strong>Certificate Number:</strong> {submission.certificateNumber}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.primary', mb: 0.5 }}>
                            <strong>Obtained:</strong> {safeFormatDate(submission.obtainedDate)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.primary', mb: 0.5 }}>
                            <strong>Expires:</strong> {safeFormatDate(submission.expirationDate)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Additional Information */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      {submission.verificationUrl && (
                        <Grid item xs={12} md={6}>
                          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'info.main' }}>
                            <Typography variant="subtitle2" gutterBottom color="info.main">
                              <LinkIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                              Verification URL
                            </Typography>
                            <Typography 
                              variant="body2" 
                              component="a" 
                              href={submission.verificationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ color: 'info.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                            >
                              {submission.verificationUrl}
                            </Typography>
                          </Paper>
                        </Grid>
                      )}
                      {submission.certificateFileUrl && (
                        <Grid item xs={12} md={6}>
                          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'success.main' }}>
                            <Typography variant="subtitle2" gutterBottom color="success.main">
                              <FilePresent sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                              Certificate File
                            </Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={<Visibility />}
                              href={submission.certificateFileUrl}
                              target="_blank"
                            >
                              View Certificate
                            </Button>
                          </Paper>
                        </Grid>
                      )}
                      {submission.notes && (
                        <Grid item xs={12}>
                          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'grey.300' }}>
                            <Typography variant="subtitle2" gutterBottom>
                              <Comment sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                              User Notes
                            </Typography>
                            <Typography variant="body2">{submission.notes}</Typography>
                          </Paper>
                        </Grid>
                      )}
                    </Grid>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Cancel />}
                        onClick={() => handleReject(submission)}
                        disabled={rejectMutation.isLoading}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircle />}
                        onClick={() => handleApprove(submission)}
                        disabled={approveMutation.isLoading}
                      >
                        Approve
                      </Button>
                    </Box>
                  </ListItem>
                  {index < pendingSubmissions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          {/* Approval History */}
          {historyLoading ? (
            <LoadingSpinner message="Loading approval history..." />
          ) : approvalHistory.length === 0 ? (
            <Alert severity="info" sx={{ m: 3 }}>
              <Typography variant="h6">No Approval History</Typography>
              <Typography>No certification approvals or rejections have been processed yet.</Typography>
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Certification</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {approvalHistory.map((item: ApprovalHistoryItem) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            <Person fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {item.user.firstName} {item.user.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.user.department}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {item.certification.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.certification.vendor.name} • {item.certification.pointsValue} points
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.action}
                          size="small"
                          color={item.action === 'APPROVED' ? 'success' : 'error'}
                          icon={item.action === 'APPROVED' ? <CheckCircle /> : <Cancel />}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {safeFormatDate(item.processedDate)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {safeFormatDate(item.processedDate, 'HH:mm')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {item.rejectionReason && (
                            <Typography variant="body2" color="error.main" sx={{ mb: 0.5 }}>
                              <strong>Reason:</strong> {item.rejectionReason}
                            </Typography>
                          )}
                          {item.adminComments && (
                            <Typography variant="body2" color="text.secondary">
                              <strong>Comments:</strong> {item.adminComments}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Alert severity="info" sx={{ m: 3 }}>
            <Typography variant="h6">Bulk Actions</Typography>
            <Typography>This feature will allow bulk approval/rejection of multiple submissions.</Typography>
          </Alert>
        </TabPanel>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApproveDialog} onClose={() => setShowApproveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Approve Certification</Typography>
            <IconButton onClick={() => setShowApproveDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSubmission && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  Approve certification for {selectedSubmission.user.firstName} {selectedSubmission.user.lastName}?
                </Typography>
                <Typography variant="body2">
                  {selectedSubmission.certification.name} • {selectedSubmission.certification.vendor.name}
                </Typography>
              </Alert>
              <TextField
                fullWidth
                label="Admin Comments (Optional)"
                multiline
                rows={3}
                value={adminComments}
                onChange={(e) => setAdminComments(e.target.value)}
                placeholder="Add any comments about this approval..."
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApproveDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConfirmApprove}
            disabled={approveMutation.isLoading}
            startIcon={approveMutation.isLoading ? <LinearProgress /> : <CheckCircle />}
          >
            {approveMutation.isLoading ? 'Approving...' : 'Approve Certification'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Reject Certification</Typography>
            <IconButton onClick={() => setShowRejectDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSubmission && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  Reject certification for {selectedSubmission.user.firstName} {selectedSubmission.user.lastName}?
                </Typography>
                <Typography variant="body2">
                  {selectedSubmission.certification.name} • {selectedSubmission.certification.vendor.name}
                </Typography>
              </Alert>
              <TextField
                fullWidth
                label="Rejection Reason *"
                multiline
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a clear reason for rejection..."
                error={!rejectionReason.trim()}
                helperText={!rejectionReason.trim() ? 'Rejection reason is required' : ''}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Admin Comments (Optional)"
                multiline
                rows={2}
                value={adminComments}
                onChange={(e) => setAdminComments(e.target.value)}
                placeholder="Additional comments or guidance for resubmission..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRejectDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmReject}
            disabled={rejectMutation.isLoading || !rejectionReason.trim()}
            startIcon={rejectMutation.isLoading ? <LinearProgress /> : <Cancel />}
          >
            {rejectMutation.isLoading ? 'Rejecting...' : 'Reject Certification'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminApprovals;