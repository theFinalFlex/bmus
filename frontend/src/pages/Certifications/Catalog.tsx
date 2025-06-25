import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Button,
  Alert,
  Paper,
  IconButton,
  Stack,
  Divider,
  Badge,
  Tooltip,
  LinearProgress,
  InputAdornment,
} from '@mui/material';
import {
  Search,
  WorkspacePremium,
  FilterList,
  Clear,
  EmojiEvents,
  Schedule,
  Star,
  TrendingUp,
  LocalOffer,
  Business,
  Assignment,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { certificationMasterApi, vendorApi } from '@/services/api';
import { MasterCertification, MasterCatalogFilters, Vendor } from '@/types';
import { safeFormatDate } from '@/utils/dateUtils';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const CertificationCatalog: React.FC = () => {
  const [filters, setFilters] = useState<MasterCatalogFilters>({
    search: '',
    vendor: '',
    level: '',
    bonusEligible: undefined,
    isActive: true,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch master catalog
  const {
    data: catalogData,
    isLoading: catalogLoading,
    error: catalogError,
    refetch: refetchCatalog,
  } = useQuery(
    ['masterCatalog', filters],
    () => certificationMasterApi.getMasterCatalog(filters),
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch vendors for filtering
  const { data: vendorsData } = useQuery(
    'vendors',
    () => vendorApi.getVendors(),
    { refetchOnWindowFocus: false }
  );

  const certifications = (catalogData?.data as any)?.certifications || [];
  const vendors = (vendorsData?.data as any)?.vendors || [];

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof MasterCatalogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      vendor: '',
      level: '',
      bonusEligible: undefined,
      isActive: true,
    });
  }, []);

  // Get level color
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

  // Get difficulty icon
  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER': return '🟢';
      case 'INTERMEDIATE': return '🟡';
      case 'ADVANCED': return '🟠';
      case 'EXPERT': return '🔴';
      default: return '⚪';
    }
  };

  // Statistics
  const stats = useMemo(() => {
    return {
      total: certifications.length,
      bonusEligible: certifications.filter((cert: MasterCertification) => cert.isBonusEligible).length,
      vendors: new Set(certifications.map((cert: MasterCertification) => cert.vendor.name)).size,
      averagePoints: Math.round(
        certifications.reduce((sum: number, cert: MasterCertification) => sum + cert.pointsValue, 0) /
        (certifications.length || 1)
      ),
    };
  }, [certifications]);

  if (catalogLoading) {
    return <LoadingSpinner message="Loading certification catalog..." />;
  }

  if (catalogError) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Certification Catalog
        </Typography>
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load certification catalog. Please try again later.
          <Button onClick={() => refetchCatalog()} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">
            Master Certification Catalog
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Browse all available certifications from our master data system
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<FilterList />}
          onClick={() => setShowFilters(!showFilters)}
          color={showFilters ? 'primary' : 'inherit'}
        >
          {showFilters ? 'Hide' : 'Show'} Filters
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
              <WorkspacePremium color="primary" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{stats.total}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Certifications
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
              <EmojiEvents color="secondary" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{stats.bonusEligible}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Bonus Eligible
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
              <Business color="info" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{stats.vendors}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Vendors
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
              <TrendingUp color="success" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{stats.averagePoints}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Points
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      {showFilters && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Filters</Typography>
              <Button
                size="small"
                startIcon={<Clear />}
                onClick={clearFilters}
              >
                Clear All
              </Button>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Search"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search certifications..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Vendor</InputLabel>
                  <Select
                    value={filters.vendor || ''}
                    onChange={(e) => handleFilterChange('vendor', e.target.value)}
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
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Level</InputLabel>
                  <Select
                    value={filters.level || ''}
                    onChange={(e) => handleFilterChange('level', e.target.value)}
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
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Bonus</InputLabel>
                  <Select
                    value={filters.bonusEligible === undefined ? '' : filters.bonusEligible.toString()}
                    onChange={(e) => handleFilterChange('bonusEligible',
                      e.target.value === '' ? undefined : e.target.value === 'true'
                    )}
                    label="Bonus"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="true">Bonus Eligible</MenuItem>
                    <MenuItem value="false">No Bonus</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Certifications Grid */}
      {certifications.length === 0 ? (
        <Alert severity="info">
          No certifications found matching your criteria. Try adjusting your filters.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {certifications.map((cert: MasterCertification) => (
            <Grid item xs={12} md={6} lg={4} key={cert.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out',
                  },
                }}
              >
                {/* Header ribbon for bonus eligible */}
                {cert.isBonusEligible && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bgcolor: 'secondary.main',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: '0 4px 0 8px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      zIndex: 1,
                    }}
                  >
                    💰 BONUS
                  </Box>
                )}

                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                  {/* Vendor and certification info */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: 'primary.main',
                        mr: 2,
                        width: 48,
                        height: 48,
                      }}
                      src={cert.vendor.logoUrl}
                    >
                      {cert.vendor.name[0]}
                    </Avatar>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Tooltip title={cert.fullName}>
                        <Typography
                          variant="h6"
                          component="h3"
                          gutterBottom
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: 1.2,
                          }}
                        >
                          {cert.shortName || cert.fullName}
                        </Typography>
                      </Tooltip>
                      <Typography variant="body2" color="text.secondary">
                        {cert.vendor.name}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Chips for level, difficulty, etc */}
                  <Box sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      <Chip
                        label={cert.level}
                        size="small"
                        sx={{
                          bgcolor: getLevelColor(cert.level),
                          color: 'white',
                          fontWeight: 'bold',
                        }}
                      />
                      <Chip
                        label={`${cert.pointsValue} pts`}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                      <Chip
                        label={`${getDifficultyIcon(cert.difficultyLevel)} ${cert.difficultyLevel}`}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </Stack>
                  </Box>

                  {/* Description */}
                  {cert.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {cert.description}
                    </Typography>
                  )}

                  {/* Details */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <Schedule sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                      <strong>Validity:</strong> {cert.validityMonths} months
                    </Typography>
                    {cert.bonusAmount && (
                      <Typography variant="body2" sx={{ mb: 0.5, color: 'secondary.main' }}>
                        <EmojiEvents sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                        <strong>Bonus:</strong> ${cert.bonusAmount}
                      </Typography>
                    )}
                    {cert.examDetails?.examCost && (
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <LocalOffer sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                        <strong>Exam Cost:</strong> ${cert.examDetails.examCost}
                      </Typography>
                    )}
                  </Box>

                  {/* Prerequisites */}
                  {cert.prerequisites && cert.prerequisites.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        Prerequisites:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {cert.prerequisites.slice(0, 2).map((prereq, index) => (
                          <Chip
                            key={index}
                            label={prereq}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem' }}
                          />
                        ))}
                        {cert.prerequisites.length > 2 && (
                          <Chip
                            label={`+${cert.prerequisites.length - 2} more`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Tags */}
                  {cert.tags && cert.tags.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {cert.tags.slice(0, 3).map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontSize: '0.65rem',
                              bgcolor: 'grey.100',
                              '&:hover': { bgcolor: 'grey.200' }
                            }}
                          />
                        ))}
                        {cert.tags.length > 3 && (
                          <Chip
                            label={`+${cert.tags.length - 3}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                    </Box>
                  )}
                </CardContent>

                {/* Footer with dates */}
                <Box sx={{ px: 2, pb: 2 }}>
                  <Divider sx={{ mb: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Added: {safeFormatDate(cert.dateIntroduced, 'MMM yyyy')}
                    </Typography>
                    {cert.version && (
                      <Chip
                        label={`v${cert.version}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    )}
                  </Box>
                  {cert.dateExpired && (
                    <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
                      Expires: {safeFormatDate(cert.dateExpired, 'MMM yyyy')}
                    </Typography>
                  )}
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Loading indicator for additional data */}
      {catalogLoading && (
        <Box sx={{ mt: 3 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
            Loading certification data...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CertificationCatalog;