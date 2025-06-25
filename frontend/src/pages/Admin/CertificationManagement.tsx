import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Tooltip,
  Stack,
  Switch,
  FormControlLabel,
  Pagination,
  TableSortLabel,
  Menu,
  MenuList,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { certificationMasterApi } from '@/services/api';
import { CertificationMaster, CertificationMasterFormData } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { safeFormatDate } from '@/utils/dateUtils';

interface CertificationTableProps {
  certifications: CertificationMaster[];
  onEdit: (cert: CertificationMaster) => void;
  onDelete: (cert: CertificationMaster) => void;
  onView: (cert: CertificationMaster) => void;
}

const CertificationTable: React.FC<CertificationTableProps> = ({
  certifications,
  onEdit,
  onDelete,
  onView
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCert, setSelectedCert] = useState<CertificationMaster | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, cert: CertificationMaster) => {
    setAnchorEl(event.currentTarget);
    setSelectedCert(cert);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCert(null);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ENTRY': return '#4caf50';
      case 'ASSOCIATE': return '#2196f3';
      case 'PROFESSIONAL': return '#ff9800';
      case 'EXPERT': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Certification Name</TableCell>
              <TableCell>Short Name</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>Points</TableCell>
              <TableCell>Validity (Months)</TableCell>
              <TableCell>Date Introduced</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {certifications.map((cert) => (
              <TableRow key={cert.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {cert.fullName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {cert.description}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={cert.shortName}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 'bold' }}
                  />
                </TableCell>
                <TableCell>{cert.version}</TableCell>
                <TableCell>{cert.vendor}</TableCell>
                <TableCell>
                  <Chip
                    label={cert.level}
                    size="small"
                    sx={{
                      bgcolor: getLevelColor(cert.level || 'ASSOCIATE'),
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                </TableCell>
                <TableCell>{cert.pointsValue}</TableCell>
                <TableCell>{cert.validityMonths}</TableCell>
                <TableCell>{safeFormatDate(cert.dateIntroduced)}</TableCell>
                <TableCell>
                  <Chip
                    icon={cert.isActive ? <ActiveIcon /> : <InactiveIcon />}
                    label={cert.isActive ? 'Active' : 'Inactive'}
                    size="small"
                    color={cert.isActive ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, cert)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuList dense>
          <MenuItem onClick={() => { onView(selectedCert!); handleMenuClose(); }}>
            <ListItemIcon>
              <ViewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Details</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { onEdit(selectedCert!); handleMenuClose(); }}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { onDelete(selectedCert!); handleMenuClose(); }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </MenuList>
      </Menu>
    </>
  );
};

const CertificationManagement: React.FC = () => {
  const queryClient = useQueryClient();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedCertification, setSelectedCertification] = useState<CertificationMaster | null>(null);
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState<CertificationMasterFormData>({
    fullName: '',
    shortName: '',
    version: '',
    vendor: '',
    dateIntroduced: '',
    dateExpired: '',
    level: 'ASSOCIATE',
    pointsValue: 15,
    validityMonths: 36,
    description: '',
    isActive: true
  });

// Enhanced search functionality with Enter key support and optimized debouncing
const performSearch = useCallback((term: string) => {
  setDebouncedSearchTerm(term.trim());
}, []);

// Debounced search function with optimized timing (200ms for snappier response)
const debouncedSearch = useCallback(
  (() => {
    let timeoutId: NodeJS.Timeout;
    return (term: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        performSearch(term);
      }, 200);
    };
  })(),
  [performSearch]
);

// Handle Enter key press for immediate search
const handleSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    performSearch(searchTerm);
  }
}, [searchTerm, performSearch]);

// Enhanced debounced search effect with space detection and cleanup
useEffect(() => {
  // Immediate search if term ends with space or is empty
  if (searchTerm === '' || searchTerm.endsWith(' ')) {
    performSearch(searchTerm);
  } else {
    // Debounced search for active typing
    debouncedSearch(searchTerm);
  }
}, [searchTerm, performSearch, debouncedSearch]);

