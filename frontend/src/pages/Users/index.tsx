import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  IconButton,
  Tooltip,
  Alert,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  Badge as BadgeIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { safeFormatDate } from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import UserProfileModal from '@/components/UserProfile/UserProfileModal';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
  competencyTier: string;
  competencyScores: Record<string, number>;
  userCertifications: any[];
  stats?: {
    totalCertifications: number;
    activeCertifications: number;
    totalPoints: number;
    bonusEligible: number;
  };
}

interface UserDetailsDialogProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onEditUser: (user: User) => void;
  onManageCertifications: (user: User) => void;
}


interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSave: (userId: string, userData: any) => void;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({ user, open, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    competencyTier: '',
    role: 'ENGINEER'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        department: user.department || '',
        competencyTier: user.competencyTier || '',
        role: user.role || 'ENGINEER'
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await onSave(user.id, formData);
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit User Profile</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Department"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Competency Tier"
              value={formData.competencyTier}
              onChange={(e) => setFormData(prev => ({ ...prev, competencyTier: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              >
                <MenuItem value="ENGINEER">Engineer</MenuItem>
                <MenuItem value="MANAGER">Manager</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
                <MenuItem value="HR">HR</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          startIcon={loading ? null : <SaveIcon />}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface AssignCertificationDialogProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onAssign: (userId: string, assignment: any) => void;
}

const AssignCertificationDialog: React.FC<AssignCertificationDialogProps> = ({
  user, open, onClose, onAssign
}) => {
  const [certifications, setCertifications] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    certificationId: '',
    deadline: null as Date | null,
    bonus: false,
    bonusAmount: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCertifications();
    }
  }, [open]);

  const fetchCertifications = async () => {
    try {
      const response = await fetch('/api/admin/certifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      // Transform master certification data to format expected by assignment dialog
      const transformedCertifications = (data.certifications || []).map((cert: any) => ({
        id: cert.id,
        name: cert.fullName,
        vendor: { name: cert.vendor },
        level: cert.level,
        pointsValue: cert.pointsValue,
        isBonusEligible: cert.isBonusEligible || false,
        validityMonths: cert.validityMonths,
        description: cert.description
      }));
      
      setCertifications(transformedCertifications);
    } catch (error) {
      console.error('Error fetching certifications:', error);
    }
  };

  const handleAssign = async () => {
    if (!user || !formData.certificationId) return;
    
    setLoading(true);
    try {
      await onAssign(user.id, {
        ...formData,
        deadline: formData.deadline?.toISOString().split('T')[0] || null
      });
      setFormData({
        certificationId: '',
        deadline: null,
        bonus: false,
        bonusAmount: 0
      });
      setSearchTerm('');
      onClose();
    } catch (error) {
      console.error('Error assigning certification:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter certifications based on search term
  const filteredCertifications = certifications.filter(cert => {
    const term = searchTerm.toLowerCase();
    return (
      cert.name?.toLowerCase().includes(term) ||
      cert.vendor?.name?.toLowerCase().includes(term) ||
      cert.level?.toLowerCase().includes(term) ||
      cert.description?.toLowerCase().includes(term)
    );
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Assign Certification</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Search certifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, vendor, level, or keywords"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Certification</InputLabel>
              <Select
                value={formData.certificationId}
                label="Certification"
                onChange={(e) => setFormData(prev => ({ ...prev, certificationId: e.target.value }))}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                    },
                  },
                }}
              >
                {filteredCertifications.length === 0 ? (
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm ? 'No certifications found matching your search' : 'No certifications available'}
                    </Typography>
                  </MenuItem>
                ) : (
                  filteredCertifications.map((cert) => (
                    <MenuItem key={cert.id} value={cert.id}>
                      <Box>
                        <Typography variant="body1">{cert.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {cert.vendor.name} • {cert.level} • {cert.pointsValue} points
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Completion Deadline (Optional)"
                value={formData.deadline}
                onChange={(date: Date | null) => setFormData(prev => ({ ...prev, deadline: date }))}
                slots={{
                  textField: TextField
                }}
                slotProps={{
                  textField: { fullWidth: true }
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <Box display="flex" alignItems="center" gap={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.bonus}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData(prev => ({ ...prev, bonus: e.target.checked }))
                      }
                    />
                  }
                  label="Bonus Eligible"
                />
                {formData.bonus && (
                  <TextField
                    label="Bonus Amount ($)"
                    type="number"
                    value={formData.bonusAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData(prev => ({ ...prev, bonusAmount: Number(e.target.value) }))
                    }
                    sx={{ width: 150 }}
                  />
                )}
              </Box>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          onClick={handleAssign}
          variant="contained"
          disabled={loading || !formData.certificationId}
          startIcon={<AssignmentIcon />}
        >
          {loading ? 'Assigning...' : 'Assign Certification'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface AssignPathwayDialogProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onAssign: (userId: string, pathwayId: string) => void;
}

const AssignPathwayDialog: React.FC<AssignPathwayDialogProps> = ({
  user, open, onClose, onAssign
}) => {
  const [pathways, setPathways] = useState<any[]>([]);
  const [selectedPathway, setSelectedPathway] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPathways();
    }
  }, [open]);

  const fetchPathways = async () => {
    try {
      const response = await fetch('/api/pathways');
      const data = await response.json();
      setPathways(data.pathways || []);
    } catch (error) {
      console.error('Error fetching pathways:', error);
    }
  };

  const handleAssign = async () => {
    if (!user || !selectedPathway) return;
    
    setLoading(true);
    try {
      await onAssign(user.id, selectedPathway);
      setSelectedPathway('');
      onClose();
    } catch (error) {
      console.error('Error assigning pathway:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Assign Career Pathway</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Career Pathway</InputLabel>
              <Select
                value={selectedPathway}
                label="Career Pathway"
                onChange={(e) => setSelectedPathway(e.target.value)}
              >
                {pathways.map((pathway) => (
                  <MenuItem key={pathway.id} value={pathway.id}>
                    <Box>
                      <Typography variant="body1">{pathway.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {pathway.description} • {pathway.estimatedMonths} months
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {selectedPathway && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  {(() => {
                    const pathway = pathways.find(p => p.id === selectedPathway);
                    return pathway ? (
                      <Box>
                        <Typography variant="h6" gutterBottom>{pathway.name}</Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {pathway.description}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Target Role:</strong> {pathway.targetRole}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Estimated Duration:</strong> {pathway.estimatedMonths} months
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Key Skills:</strong> {pathway.skills.join(', ')}
                        </Typography>
                      </Box>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          onClick={handleAssign}
          variant="contained"
          disabled={loading || !selectedPathway}
          startIcon={<TimelineIcon />}
        >
          {loading ? 'Assigning...' : 'Assign Pathway'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface CertificationManagementDialogProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onRefreshUser: () => void;
}

const CertificationManagementDialog: React.FC<CertificationManagementDialogProps> = ({
  user, open, onClose, onRefreshUser
}) => {
  const [certifications, setCertifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCert, setEditingCert] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [certToDelete, setCertToDelete] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      setCertifications(user.userCertifications || []);
    }
  }, [open, user]);

  const handleEditCertification = (cert: any) => {
    setEditingCert(cert);
    setEditDialogOpen(true);
  };

  const handleDeleteCertification = (cert: any) => {
    setCertToDelete(cert);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!user || !certToDelete) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${user.id}/certifications/${certToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete certification');
      }

      setSuccessMessage('Certification deleted successfully');
      setCertifications(prev => prev.filter(c => c.id !== certToDelete.id));
      setDeleteConfirmOpen(false);
      setCertToDelete(null);
      onRefreshUser();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting certification:', error);
      setError('Failed to delete certification. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCertification = async (certId: string, certData: any) => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${user.id}/certifications/${certId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(certData)
      });

      if (!response.ok) {
        throw new Error('Failed to update certification');
      }

      const result = await response.json();
      setSuccessMessage('Certification updated successfully');
      
      // Update the local certifications list
      setCertifications(prev => prev.map(c =>
        c.id === certId ? result.userCertification : c
      ));
      
      setEditDialogOpen(false);
      setEditingCert(null);
      onRefreshUser();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error updating certification:', error);
      setError('Failed to update certification. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <BadgeIcon />
            <Typography variant="h6">
              Manage Certifications - {user.firstName} {user.lastName}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {certifications.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                This user has no certifications assigned.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Certification</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Obtained Date</TableCell>
                    <TableCell>Expiration Date</TableCell>
                    <TableCell>Certificate #</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {certifications.map((cert) => (
                    <TableRow key={cert.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {cert.certification?.name || 'Unknown Certification'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {cert.certification?.vendor?.name} • {cert.certification?.level}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={cert.status === 'ADMIN_ASSIGNED' ? 'Assigned' : cert.status}
                          color={
                            cert.status === 'ADMIN_ASSIGNED' ? 'warning' :
                            cert.status === 'ACTIVE' ? 'success' :
                            cert.status === 'EXPIRED' ? 'error' :
                            'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {cert.status === 'ADMIN_ASSIGNED'
                            ? (cert.assignedDate || 'N/A')
                            : (cert.obtainedDate || 'N/A')
                          }
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {cert.status === 'ADMIN_ASSIGNED'
                            ? (cert.deadline || 'No deadline')
                            : (cert.expirationDate || 'N/A')
                          }
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {cert.certificateNumber || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="Edit Certification">
                            <IconButton
                              size="small"
                              onClick={() => handleEditCertification(cert)}
                              disabled={loading}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Certification">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteCertification(cert)}
                              disabled={loading}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Certification Dialog */}
      <EditCertificationDialog
        certification={editingCert}
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingCert(null);
        }}
        onSave={handleSaveCertification}
        loading={loading}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this certification? This action cannot be undone.
          </Typography>
          {certToDelete && (
            <Box mt={2} p={2} bgcolor="background.paper" borderRadius={1}>
              <Typography variant="body2" fontWeight="medium">
                {certToDelete.certification?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {certToDelete.certification?.vendor?.name}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={loading}
            startIcon={loading ? null : <DeleteIcon />}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

interface EditCertificationDialogProps {
  certification: any;
  open: boolean;
  onClose: () => void;
  onSave: (certId: string, certData: any) => void;
  loading: boolean;
}

const EditCertificationDialog: React.FC<EditCertificationDialogProps> = ({
  certification, open, onClose, onSave, loading
}) => {
  const [formData, setFormData] = useState({
    obtainedDate: '',
    expirationDate: '',
    certificateNumber: '',
    verificationUrl: '',
    status: 'ACTIVE',
    notes: '',
    bonusEligible: false,
    bonusAmount: 0
  });

  useEffect(() => {
    if (certification) {
      setFormData({
        obtainedDate: certification.obtainedDate || '',
        expirationDate: certification.expirationDate || '',
        certificateNumber: certification.certificateNumber || '',
        verificationUrl: certification.verificationUrl || '',
        status: certification.status || 'ACTIVE',
        notes: certification.notes || '',
        bonusEligible: certification.bonusEligible || false,
        bonusAmount: certification.bonusAmount || 0
      });
    }
  }, [certification]);

  const handleSave = () => {
    if (!certification) return;
    onSave(certification.id, formData);
  };

  if (!certification) return null;

  const isAssigned = certification.status === 'ADMIN_ASSIGNED';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Certification Details</DialogTitle>
      <DialogContent>
        <Box mb={2}>
          <Typography variant="h6">{certification.certification?.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {certification.certification?.vendor?.name} • {certification.certification?.level}
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="ADMIN_ASSIGNED">Admin Assigned</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="EXPIRED">Expired</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {!isAssigned && (
            <>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Obtained Date"
                    value={formData.obtainedDate ? new Date(formData.obtainedDate) : null}
                    onChange={(date: Date | null) =>
                      setFormData(prev => ({
                        ...prev,
                        obtainedDate: date ? date.toISOString().split('T')[0] : ''
                      }))
                    }
                    slots={{ textField: TextField }}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Expiration Date"
                    value={formData.expirationDate ? new Date(formData.expirationDate) : null}
                    onChange={(date: Date | null) =>
                      setFormData(prev => ({
                        ...prev,
                        expirationDate: date ? date.toISOString().split('T')[0] : ''
                      }))
                    }
                    slots={{ textField: TextField }}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Certificate Number"
                  value={formData.certificateNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, certificateNumber: e.target.value }))}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Verification URL"
              value={formData.verificationUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, verificationUrl: e.target.value }))}
            />
          </Grid>

          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.bonusEligible}
                    onChange={(e) => setFormData(prev => ({ ...prev, bonusEligible: e.target.checked }))}
                  />
                }
                label="Bonus Eligible"
              />
              {formData.bonusEligible && (
                <TextField
                  label="Bonus Amount ($)"
                  type="number"
                  value={formData.bonusAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, bonusAmount: Number(e.target.value) }))}
                  sx={{ width: 150 }}
                />
              )}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          startIcon={loading ? null : <SaveIcon />}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Users: React.FC = () => {
  const { user: currentUser, hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignCertDialogOpen, setAssignCertDialogOpen] = useState(false);
  const [assignPathwayDialogOpen, setAssignPathwayDialogOpen] = useState(false);
  const [certManagementDialogOpen, setCertManagementDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if current user has admin access
  const isAdmin = hasRole(['ADMIN']);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAdmin) {
        setError('Access denied. Admin privileges required to view user management.');
        return;
      }

      // Use users endpoint (admin middleware already applied in backend)
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('Access denied. Admin privileges required.');
          return;
        }
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setDetailsDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleAssignCertification = (user: User) => {
    setSelectedUser(user);
    setAssignCertDialogOpen(true);
  };

  const handleAssignPathway = (user: User) => {
    setSelectedUser(user);
    setAssignPathwayDialogOpen(true);
  };

  const handleManageCertifications = (user: User) => {
    setSelectedUser(user);
    setCertManagementDialogOpen(true);
  };

  const handleSaveUser = async (userId: string, userData: any) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      setSuccessMessage('User updated successfully');
      fetchUsers(); // Refresh the users list
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update user. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAssignCertificationToUser = async (userId: string, assignment: any) => {
    try {
      const response = await fetch(`/api/users/${userId}/assign-certification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assignment)
      });

      if (!response.ok) {
        throw new Error('Failed to assign certification');
      }

      setSuccessMessage('Certification assigned successfully');
      fetchUsers(); // Refresh the users list
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error assigning certification:', error);
      setError('Failed to assign certification. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAssignPathwayToUser = async (userId: string, pathwayId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/assign-pathway`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pathwayId })
      });

      if (!response.ok) {
        throw new Error('Failed to assign pathway');
      }

      setSuccessMessage('Career pathway assigned successfully');
      fetchUsers(); // Refresh the users list
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error assigning pathway:', error);
      setError('Failed to assign pathway. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Filter users based on search and filter criteria
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = departmentFilter === '' || user.department === departmentFilter;
    const matchesRole = roleFilter === '' || user.role === roleFilter;
    const matchesTier = tierFilter === '' || user.competencyTier === tierFilter;

    return matchesSearch && matchesDepartment && matchesRole && matchesTier;
  });

  // Get unique values for filters
  const departments = [...new Set(users.map(u => u.department))];
  const roles = [...new Set(users.map(u => u.role))];
  const tiers = [...new Set(users.map(u => u.competencyTier))];

  if (!isAdmin) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          User Management
        </Typography>
        <Alert severity="error">
          Access denied. You need administrator privileges to access user management.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading users...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          User Management
        </Typography>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchUsers}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => {/* TODO: Add user functionality */}}
        >
          Add User
        </Button>
      </Box>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search users"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={departmentFilter}
                  label="Department"
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={roleFilter}
                  label="Role"
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {roles.map(role => (
                    <MenuItem key={role} value={role}>{role}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Tier</InputLabel>
                <Select
                  value={tierFilter}
                  label="Tier"
                  onChange={(e) => setTierFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {tiers.map(tier => (
                    <MenuItem key={tier} value={tier}>{tier}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => {
                  setSearchTerm('');
                  setDepartmentFilter('');
                  setRoleFilter('');
                  setTierFilter('');
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                {users.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {users.filter(u => u.role === 'ADMIN').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Administrators
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="info.main">
                {departments.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Departments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {users.reduce((sum, u) => sum + (u.stats?.totalCertifications || 0), 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Certificates
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Users Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Team Members ({filteredUsers.length})
          </Typography>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Tier</TableCell>
                  <TableCell>Certifications</TableCell>
                  <TableCell>Points</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {user.firstName[0]}{user.lastName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {user.firstName} {user.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.department}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={user.role === 'ADMIN' ? 'error' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.competencyTier}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {user.stats?.activeCertifications || 0} / {user.stats?.totalCertifications || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="info.main" fontWeight="medium">
                        {user.stats?.totalPoints || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewUser(user)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit User">
                          <IconButton
                            size="small"
                            onClick={() => handleEditUser(user)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Assign Certification">
                          <IconButton
                            size="small"
                            onClick={() => handleAssignCertification(user)}
                          >
                            <AssignmentIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Assign Career Pathway">
                          <IconButton
                            size="small"
                            onClick={() => handleAssignPathway(user)}
                          >
                            <TimelineIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {filteredUsers.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No users found matching your search criteria.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <UserProfileModal
        user={selectedUser}
        open={detailsDialogOpen}
        onClose={() => {
          setDetailsDialogOpen(false);
          setSelectedUser(null);
        }}
        onEditUser={handleEditUser}
        onManageCertifications={handleManageCertifications}
        showActionButtons={true}
      />

      {/* Edit User Dialog */}
      <EditUserDialog
        user={selectedUser}
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveUser}
      />

      {/* Assign Certification Dialog */}
      <AssignCertificationDialog
        user={selectedUser}
        open={assignCertDialogOpen}
        onClose={() => {
          setAssignCertDialogOpen(false);
          setSelectedUser(null);
        }}
        onAssign={handleAssignCertificationToUser}
      />

      {/* Assign Pathway Dialog */}
      <AssignPathwayDialog
        user={selectedUser}
        open={assignPathwayDialogOpen}
        onClose={() => {
          setAssignPathwayDialogOpen(false);
          setSelectedUser(null);
        }}
        onAssign={handleAssignPathwayToUser}
      />

      {/* Certification Management Dialog */}
      <CertificationManagementDialog
        user={selectedUser}
        open={certManagementDialogOpen}
        onClose={() => {
          setCertManagementDialogOpen(false);
          setSelectedUser(null);
        }}
        onRefreshUser={fetchUsers}
      />
    </Box>
  );
};

export default Users;