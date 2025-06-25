import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
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
  Autocomplete,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Divider,
  Stack,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  EmojiEvents as TrophyIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { 
  getAllBounties, 
  createBounty, 
  formatCurrency,
  calculateDaysRemaining,
  isDeadlinePassed,
  type Bounty,
  type BountyCertification
} from '../../../services/bountyApi';
import { certificationMasterApi } from '../../../services/api';

interface BountyFormData {
  title: string;
  description: string;
  certifications: BountyCertification[];
  bountyAmount: number;
  baseBonusAmount: number;
  deadline: Date | null;
  maxClaims: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  requirements: string[];
  tags: string[];
}

const initialFormData: BountyFormData = {
  title: '',
  description: '',
  certifications: [],
  bountyAmount: 0,
  baseBonusAmount: 0,
  deadline: null,
  maxClaims: 1,
  priority: 'MEDIUM',
  requirements: [],
  tags: []
};

const BountyManagement: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const [formData, setFormData] = useState<BountyFormData>(initialFormData);
  const [newRequirement, setNewRequirement] = useState('');
  const [newTag, setNewTag] = useState('');
  const queryClient = useQueryClient();

  // Fetch bounties and claims
  const { data: bountyData, isLoading, error } = useQuery(
    'admin-bounties',
    getAllBounties,
    {
      refetchOnWindowFocus: false,
    }
  );

  // Fetch master certifications for selection
  const { data: masterCerts } = useQuery(
    'master-certifications',
    () => certificationMasterApi.getCertifications(),
    {
      refetchOnWindowFocus: false,
    }
  );

  // Create bounty mutation
  const createBountyMutation = useMutation(createBounty, {
    onSuccess: () => {
      queryClient.invalidateQueries('admin-bounties');
      setCreateDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: (error: any) => {
      console.error('Failed to create bounty:', error);
    }
  });

  const handleCreateBounty = () => {
    setFormData(initialFormData);
    setCreateDialogOpen(true);
  };

  const handleEditBounty = (bounty: Bounty) => {
    setSelectedBounty(bounty);
    setFormData({
      title: bounty.title,
      description: bounty.description,
      certifications: bounty.certifications,
      bountyAmount: bounty.bountyAmount,
      baseBonusAmount: bounty.baseBonusAmount,
      deadline: new Date(bounty.deadline),
      maxClaims: bounty.maxClaims,
      priority: bounty.priority,
      requirements: bounty.requirements,
      tags: bounty.tags
    });
    setEditDialogOpen(true);
  };

  const handleViewBounty = (bounty: Bounty) => {
    setSelectedBounty(bounty);
    setViewDialogOpen(true);
  };

  const handleSubmitBounty = () => {
    if (!formData.deadline) return;

    const bountyData = {
      ...formData,
      deadline: formData.deadline.toISOString().split('T')[0],
      totalReward: formData.bountyAmount + formData.baseBonusAmount,
      status: 'ACTIVE' as const,
      currentClaims: 0,
      claimedBy: [] as string[],
      createdBy: 'Admin',
      createdDate: new Date().toISOString().split('T')[0]
    };

    createBountyMutation.mutate(bountyData);
  };

  const handleAddRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }));
      setNewRequirement('');
    }
  };

  const handleRemoveRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (bounty: Bounty) => {
    if (isDeadlinePassed(bounty.deadline)) return 'error';
    if (bounty.currentClaims >= bounty.maxClaims) return 'warning';
    return 'success';
  };

  const getStatusText = (bounty: Bounty) => {
    if (isDeadlinePassed(bounty.deadline)) return 'EXPIRED';
    if (bounty.currentClaims >= bounty.maxClaims) return 'FULLY CLAIMED';
    return 'ACTIVE';
  };

  if (isLoading) {
    return (
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>Loading bounty management...</Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Alert severity="error">
          Failed to load bounty data. Please try again later.
        </Alert>
      </Box>
    );
  }

  const bounties = bountyData?.bounties || [];
  const claims = bountyData?.claims || [];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <TrophyIcon sx={{ fontSize: 40, color: '#ffd700' }} />
              Bounty Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create and manage certification bounties and spiffs
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateBounty}
            size="large"
          >
            Create Bounty
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TrophyIcon sx={{ fontSize: 40, color: '#ffd700' }} />
                  <Box>
                    <Typography variant="h4">{bounties.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Bounties
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ScheduleIcon sx={{ fontSize: 40, color: '#2e7d32' }} />
                  <Box>
                    <Typography variant="h4">
                      {bounties.filter(b => b.status === 'ACTIVE' && !isDeadlinePassed(b.deadline)).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Bounties
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <PeopleIcon sx={{ fontSize: 40, color: '#1976d2' }} />
                  <Box>
                    <Typography variant="h4">{claims.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Claims
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <MoneyIcon sx={{ fontSize: 40, color: '#f57c00' }} />
                  <Box>
                    <Typography variant="h4">
                      {formatCurrency(bounties.reduce((sum, b) => sum + (b.totalReward * b.currentClaims), 0))}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Paid Out
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Bounties Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              All Bounties
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Reward</TableCell>
                    <TableCell>Claims</TableCell>
                    <TableCell>Deadline</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bounties.map((bounty) => (
                    <TableRow key={bounty.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">{bounty.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {bounty.certifications.length} certification(s)
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={bounty.priority} 
                          color={getPriorityColor(bounty.priority) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {formatCurrency(bounty.totalReward)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(bounty.bountyAmount)} spiff + {formatCurrency(bounty.baseBonusAmount)} base
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {bounty.currentClaims}/{bounty.maxClaims}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(bounty.currentClaims / bounty.maxClaims) * 100}
                          sx={{ mt: 0.5, height: 4 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {new Date(bounty.deadline).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {calculateDaysRemaining(bounty.deadline)} days left
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusText(bounty)} 
                          color={getStatusColor(bounty)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => handleViewBounty(bounty)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Bounty">
                            <IconButton size="small" onClick={() => handleEditBounty(bounty)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Bounty">
                            <IconButton size="small" color="error">
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Create/Edit Bounty Dialog */}
        <Dialog
          open={createDialogOpen || editDialogOpen}
          onClose={() => {
            setCreateDialogOpen(false);
            setEditDialogOpen(false);
            setFormData(initialFormData);
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {createDialogOpen ? 'Create New Bounty' : 'Edit Bounty'}
            </Typography>
            <IconButton onClick={() => {
              setCreateDialogOpen(false);
              setEditDialogOpen(false);
            }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              {/* Basic Information */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Basic Information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Bounty Title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., AWS Solutions Architect Challenge"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the bounty and its purpose..."
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel>Priority</InputLabel>
                      <Select
                        value={formData.priority}
                        label="Priority"
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                      >
                        <MenuItem value="HIGH">High</MenuItem>
                        <MenuItem value="MEDIUM">Medium</MenuItem>
                        <MenuItem value="LOW">Low</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <DatePicker
                      label="Deadline"
                      value={formData.deadline}
                      onChange={(date) => setFormData(prev => ({ ...prev, deadline: date }))}
                      slotProps={{
                        textField: {
                          fullWidth: true
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Max Claims"
                      value={formData.maxClaims}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxClaims: parseInt(e.target.value) || 1 }))}
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Reward Information */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Reward Information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Bounty Amount (Spiff)"
                      value={formData.bountyAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, bountyAmount: parseFloat(e.target.value) || 0 }))}
                      InputProps={{
                        startAdornment: '$',
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Base Bonus Amount"
                      value={formData.baseBonusAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, baseBonusAmount: parseFloat(e.target.value) || 0 }))}
                      InputProps={{
                        startAdornment: '$',
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Alert severity="info">
                      <Typography variant="body2">
                        <strong>Total Reward: {formatCurrency(formData.bountyAmount + formData.baseBonusAmount)}</strong>
                        <br />
                        Bounty Amount is the extra spiff on top of the regular certification bonus.
                      </Typography>
                    </Alert>
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Certifications */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Required Certifications</Typography>
                <Autocomplete
                  multiple
                  options={masterCerts?.data?.certifications || []}
                  getOptionLabel={(option: any) => `${option.fullName} (${option.vendor})`}
                  value={formData.certifications}
                  onChange={(_, newValue) => {
                    const mappedCerts = newValue.map((cert: any) => ({
                      id: cert.id,
                      name: cert.fullName,
                      vendor: cert.vendor,
                      level: cert.level,
                      pointsValue: cert.pointsValue
                    }));
                    setFormData(prev => ({ ...prev, certifications: mappedCerts }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Certifications"
                      placeholder="Choose certifications required for this bounty"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={`${option.name} (${option.vendor})`}
                        {...getTagProps({ index })}
                        key={option.id}
                      />
                    ))
                  }
                />
              </Box>

              <Divider />

              {/* Requirements */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Requirements & Rules</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Add Requirement"
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    placeholder="e.g., Must complete certification within deadline"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddRequirement()}
                  />
                  <Button variant="outlined" onClick={handleAddRequirement}>
                    Add
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.requirements.map((req, index) => (
                    <Chip
                      key={index}
                      label={req}
                      onDelete={() => handleRemoveRequirement(index)}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>

              <Divider />

              {/* Tags */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Tags</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Add Tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="e.g., AWS, Security, High Priority"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button variant="outlined" onClick={handleAddTag}>
                    Add
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      onDelete={() => handleRemoveTag(index)}
                      variant="outlined"
                      color="primary"
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setCreateDialogOpen(false);
              setEditDialogOpen(false);
            }}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSubmitBounty}
              disabled={createBountyMutation.isLoading || !formData.title || !formData.deadline || formData.certifications.length === 0}
            >
              {createBountyMutation.isLoading ? 'Creating...' : (createDialogOpen ? 'Create Bounty' : 'Update Bounty')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Bounty Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Bounty Details</Typography>
            <IconButton onClick={() => setViewDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {selectedBounty && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h5" sx={{ mb: 2 }}>{selectedBounty.title}</Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>{selectedBounty.description}</Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="h6" sx={{ mb: 1 }}>Reward Information</Typography>
                    <Typography>Total Reward: <strong>{formatCurrency(selectedBounty.totalReward)}</strong></Typography>
                    <Typography>Bounty Amount: {formatCurrency(selectedBounty.bountyAmount)}</Typography>
                    <Typography>Base Bonus: {formatCurrency(selectedBounty.baseBonusAmount)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="h6" sx={{ mb: 1 }}>Status Information</Typography>
                    <Typography>Priority: <Chip label={selectedBounty.priority} color={getPriorityColor(selectedBounty.priority) as any} size="small" /></Typography>
                    <Typography>Claims: {selectedBounty.currentClaims}/{selectedBounty.maxClaims}</Typography>
                    <Typography>Deadline: {new Date(selectedBounty.deadline).toLocaleDateString()}</Typography>
                    <Typography>Days Remaining: {calculateDaysRemaining(selectedBounty.deadline)}</Typography>
                  </Grid>
                </Grid>

                <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Required Certifications</Typography>
                {selectedBounty.certifications.map((cert, index) => (
                  <Chip key={index} label={`${cert.name} (${cert.vendor})`} sx={{ mr: 1, mb: 1 }} />
                ))}

                <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Requirements</Typography>
                {selectedBounty.requirements.map((req, index) => (
                  <Typography key={index} variant="body2">• {req}</Typography>
                ))}

                <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Tags</Typography>
                {selectedBounty.tags.map((tag, index) => (
                  <Chip key={index} label={tag} variant="outlined" sx={{ mr: 1, mb: 1 }} />
                ))}
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default BountyManagement;