import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Chip,
  Alert,
  Paper,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Stack,
  IconButton,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack,
  CloudUpload,
  CheckCircle,
  Schedule,
  Error as ErrorIcon,
  Info as InfoIcon,
  WorkspacePremium,
  EmojiEvents,
  Close,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { certificationApi, certificationMasterApi, vendorApi } from '@/services/api';
import { Certification, Vendor, MasterCertification, ValidationResult } from '@/types';
import { safeFormatDate } from '@/utils/dateUtils';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface SubmissionData {
  certificationId: string;
  obtainedDate: string;
  certificateNumber: string;
  verificationUrl: string;
  notes: string;
  certificateFile: File | null;
}

interface SearchState {
  results: any[];
  isLoading: boolean;
  error: string | null;
  lastQuery: string;
}

interface SearchCache {
  [key: string]: {
    results: any[];
    timestamp: number;
  };
}

// Stable search component that never re-renders
const StableSearchInput: React.FC<{
  onSearch: (query: string) => void;
  placeholder?: string;
}> = ({ onSearch, placeholder }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<number>();
  const lastQueryRef = useRef<string>('');

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Immediate update for empty string (clearing)
    if (value === '') {
      lastQueryRef.current = value;
      onSearch(value);
      return;
    }

    // Debounced update for non-empty strings
    timeoutRef.current = setTimeout(() => {
      if (value !== lastQueryRef.current) {
        lastQueryRef.current = value;
        onSearch(value);
      }
    }, 300);
  }, [onSearch]);

  return (
    <TextField
      fullWidth
      size="small"
      label="Search certifications"
      placeholder={placeholder || "Search by name or vendor..."}
      onChange={handleInputChange}
      inputRef={inputRef}
      InputProps={{
        autoComplete: 'off',
      }}
    />
  );
};

