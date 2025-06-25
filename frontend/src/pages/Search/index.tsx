import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Button,
  Divider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Alert,
  Stack,
  FormControlLabel,
  Checkbox,
  Autocomplete,
} from '@mui/material';
import {
  Search as SearchIcon,
  Person,
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  TableChart as TableChartIcon,
  Close,
  Email,
  LocationOn,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { certificationMasterApi, userApi, vendorApi } from '@/services/api';
import UserProfileModal from '@/components/UserProfile/UserProfileModal';

interface SearchResult {
  id: string;
  type: 'user' | 'certification';
  name?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  competencyTier?: string;
  certifications?: any[];
  vendor?: { name: string };
  level?: string;
  holders?: number;
  pointsValue?: number;
  email?: string;
  matchScore?: number;
  missingCerts?: string[];
}

interface UserDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  competencyTier: string;
  userCertifications: any[];
  stats: {
    totalCertifications: number;
    activeCertifications: number;
    totalPoints: number;
    bonusEligible: number;
  };
}

interface SearchFilter {
  id: string;
  type: 'certification' | 'vendor' | 'level' | 'tier' | 'department';
  value: string;
  displayName: string;
}

const Search: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<SearchFilter[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newFilterType, setNewFilterType] = useState('');
  const [newFilterValue, setNewFilterValue] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch certifications for filter options
  const { data: certificationsData } = useQuery(
    ['certificationMaster'],
    () => certificationMasterApi.getCertifications({ limit: 100 }),
    { refetchOnWindowFocus: false }
  );

  // Fetch vendors for filter options
  const { data: vendorsData } = useQuery(
    ['vendors'],
    () => vendorApi.getVendors(),
    { refetchOnWindowFocus: false }
  );

  // Fetch all users for search
  const { data: usersData } = useQuery(
    ['users'],
    () => userApi.getUsers(),
    { refetchOnWindowFocus: false }
  );


  // Get available certifications and vendors from API data
  const availableCertifications = (certificationsData?.data as any)?.certifications || [];
  const availableVendors = (vendorsData?.data as any)?.vendors || [];
  const allUsers = (usersData?.data as any)?.users || [];

  const handleSearch = async () => {
    setIsLoading(true);
    
    // Transform API user data to search results format
    let filteredResults = allUsers.map((user: any) => ({
      id: user.id,
      type: 'user' as const,
      firstName: user.firstName,
      lastName: user.lastName,
      department: user.department,
      competencyTier: user.competencyTier,
      email: user.email,
      certifications: user.userCertifications?.filter((cert: any) => cert.status === 'ACTIVE').map((cert: any) => ({
        name: cert.certification.name,
        vendor: cert.certification.vendor?.name || 'Unknown'
      })) || []
    }));

    // Apply search term filter
    if (searchTerm) {
      filteredResults = filteredResults.filter((result: any) => {
        return (
          result.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.certifications?.some((cert: any) =>
            cert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cert.vendor.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      });
    }

    // Apply multi-filters with matching logic
    if (activeFilters.length > 0) {
      const certFilters = activeFilters.filter(f => f.type === 'certification');
      const vendorFilters = activeFilters.filter(f => f.type === 'vendor');
      const tierFilters = activeFilters.filter(f => f.type === 'tier');
      const departmentFilters = activeFilters.filter(f => f.type === 'department');

      filteredResults = filteredResults.map((result: any) => {
        let matchScore = 0;
        let missingCerts: string[] = [];
        
        // Check certification matches
        if (certFilters.length > 0) {
          const userCertNames = result.certifications?.map((cert: any) => cert.name.toLowerCase()) || [];
          certFilters.forEach(filter => {
            if (userCertNames.some((certName: string) => certName.includes(filter.value.toLowerCase()))) {
              matchScore++;
            } else {
              missingCerts.push(filter.displayName);
            }
          });
        }

        // Check vendor matches
        if (vendorFilters.length > 0) {
          const userVendors = result.certifications?.map((cert: any) => cert.vendor.toLowerCase()) || [];
          vendorFilters.forEach(filter => {
            if (userVendors.includes(filter.value.toLowerCase())) {
              matchScore++;
            } else {
              missingCerts.push(`${filter.displayName} certification`);
            }
          });
        }

        // Check tier matches
        if (tierFilters.length > 0 && tierFilters.some(f => f.value === result.competencyTier)) {
          matchScore++;
        } else if (tierFilters.length > 0) {
          missingCerts.push(`${tierFilters[0].displayName} level`);
        }

        // Check department matches
        if (departmentFilters.length > 0 && departmentFilters.some(f => f.value === result.department)) {
          matchScore++;
        } else if (departmentFilters.length > 0) {
          missingCerts.push(`${departmentFilters[0].displayName} department`);
        }

        return {
          ...result,
          matchScore,
          missingCerts
        };
      });

      // Filter based on show suggestions setting
      if (showSuggestions) {
        // Show exact matches and near matches (1-2 missing requirements)
        filteredResults = filteredResults.filter((result: any) =>
          result.matchScore === activeFilters.length ||
          (result.missingCerts && result.missingCerts.length <= 2)
        );
      } else {
        // Show only exact matches
        filteredResults = filteredResults.filter((result: any) => result.matchScore === activeFilters.length);
      }

      // Sort by match score (highest first)
      filteredResults.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    setSearchResults(filteredResults);
    setIsLoading(false);
  };

  const addFilter = () => {
    if (!newFilterType || !newFilterValue) return;

    const filterId = `${newFilterType}-${Date.now()}`;
    const newFilter: SearchFilter = {
      id: filterId,
      type: newFilterType as SearchFilter['type'],
      value: newFilterValue,
      displayName: newFilterValue
    };

    setActiveFilters([...activeFilters, newFilter]);
    setNewFilterType('');
    setNewFilterValue('');
    
    // Auto-search when filters are added
    setTimeout(() => handleSearch(), 100);
  };

  const removeFilter = (filterId: string) => {
    setActiveFilters(activeFilters.filter(f => f.id !== filterId));
    // Auto-search when filters are removed
    setTimeout(() => handleSearch(), 100);
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleUserClick = (user: any) => {
    // Find the full user object from allUsers to get complete certification data
    const fullUser = allUsers.find((u: any) => u.id === user.id);
    setSelectedUser(fullUser || user);
  };

  // Auto-search when filters or suggestions setting change
  useEffect(() => {
    if (searchTerm || activeFilters.length > 0) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, activeFilters, showSuggestions]);

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

  const exportToJSON = () => {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        searchTerm: searchTerm || 'None',
        activeFilters: activeFilters.map(f => ({ type: f.type, value: f.value })),
        showSuggestions: showSuggestions,
        totalResults: searchResults.length
      },
      engineers: searchResults.map(result => ({
        id: result.id,
        name: `${result.firstName} ${result.lastName}`,
        email: result.email,
        department: result.department,
        experienceLevel: result.competencyTier,
        matchScore: result.matchScore || 0,
        totalRequiredFilters: activeFilters.length,
        isExactMatch: result.matchScore === activeFilters.length,
        certifications: result.certifications?.map(cert => ({
          name: cert.name,
          vendor: cert.vendor
        })) || [],
        missingRequirements: result.missingCerts || []
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `engineer-search-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const headers = [
      'Name',
      'Email',
      'Department',
      'Experience Level',
      'Match Score',
      'Is Exact Match',
      'Certifications',
      'Missing Requirements'
    ];

    const csvData = searchResults.map(result => [
      `${result.firstName} ${result.lastName}`,
      result.email || '',
      result.department || '',
      result.competencyTier || '',
      `${result.matchScore || 0}/${activeFilters.length}`,
      result.matchScore === activeFilters.length ? 'Yes' : 'No',
      result.certifications?.map(cert => `${cert.vendor} ${cert.name}`).join('; ') || '',
      result.missingCerts?.join('; ') || ''
    ]);

    // Add metadata as header comments
    const metadata = [
      `# Engineer Search Results Export`,
      `# Export Date: ${new Date().toISOString()}`,
      `# Search Term: ${searchTerm || 'None'}`,
      `# Active Filters: ${activeFilters.map(f => `${f.type}:${f.value}`).join(', ') || 'None'}`,
      `# Show Suggestions: ${showSuggestions ? 'Yes' : 'No'}`,
      `# Total Results: ${searchResults.length}`,
      `#`,
      headers.join(',')
    ];

    const csvContent = [
      ...metadata,
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `engineer-search-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Advanced Search
      </Typography>
      
      {/* Enhanced Multi-Filter Search Interface */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Advanced Project Team Search
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Find engineers who meet specific project requirements. Add multiple filters for certifications, vendors, experience levels, and departments.
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Search engineers by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={isLoading}
                sx={{ height: '56px', px: 4 }}
                fullWidth
              >
                {isLoading ? 'Searching...' : 'Search Engineers'}
              </Button>
            </Grid>
          </Grid>

          {/* Active Filters Display */}
          {activeFilters.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Active Filters ({activeFilters.length})
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {activeFilters.map((filter) => (
                  <Chip
                    key={filter.id}
                    label={`${filter.type}: ${filter.displayName}`}
                    onDelete={() => removeFilter(filter.id)}
                    deleteIcon={<DeleteIcon />}
                    color="primary"
                    variant="outlined"
                  />
                ))}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={clearAllFilters}
                  startIcon={<DeleteIcon />}
                  sx={{ ml: 1 }}
                >
                  Clear All
                </Button>
              </Stack>
            </Box>
          )}

          {/* Add New Filter */}
          <Typography variant="subtitle1" gutterBottom>
            Add Project Requirements
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter Type</InputLabel>
                <Select
                  value={newFilterType}
                  onChange={(e) => setNewFilterType(e.target.value)}
                  label="Filter Type"
                >
                  <MenuItem value="certification">Specific Certification</MenuItem>
                  <MenuItem value="vendor">Vendor</MenuItem>
                  <MenuItem value="tier">Experience Level</MenuItem>
                  <MenuItem value="department">Department</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              {newFilterType === 'certification' && (
                <Autocomplete
                  size="small"
                  options={availableCertifications.map((cert: any) => cert.fullName)}
                  value={newFilterValue}
                  onChange={(event, newValue) => setNewFilterValue(newValue || '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Certification"
                      placeholder="Type to search certifications..."
                    />
                  )}
                />
              )}
              
              {newFilterType === 'vendor' && (
                <FormControl fullWidth size="small">
                  <InputLabel>Vendor</InputLabel>
                  <Select
                    value={newFilterValue}
                    onChange={(e) => setNewFilterValue(e.target.value)}
                    label="Vendor"
                  >
                    {availableVendors.map((vendor: any) => (
                      <MenuItem key={vendor.id} value={vendor.name}>
                        {vendor.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              {newFilterType === 'tier' && (
                <FormControl fullWidth size="small">
                  <InputLabel>Experience Level</InputLabel>
                  <Select
                    value={newFilterValue}
                    onChange={(e) => setNewFilterValue(e.target.value)}
                    label="Experience Level"
                  >
                    <MenuItem value="Entry">Entry</MenuItem>
                    <MenuItem value="Junior">Junior</MenuItem>
                    <MenuItem value="Senior">Senior</MenuItem>
                    <MenuItem value="Architect">Architect</MenuItem>
                    <MenuItem value="Principal">Principal</MenuItem>
                  </Select>
                </FormControl>
              )}
              
              {newFilterType === 'department' && (
                <FormControl fullWidth size="small">
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={newFilterValue}
                    onChange={(e) => setNewFilterValue(e.target.value)}
                    label="Department"
                  >
                    {[...new Set(allUsers.map((user: any) => user.department))].map((dept: any) => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Grid>
            
            <Grid item xs={12} sm={2}>
              <Button
                variant="contained"
                onClick={addFilter}
                disabled={!newFilterType || !newFilterValue}
                startIcon={<AddIcon />}
                fullWidth
                size="small"
                sx={{ height: '40px' }}
              >
                Add
              </Button>
            </Grid>
          </Grid>

          {/* Suggestions Checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={showSuggestions}
                onChange={(e) => setShowSuggestions(e.target.checked)}
                color="primary"
              />
            }
            label="Show suggestions (engineers who are 1-2 requirements short)"
            sx={{ mb: 2 }}
          />
        </CardContent>
      </Card>

      {/* Enhanced Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Search Results ({searchResults.length})
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={exportToJSON}
                >
                  Export JSON
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<TableChartIcon />}
                  onClick={exportToCSV}
                >
                  Export CSV
                </Button>
              </Stack>
            </Box>
            
            <List>
              {searchResults.map((result, index) => (
                <React.Fragment key={result.id}>
                  <ListItem
                    sx={{
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      borderRadius: 1,
                      border: result.matchScore === activeFilters.length ? '2px solid' : '1px solid',
                      borderColor: result.matchScore === activeFilters.length ? 'success.main' : 'divider',
                      bgcolor: result.matchScore === activeFilters.length ? 'success.50' : 'transparent',
                      mb: 1
                    }}
                    onClick={() => handleUserClick(result)}
                  >
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: getCompetencyColor(result.competencyTier || '') }}>
                        <Person />
                      </Avatar>
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="h6">
                            {`${result.firstName} ${result.lastName}`}
                          </Typography>
                          <Chip
                            label={result.competencyTier}
                            size="small"
                            sx={{
                              bgcolor: getCompetencyColor(result.competencyTier || ''),
                              color: 'white'
                            }}
                          />
                          {activeFilters.length > 0 && (
                            <Chip
                              label={result.matchScore === activeFilters.length ? 'Perfect Match' : `${result.matchScore}/${activeFilters.length} matches`}
                              size="small"
                              color={result.matchScore === activeFilters.length ? 'success' : 'warning'}
                              variant="filled"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            <LocationOn sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                            {result.department}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <Email sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                            {result.email}
                          </Typography>
                          
                          {/* Current Certifications */}
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Certifications:
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                              {result.certifications?.map((cert, idx) => (
                                <Chip
                                  key={idx}
                                  label={cert.name}
                                  size="small"
                                  color={activeFilters.some(f =>
                                    f.type === 'certification' &&
                                    cert.name.toLowerCase().includes(f.value.toLowerCase())
                                  ) ? 'success' : 'default'}
                                  variant={activeFilters.some(f =>
                                    f.type === 'certification' &&
                                    cert.name.toLowerCase().includes(f.value.toLowerCase())
                                  ) ? 'filled' : 'outlined'}
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              ))}
                            </Box>
                          </Box>

                          {/* Missing Requirements (for suggestions) */}
                          {result.missingCerts && result.missingCerts.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" color="warning.main">
                                Missing Requirements:
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                {result.missingCerts.map((missing, idx) => (
                                  <Chip
                                    key={idx}
                                    label={missing}
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem' }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>

                  {index < searchResults.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* No Results Message */}
      {searchResults.length === 0 && (searchTerm || activeFilters.length > 0) && !isLoading && (
        <Card>
          <CardContent>
            <Alert severity="info">
              <Typography variant="h6" gutterBottom>
                No engineers found matching your criteria
              </Typography>
              <Typography variant="body2">
                Try adjusting your filters or enabling suggestions to see engineers who are close to meeting your requirements.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        showActionButtons={false}
      />
    </Box>
  );
};

export default Search;