// Fetch certifications
const {
  data: certificationData,
  isLoading,
  refetch
} = useQuery(
  ['certificationMaster', debouncedSearchTerm, vendorFilter, levelFilter, page],
  () => certificationMasterApi.getCertifications({
    search: debouncedSearchTerm,
    vendor: vendorFilter,
    level: levelFilter,
    page,
    limit: 15 // Changed from 10 to 15 per page
  }),
  {
    refetchOnWindowFocus: false
  }
);

  // Mutations
  const addMutation = useMutation(
    (data: CertificationMasterFormData) => certificationMasterApi.addCertification(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['certificationMaster']);
        setShowAddDialog(false);
        resetForm();
      }
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: CertificationMasterFormData }) =>
      certificationMasterApi.updateCertification(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['certificationMaster']);
        setShowEditDialog(false);
        resetForm();
      }
    }
  );

  const deleteMutation = useMutation(
    (id: string) => certificationMasterApi.deleteCertification(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['certificationMaster']);
        setShowDeleteDialog(false);
        setSelectedCertification(null);
      }
    }
  );

  const certifications = (certificationData?.data as any)?.certifications || [];
  const pagination = (certificationData?.data as any)?.pagination;

  const resetForm = () => {
    setFormData({
      fullName: '',
      shortName: '',
      version: '',
      vendor: '',
      dateIntroduced: '',
      dateExpired: '',
      level: 'ASSOCIATE',
      pointsValue: 15,
      validityMonths: 36,
      description: '',
      isActive: true
    });
  };

  const handleAdd = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const handleEdit = (cert: CertificationMaster) => {
    setFormData({
      fullName: cert.fullName,
      shortName: cert.shortName,
      version: cert.version,
      vendor: cert.vendor,
      dateIntroduced: cert.dateIntroduced.split('T')[0],
      dateExpired: cert.dateExpired ? cert.dateExpired.split('T')[0] : '',
      level: cert.level,
      pointsValue: cert.pointsValue,
      validityMonths: cert.validityMonths,
      description: cert.description || '',
      isActive: cert.isActive
    });
    setSelectedCertification(cert);
    setShowEditDialog(true);
  };

  const handleDelete = (cert: CertificationMaster) => {
    setSelectedCertification(cert);
    setShowDeleteDialog(true);
  };

  const handleView = (cert: CertificationMaster) => {
    setSelectedCertification(cert);
    setShowViewDialog(true);
  };

  const handleSubmit = () => {
    if (selectedCertification) {
      updateMutation.mutate({ id: selectedCertification.id, data: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedCertification) {
      deleteMutation.mutate(selectedCertification.id);
    }
  };

  if (isLoading && certifications.length === 0) {
    return <LoadingSpinner message="Loading certifications..." />;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">
            Certification Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage the master catalog of available certifications
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          size="large"
        >
          Add Certification
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search certifications"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="Search by name, vendor, or description... (Press Enter for instant search)"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Vendor</InputLabel>
                <Select
                  value={vendorFilter}
                  label="Vendor"
                  onChange={(e) => setVendorFilter(e.target.value)}
                >
                  <MenuItem value="">All Vendors</MenuItem>
                  <MenuItem value="AWS">AWS</MenuItem>
                  <MenuItem value="Microsoft">Microsoft</MenuItem>
                  <MenuItem value="CompTIA">CompTIA</MenuItem>
                  <MenuItem value="ISC2">ISC2</MenuItem>
                  <MenuItem value="ISACA">ISACA</MenuItem>
                  <MenuItem value="GIAC">GIAC</MenuItem>
                  <MenuItem value="Cisco">Cisco</MenuItem>
                  <MenuItem value="EC-Council">EC-Council</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Level</InputLabel>
                <Select
                  value={levelFilter}
                  label="Level"
                  onChange={(e) => setLevelFilter(e.target.value)}
                >
                  <MenuItem value="">All Levels</MenuItem>
                  <MenuItem value="ENTRY">Entry</MenuItem>
                  <MenuItem value="ASSOCIATE">Associate</MenuItem>
                  <MenuItem value="PROFESSIONAL">Professional</MenuItem>
                  <MenuItem value="EXPERT">Expert</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setVendorFilter('');
                  setLevelFilter('');
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {pagination ?
            `Showing ${((page - 1) * 15) + 1}-${Math.min(page * 15, pagination.total)} of ${pagination.total} certifications (Page ${page} of ${pagination.pages})` :
            `${certifications.length} certifications`
          }
        </Typography>
      </Box>

      {/* Certifications Table */}
      {certifications.length === 0 ? (
        <Alert severity="info">
          No certifications found. {searchTerm || vendorFilter || levelFilter ? 'Try adjusting your filters.' : 'Add your first certification to get started.'}
        </Alert>
      ) : (
        <>
          <CertificationTable
            certifications={certifications}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
          />

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={pagination.pages}
                page={page}
                onChange={(_, value) => {
                  console.log('Pagination: Changing to page', value);
                  setPage(value);
                }}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={showAddDialog || showEditDialog}
        onClose={() => {
          setShowAddDialog(false);
          setShowEditDialog(false);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {showEditDialog ? 'Edit Certification' : 'Add New Certification'}
            </Typography>
            <IconButton
              onClick={() => {
                setShowAddDialog(false);
                setShowEditDialog(false);
                resetForm();
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                required
                label="Full Certification Name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g., Certified Information Systems Security Professional"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                label="Short Name/Acronym"
                value={formData.shortName}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                placeholder="e.g., CISSP"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                label="Version"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="e.g., 2024, v12.0"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                label="Vendor"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                placeholder="e.g., ISC2, CompTIA"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Level</InputLabel>
                <Select
                  value={formData.level}
                  label="Level"
                  onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                >
                  <MenuItem value="ENTRY">Entry</MenuItem>
                  <MenuItem value="ASSOCIATE">Associate</MenuItem>
                  <MenuItem value="PROFESSIONAL">Professional</MenuItem>
                  <MenuItem value="EXPERT">Expert</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Points Value"
                value={formData.pointsValue}
                onChange={(e) => setFormData({ ...formData, pointsValue: Number(e.target.value) })}
                inputProps={{ min: 1, max: 100 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Validity (Months)"
                value={formData.validityMonths}
                onChange={(e) => setFormData({ ...formData, validityMonths: Number(e.target.value) })}
                inputProps={{ min: 1, max: 120 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                type="date"
                label="Date Introduced"
                value={formData.dateIntroduced}
                onChange={(e) => setFormData({ ...formData, dateIntroduced: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="Date Expired (Optional)"
                value={formData.dateExpired}
                onChange={(e) => setFormData({ ...formData, dateExpired: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty if certification is still active"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the certification and its focus areas..."
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Active (available for assignment)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowAddDialog(false);
              setShowEditDialog(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={addMutation.isLoading || updateMutation.isLoading}
            startIcon={<SaveIcon />}
          >
            {addMutation.isLoading || updateMutation.isLoading ? 'Saving...' : 'Save Certification'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={showViewDialog}
        onClose={() => setShowViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Certification Details</Typography>
            <IconButton onClick={() => setShowViewDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCertification && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h5" gutterBottom>
                  {selectedCertification.fullName}
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  {selectedCertification.description}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">Short Name</Typography>
                  <Typography variant="body1">{selectedCertification.shortName}</Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">Version</Typography>
                  <Typography variant="body1">{selectedCertification.version}</Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">Vendor</Typography>
                  <Typography variant="body1">{selectedCertification.vendor}</Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">Level</Typography>
                  <Chip
                    label={selectedCertification.level}
                    sx={{
                      bgcolor: getLevelColor(selectedCertification.level || 'ASSOCIATE'),
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">Points Value</Typography>
                  <Typography variant="body1">{selectedCertification.pointsValue}</Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">Validity</Typography>
                  <Typography variant="body1">{selectedCertification.validityMonths} months</Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">Date Introduced</Typography>
                  <Typography variant="body1">{safeFormatDate(selectedCertification.dateIntroduced)}</Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip
                    icon={selectedCertification.isActive ? <ActiveIcon /> : <InactiveIcon />}
                    label={selectedCertification.isActive ? 'Active' : 'Inactive'}
                    color={selectedCertification.isActive ? 'success' : 'default'}
                  />
                </Stack>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewDialog(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowViewDialog(false);
              if (selectedCertification) handleEdit(selectedCertification);
            }}
            startIcon={<EditIcon />}
          >
            Edit Certification
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          {selectedCertification && (
            <Alert severity="warning">
              <Typography variant="subtitle1" gutterBottom>
                Are you sure you want to delete this certification?
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {selectedCertification.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This action cannot be undone. The certification will be permanently removed from the system.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDelete}
            disabled={deleteMutation.isLoading}
          >
            {deleteMutation.isLoading ? 'Deleting...' : 'Delete Certification'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Helper function for level colors
const getLevelColor = (level: string) => {
  switch (level) {
    case 'ENTRY': return '#4caf50';
    case 'ASSOCIATE': return '#2196f3';
    case 'PROFESSIONAL': return '#ff9800';
    case 'EXPERT': return '#f44336';
    default: return '#9e9e9e';
  }
};

export default CertificationManagement;