const AddCertification: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Refs for stable search implementation
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchCacheRef = useRef<SearchCache>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Form state
  const [formData, setFormData] = useState<SubmissionData>({
    certificationId: '',
    obtainedDate: safeFormatDate(new Date().toISOString(), 'yyyy-MM-dd', ''),
    certificateNumber: '',
    verificationUrl: '',
    notes: '',
    certificateFile: null,
  });

  // UI state
  const [selectedCertification, setSelectedCertification] = useState<Certification | null>(null);
  const [filterVendor, setFilterVendor] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // New stable search state
  const [searchState, setSearchState] = useState<SearchState>({
    results: [],
    isLoading: false,
    error: null,
    lastQuery: ''
  });

  // Fetch vendors
  const { data: vendorsData } = useQuery(
    'vendors',
    () => vendorApi.getVendors(),
    { refetchOnWindowFocus: false }
  );

  // Fetch user's existing certifications to identify assigned ones
  const { data: userCertifications } = useQuery(
    'userCertifications',
    () => certificationApi.getUserCertifications(),
    { refetchOnWindowFocus: false }
  );

  // Extract manager-assigned and pending certifications from user's existing certifications
  const managerAssignedCerts = useMemo(() => {
    const userCerts = (userCertifications?.data as any)?.certifications || [];
    return userCerts
      .filter((cert: any) => cert.status === 'ADMIN_ASSIGNED' || cert.status === 'PENDING_APPROVAL')
      .map((cert: any) => ({
        id: cert.certification.id,
        name: cert.certification.name,
        vendor: cert.certification.vendor,
        level: cert.certification.level,
        pointsValue: cert.certification.pointsValue,
        isBonusEligible: cert.certification.isBonusEligible,
        bonusAmount: cert.certification.bonusAmount,
        validityMonths: cert.certification.validityMonths,
        isManagerAssigned: true,
        status: cert.status, // Track the actual status
        assignedDate: cert.assignmentDetails?.assignedDate || cert.createdAt,
        targetDate: cert.assignmentDetails?.deadline,
        assignedBy: cert.assignmentDetails?.assignedByName || 'Admin',
        assignmentNotes: cert.assignmentDetails?.adminNotes,
        userCertificationId: cert.id, // Track the user certification ID
        isPendingApproval: cert.status === 'PENDING_APPROVAL',
      }));
  }, [userCertifications]);

  // Get list of certification IDs that user already has (exclude only ACTIVE, EXPIRED, etc., not ADMIN_ASSIGNED or PENDING_APPROVAL)
  const userCertificationIds = useMemo(() => {
    const userCerts = (userCertifications?.data as any)?.certifications || [];
    return new Set(
      userCerts
        .filter((cert: any) =>
          cert.status === 'ACTIVE' ||
          cert.status === 'EXPIRING_SOON' ||
          cert.status === 'EXPIRED' ||
          cert.status === 'INACTIVE' ||
          cert.status === 'REJECTED'
        )
        .map((cert: any) => cert.certification.id)
    );
  }, [userCertifications]);

  // COMPREHENSIVE: Get list of certification IDs that have pending submissions or are unavailable
  const pendingSubmissionIds = useMemo(() => {
    const userCerts = (userCertifications?.data as any)?.certifications || [];
    const pendingIds = new Set<string>();
    
    userCerts.forEach((cert: any) => {
      // Add certifications that are pending approval
      if (cert.status === 'PENDING_APPROVAL') {
        pendingIds.add(cert.certification.id);
        console.log('🚫 Found pending certification:', cert.certification.name, 'ID:', cert.certification.id);
      }
      
      // Add certifications that are already active (prevent duplicates)
      if (cert.status === 'ACTIVE' || cert.status === 'EXPIRING_SOON') {
        pendingIds.add(cert.certification.id);
        console.log('✅ Found active certification (blocking duplicates):', cert.certification.name, 'ID:', cert.certification.id);
      }
    });
    
    console.log('🔒 Total blocked certification IDs:', Array.from(pendingIds));
    return pendingIds;
  }, [userCertifications]);

  // Submit certification mutation (unchanged)
  const submitMutation = useMutation(
    (data: FormData) => certificationApi.addCertification(data),
    {
      onSuccess: () => {
        setSubmitProgress(100);
        setShowSuccessDialog(true);
        queryClient.invalidateQueries(['userCertifications']);
      },
      onError: (error: any) => {
        console.error('Submission error:', error);
        setErrors({ submit: error.response?.data?.error?.message || 'Failed to submit certification' });
      }
    }
  );

  const vendors = (vendorsData?.data as any)?.vendors || [];

  // New optimized search function with caching and cancellation
  const performSearch = useCallback(async (query: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create cache key including filters
    const cacheKey = `${query}|${filterVendor}|${filterLevel}`;
    
    // Check cache first
    const cached = searchCacheRef.current[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setSearchState(prev => ({
        ...prev,
        results: cached.results,
        isLoading: false,
        error: null,
        lastQuery: query
      }));
      return;
    }

    // Set loading state
    setSearchState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      lastQuery: query
    }));

    try {
      // Create new abort controller
      abortControllerRef.current = new AbortController();

      // Use master catalog endpoint for better integration
      const response = await certificationMasterApi.getMasterCatalog(
        { vendor: filterVendor, level: filterLevel, search: query }
      );

      const certifications = (response?.data as any)?.certifications || [];
      
      // Filter out certifications the user already has (ACTIVE/EXPIRED/etc)
      const availableCertifications = certifications.filter((cert: Certification) =>
        !userCertificationIds.has(cert.id)
      );
      
      // FIXED: Mark certifications with pending submissions as unavailable
      const certsWithPendingStatus = availableCertifications.map((cert: Certification) => ({
        ...cert,
        hasPendingSubmission: pendingSubmissionIds.has(cert.id),
        isUnavailable: pendingSubmissionIds.has(cert.id)
      }));
      
      // Combine with manager-assigned certs (show these even if already assigned)
      const allResults = [
        ...managerAssignedCerts,
        ...certsWithPendingStatus.filter((cert: any) =>
          !managerAssignedCerts.find((mc: any) => mc.id === cert.id)
        )
      ];

      // Cache the results
      searchCacheRef.current[cacheKey] = {
        results: allResults,
        timestamp: Date.now()
      };

      // Update state
      setSearchState(prev => ({
        ...prev,
        results: allResults,
        isLoading: false,
        error: null,
        lastQuery: query
      }));

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setSearchState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to search certifications',
          lastQuery: query
        }));
      }
    }
  }, [filterVendor, filterLevel]);

  // Handle search with empty query (show all)
  const handleSearch = useCallback((query: string) => {
    if (query === '') {
      // For empty query, show manager-assigned certs immediately
      const allResults = [...managerAssignedCerts];
      setSearchState(prev => ({
        ...prev,
        results: allResults,
        isLoading: false,
        error: null,
        lastQuery: query
      }));
    } else {
      performSearch(query);
    }
  }, [performSearch, managerAssignedCerts]);

  // Initialize with empty search on mount
  useEffect(() => {
    handleSearch('');
  }, [handleSearch, managerAssignedCerts]);

  // Update search when filters change
  useEffect(() => {
    if (searchState.lastQuery !== '') {
      performSearch(searchState.lastQuery);
    }
  }, [filterVendor, filterLevel, performSearch, searchState.lastQuery]);

  // Client-side filtering for real-time results
  const filteredResults = useMemo(() => {
    if (!searchState.results.length) return { managerAssigned: [], regular: [] };

    const query = searchState.lastQuery.toLowerCase();
    
    const filtered = searchState.results.filter((cert: any) => {
      const matchesSearch = !query ||
        cert.name.toLowerCase().includes(query) ||
        cert.vendor.name.toLowerCase().includes(query);
      
      const matchesVendor = !filterVendor || cert.vendor.name === filterVendor;
      const matchesLevel = !filterLevel || cert.level === filterLevel;

      return matchesSearch && matchesVendor && matchesLevel;
    });

    return {
      managerAssigned: filtered.filter((cert: any) => cert.isManagerAssigned),
      regular: filtered.filter((cert: any) => !cert.isManagerAssigned)
    };
  }, [searchState.results, searchState.lastQuery, filterVendor, filterLevel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Calculate expiration date when obtained date or certification changes
  const calculateExpirationDate = (obtainedDate: string, validityMonths: number) => {
    if (!obtainedDate) return '';
    
    // Validate inputs
    if (!validityMonths || typeof validityMonths !== 'number' || validityMonths <= 0) {
      console.warn('Invalid validityMonths:', validityMonths);
      return '';
    }
    
    try {
      const obtained = new Date(obtainedDate);
      
      // Check if obtained date is valid
      if (isNaN(obtained.getTime())) {
        console.warn('Invalid obtainedDate:', obtainedDate);
        return '';
      }
      
      const expiration = new Date(obtained);
      expiration.setMonth(expiration.getMonth() + validityMonths);
      
      // Check if calculated expiration date is valid
      if (isNaN(expiration.getTime())) {
        console.warn('Invalid calculated expiration date');
        return '';
      }
      
      return safeFormatDate(expiration.toISOString(), 'yyyy-MM-dd', '');
    } catch (error) {
      console.error('Error calculating expiration date:', error);
      return '';
    }
  };

  // Memoized handlers to prevent unnecessary re-renders
  const handleCertificationSelect = useCallback((certification: any) => {
    console.log('🔍 Attempting to select certification:', certification.name, 'ID:', certification.id);
    console.log('🔍 Certification status:', {
      isPendingApproval: certification.isPendingApproval,
      hasPendingSubmission: certification.hasPendingSubmission,
      isUnavailable: certification.isUnavailable,
      isManagerAssigned: certification.isManagerAssigned
    });
    
    // Prevent selection if certification is pending approval (manager assigned)
    if (certification.isPendingApproval) {
      console.log('❌ BLOCKED: Certification is pending approval');
      setErrors({
        certification: 'This certification is already submitted for approval and cannot be resubmitted until the current submission is processed.'
      });
      return;
    }
    
    // COMPREHENSIVE: Prevent selection if certification has pending submission or is already owned
    if (certification.hasPendingSubmission || certification.isUnavailable) {
      console.log('❌ BLOCKED: Certification has pending submission or is unavailable');
      setErrors({
        certification: 'This certification is unavailable for submission. You may already have an active certification of this type or a pending submission.'
      });
      return;
    }
    
    // Additional check: Block if certification ID is in our comprehensive blocked list
    if (pendingSubmissionIds.has(certification.id)) {
      console.log('❌ BLOCKED: Certification ID is in blocked list');
      setErrors({
        certification: 'This certification cannot be selected. You may already have this certification or a pending submission for it.'
      });
      return;
    }
    
    console.log('✅ Certification selection allowed');
    setSelectedCertification(certification);
    setFormData(prev => ({
      ...prev,
      certificationId: certification.id
    }));
    setErrors({});
  }, [pendingSubmissionIds]);

  const handleInputChange = useCallback((field: keyof SubmissionData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);


  // Stable filter handlers
  const handleVendorFilterChange = useCallback((event: any) => {
    setFilterVendor(event.target.value);
  }, []);

  const handleLevelFilterChange = useCallback((event: any) => {
    setFilterLevel(event.target.value);
  }, []);

  const handleFileUpload = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, file: 'File size must be less than 10MB' }));
      return;
    }
    
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, file: 'Only PDF, JPEG, and PNG files are allowed' }));
      return;
    }

    setFormData(prev => ({ ...prev, certificateFile: file }));
    setErrors(prev => ({ ...prev, file: '' }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedCertification) newErrors.certification = 'Please select a certification';
    if (!formData.obtainedDate) newErrors.obtainedDate = 'Obtained date is required';
    if (!formData.certificateNumber.trim()) newErrors.certificateNumber = 'Certificate number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const submitData = new FormData();
    submitData.append('certificationId', formData.certificationId);
    submitData.append('obtainedDate', formData.obtainedDate);
    submitData.append('certificateNumber', formData.certificateNumber);
    if (formData.verificationUrl) submitData.append('verificationUrl', formData.verificationUrl);
    if (formData.notes) submitData.append('notes', formData.notes);
    if (formData.certificateFile) submitData.append('certificateFile', formData.certificateFile);

    // Simulate progress
    setSubmitProgress(0);
    const interval = setInterval(() => {
      setSubmitProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    submitMutation.mutate(submitData);
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


  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/certifications')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Add New Certification
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Certification Selection */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Certification
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Choose from available certifications or submit your completed manager-assigned certifications for approval
              </Typography>

              {/* Search and Filters */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <StableSearchInput
                    onSearch={handleSearch}
                    placeholder="Search by name or vendor..."
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Vendor</InputLabel>
                    <Select
                      value={filterVendor}
                      onChange={handleVendorFilterChange}
                      label="Vendor"
                    >
                      <MenuItem value="">All Vendors</MenuItem>
                      {vendors.map((vendor: Vendor) => (
                        <MenuItem key={vendor.id} value={vendor.name}>
                          {vendor.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Level</InputLabel>
                    <Select
                      value={filterLevel}
                      onChange={handleLevelFilterChange}
                      label="Level"
                    >
                      <MenuItem value="">All Levels</MenuItem>
                      <MenuItem value="FOUNDATION">Foundation</MenuItem>
                      <MenuItem value="ASSOCIATE">Associate</MenuItem>
                      <MenuItem value="PROFESSIONAL">Professional</MenuItem>
                      <MenuItem value="EXPERT">Expert</MenuItem>
                      <MenuItem value="SPECIALTY">Specialty</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Loading State */}
              {searchState.isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}

              {/* Error State */}
              {searchState.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {searchState.error}
                </Alert>
              )}

              {/* Manager Assigned Certifications */}
              {!searchState.isLoading && !searchState.error && filteredResults.managerAssigned.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <EmojiEvents sx={{ mr: 1, color: 'warning.main' }} />
                    Manager Assigned & Pending Certifications
                  </Typography>
                  <Grid container spacing={2}>
                    {filteredResults.managerAssigned.map((cert: any) => (
                      <Grid item xs={12} md={6} key={cert.id}>
                        <Paper
                          sx={{
                            p: 2,
                            cursor: cert.isPendingApproval ? 'not-allowed' : 'pointer',
                            border: selectedCertification?.id === cert.id ? '2px solid' : '1px solid',
                            borderColor: selectedCertification?.id === cert.id ? 'primary.main' : 'divider',
                            bgcolor: cert.isPendingApproval
                              ? 'grey.900'
                              : selectedCertification?.id === cert.id
                                ? 'primary.dark'
                                : 'grey.800',
                            opacity: cert.isPendingApproval ? 0.6 : 1,
                            '&:hover': cert.isPendingApproval ? {} : {
                              borderColor: 'primary.main',
                              bgcolor: selectedCertification?.id === cert.id ? 'primary.dark' : 'grey.700'
                            },
                            position: 'relative',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '4px',
                              background: cert.isPendingApproval
                                ? 'linear-gradient(90deg, #9e9e9e, #757575)'
                                : 'linear-gradient(90deg, #ff9800, #ffc107)',
                              borderRadius: '4px 4px 0 0'
                            }
                          }}
                          onClick={() => handleCertificationSelect(cert)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                            <Avatar
                              sx={{ bgcolor: 'warning.main', mr: 2, width: 40, height: 40 }}
                              src={cert.vendor.logoUrl}
                            >
                              {cert.vendor.name[0]}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {cert.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {cert.vendor.name}
                              </Typography>
                              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <Chip
                                  label={cert.isPendingApproval ? "Pending Approval" : "Manager Assigned"}
                                  size="small"
                                  color={cert.isPendingApproval ? "default" : "warning"}
                                  sx={cert.isPendingApproval ? {
                                    bgcolor: 'grey.600',
                                    color: 'grey.300',
                                    '& .MuiChip-icon': { color: 'grey.300' }
                                  } : {}}
                                  icon={cert.isPendingApproval ? <Schedule /> : undefined}
                                />
                                <Chip
                                  label={cert.level}
                                  size="small"
                                  sx={{
                                    bgcolor: cert.isPendingApproval ? 'grey.600' : getLevelColor(cert.level),
                                    color: cert.isPendingApproval ? 'grey.300' : 'white'
                                  }}
                                />
                                {cert.isBonusEligible && cert.bonusAmount && cert.bonusAmount > 0 && (
                                  <Chip
                                    label={`$${cert.bonusAmount} Bonus`}
                                    size="small"
                                    color={cert.isPendingApproval ? "default" : "secondary"}
                                    sx={cert.isPendingApproval ? {
                                      bgcolor: 'grey.600',
                                      color: 'grey.300'
                                    } : {}}
                                  />
                                )}
                              </Stack>
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                <strong>Assigned by:</strong> {cert.assignedBy} on {safeFormatDate(cert.assignedDate)}
                              </Typography>
                              {cert.targetDate && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  <strong>Target:</strong> {safeFormatDate(cert.targetDate)}
                                </Typography>
                              )}
                              {cert.assignmentNotes && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  <strong>Notes:</strong> {cert.assignmentNotes}
                                </Typography>
                              )}
                              {cert.isPendingApproval ? (
                                <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
                                  <Typography variant="caption">
                                    <strong>Status:</strong> Already submitted for approval. You cannot resubmit this certification until the current submission is processed by your manager.
                                  </Typography>
                                </Alert>
                              ) : (
                                <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
                                  <Typography variant="caption">
                                    <strong>Priority:</strong> Click to submit your completed certification for manager approval.
                                  </Typography>
                                </Alert>
                              )}
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                  <Divider sx={{ my: 3 }} />
                </Box>
              )}

              {/* Regular Certifications */}
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <WorkspacePremium sx={{ mr: 1, color: 'primary.main' }} />
                Available Certifications
              </Typography>
              
              {!searchState.isLoading && !searchState.error && filteredResults.regular.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No certifications found. Try adjusting your search criteria.
                </Alert>
              ) : (
                !searchState.isLoading && !searchState.error && (
                  <Grid container spacing={2}>
                    {filteredResults.regular.map((cert: any) => (
                    <Grid item xs={12} md={6} key={cert.id}>
                      <Paper
                        sx={{
                          p: 2,
                          cursor: cert.hasPendingSubmission ? 'not-allowed' : 'pointer',
                          border: selectedCertification?.id === cert.id ? '2px solid' : '1px solid',
                          borderColor: selectedCertification?.id === cert.id ? 'primary.main' : 'divider',
                          bgcolor: cert.hasPendingSubmission
                            ? 'grey.900'
                            : selectedCertification?.id === cert.id
                              ? 'primary.50'
                              : 'transparent',
                          opacity: cert.hasPendingSubmission ? 0.6 : 1,
                          '&:hover': cert.hasPendingSubmission ? {} : { borderColor: 'primary.main' },
                          position: 'relative',
                          '&::before': cert.hasPendingSubmission ? {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: 'linear-gradient(90deg, #9e9e9e, #757575)',
                            borderRadius: '4px 4px 0 0'
                          } : {}
                        }}
                        onClick={() => handleCertificationSelect(cert)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                          <Avatar
                            sx={{
                              bgcolor: cert.hasPendingSubmission ? 'grey.600' : 'primary.main',
                              mr: 2,
                              width: 40,
                              height: 40
                            }}
                            src={cert.vendor.logoUrl}
                          >
                            {cert.vendor.name[0]}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold" color={cert.hasPendingSubmission ? 'grey.500' : 'inherit'}>
                              {cert.name}
                            </Typography>
                            <Typography variant="body2" color={cert.hasPendingSubmission ? 'grey.600' : 'text.secondary'}>
                              {cert.vendor.name}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              {cert.hasPendingSubmission && (
                                <Chip
                                  label="Pending Submission"
                                  size="small"
                                  sx={{
                                    bgcolor: 'grey.600',
                                    color: 'grey.300',
                                    '& .MuiChip-icon': { color: 'grey.300' }
                                  }}
                                  icon={<Schedule />}
                                />
                              )}
                              <Chip
                                label={cert.level}
                                size="small"
                                sx={{
                                  bgcolor: cert.hasPendingSubmission ? 'grey.600' : getLevelColor(cert.level),
                                  color: cert.hasPendingSubmission ? 'grey.300' : 'white'
                                }}
                              />
                              <Chip
                                label={`${cert.pointsValue} points`}
                                size="small"
                                variant="outlined"
                                sx={cert.hasPendingSubmission ? {
                                  borderColor: 'grey.600',
                                  color: 'grey.500'
                                } : {}}
                              />
                              {cert.isBonusEligible && (
                                <Chip
                                  label="Bonus Eligible"
                                  size="small"
                                  color={cert.hasPendingSubmission ? "default" : "secondary"}
                                  sx={cert.hasPendingSubmission ? {
                                    bgcolor: 'grey.600',
                                    color: 'grey.300'
                                  } : {}}
                                />
                              )}
                            </Stack>
                            {cert.hasPendingSubmission && (
                              <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
                                <Typography variant="caption">
                                  <strong>Unavailable:</strong> This certification has a pending submission. Wait for processing before resubmitting.
                                </Typography>
                              </Alert>
                            )}
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                )
              )}

              {errors.certification && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errors.certification}
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Certification Details Form */}
          {selectedCertification && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Certification Details
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Provide the details of your certification
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Obtained Date"
                      type="date"
                      value={formData.obtainedDate}
                      onChange={(e) => handleInputChange('obtainedDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.obtainedDate}
                      helperText={errors.obtainedDate}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Expiration Date"
                      type="date"
                      value={selectedCertification ?
                        calculateExpirationDate(formData.obtainedDate, selectedCertification.validityMonths) :
                        ''
                      }
                      InputLabelProps={{ shrink: true }}
                      disabled
                      helperText="Automatically calculated based on certification validity"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Certificate Number"
                      value={formData.certificateNumber}
                      onChange={(e) => handleInputChange('certificateNumber', e.target.value)}
                      placeholder="Enter your certificate number"
                      error={!!errors.certificateNumber}
                      helperText={errors.certificateNumber}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Verification URL (Optional)"
                      value={formData.verificationUrl}
                      onChange={(e) => handleInputChange('verificationUrl', e.target.value)}
                      placeholder="https://verify.example.com/certificate"
                      type="url"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Notes (Optional)"
                      multiline
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Any additional notes about this certification..."
                    />
                  </Grid>
                </Grid>

                {/* File Upload */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Certificate File (Optional)
                  </Typography>
                  <Paper
                    sx={{
                      p: 3,
                      border: '2px dashed',
                      borderColor: dragActive ? 'primary.main' : 'grey.300',
                      bgcolor: dragActive ? 'primary.50' : 'grey.50',
                      cursor: 'pointer',
                      textAlign: 'center',
                      '&:hover': { borderColor: 'primary.main' }
                    }}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                    <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      {formData.certificateFile ? formData.certificateFile.name : 'Upload Certificate'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Drag and drop your certificate file here, or click to browse
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Supported formats: PDF, JPG, PNG (Max 10MB)
                    </Typography>
                  </Paper>
                  {errors.file && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {errors.file}
                    </Alert>
                  )}
                </Box>

                {/* Submit Button */}
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/certifications')}
                    disabled={submitMutation.isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitMutation.isLoading}
                    startIcon={submitMutation.isLoading ? <CircularProgress size={20} /> : <AddIcon />}
                  >
                    {submitMutation.isLoading ? 'Submitting...' : 'Submit for Approval'}
                  </Button>
                </Box>

                {/* Progress Bar */}
                {submitMutation.isLoading && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress variant="determinate" value={submitProgress} />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Submitting certification... {submitProgress}%
                    </Typography>
                  </Box>
                )}

                {errors.submit && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {errors.submit}
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ position: 'sticky', top: 24 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Submission Process
              </Typography>
              
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <CheckCircle sx={{ color: 'success.main', mr: 2, mt: 0.5 }} />
                  <Box>
                    <Typography variant="subtitle2">Select Certification</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Choose from available certifications
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  {selectedCertification ? (
                    <CheckCircle sx={{ color: 'success.main', mr: 2, mt: 0.5 }} />
                  ) : (
                    <Schedule sx={{ color: 'warning.main', mr: 2, mt: 0.5 }} />
                  )}
                  <Box>
                    <Typography variant="subtitle2">Fill Details</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Provide certification information
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Schedule sx={{ color: 'text.secondary', mr: 2, mt: 0.5 }} />
                  <Box>
                    <Typography variant="subtitle2">Admin Review</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Certification submitted for approval
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Schedule sx={{ color: 'text.secondary', mr: 2, mt: 0.5 }} />
                  <Box>
                    <Typography variant="subtitle2">Active Status</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Appears in search results
                    </Typography>
                  </Box>
                </Box>
              </Stack>

              {selectedCertification && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" gutterBottom>
                    Selected Certification
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.800', border: '1px solid', borderColor: 'primary.main' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {selectedCertification.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {selectedCertification.vendor?.name || 'Unknown Vendor'}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      <Chip
                        label={selectedCertification.level}
                        size="small"
                        sx={{ bgcolor: getLevelColor(selectedCertification.level), color: 'white' }}
                      />
                      <Chip
                        label={`${selectedCertification.pointsValue} points`}
                        size="small"
                        variant="outlined"
                      />
                      {selectedCertification.isBonusEligible && (
                        <Chip
                          label="Bonus Eligible"
                          size="small"
                          color="secondary"
                        />
                      )}
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      <strong>Validity:</strong> {selectedCertification.validityMonths} months
                    </Typography>
                    {(selectedCertification as any).isManagerAssigned && (
                      <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                        <strong>Manager Assigned</strong> - Priority certification
                      </Typography>
                    )}
                  </Paper>
                </>
              )}

              <Divider sx={{ my: 3 }} />
              <Alert severity="info" icon={<InfoIcon />}>
                <Typography variant="body2">
                  Your certification will be reviewed by an administrator before being approved and appearing in search results.
                  {selectedCertification && (selectedCertification as any).isManagerAssigned && (
                    <>
                      <br /><br />
                      {(selectedCertification as any).isPendingApproval ? (
                        <><strong>Pending Approval:</strong> This certification is already submitted and waiting for manager review. You cannot resubmit it.</>
                      ) : (
                        <><strong>Manager Assigned:</strong> This certification was assigned to you by your manager. Submitting it will create a pending approval request.</>
                      )}
                    </>
                  )}
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5">
            Certification Submitted Successfully!
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" textAlign="center">
            Your certification has been submitted for admin approval.
            You'll receive a notification once it's been reviewed.
          </Typography>
          {selectedCertification && (
            <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.800', border: '1px solid', borderColor: 'success.main' }}>
              <Typography variant="subtitle2" fontWeight="bold">
                {selectedCertification.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedCertification.vendor?.name || 'Unknown Vendor'} • {selectedCertification.level}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            variant="contained"
            onClick={() => navigate('/certifications')}
            startIcon={<ArrowBack />}
          >
            Back to My Certifications
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddCertification;