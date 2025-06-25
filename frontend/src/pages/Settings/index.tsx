import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  TextField,
  Button,
  Divider,
  Chip,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Email,
  Schedule,
  Notifications,
  Warning,
  CheckCircle,
  Save,
  Send,
  Delete,
  Add,
  Microsoft,
  Settings as SettingsIcon,
  NotificationsActive,
} from '@mui/icons-material';
import NotificationSettings from './NotificationSettings';

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [emailSettings, setEmailSettings] = useState({
    enableNotifications: true,
    expirationAlerts: true,
    weeklyDigest: true,
    monthlyReport: false,
    bonusAlerts: true,
    teamUpdates: false,
  });

  const [frequencies, setFrequencies] = useState({
    expirationAlertDays: 30,
    digestDay: 'monday',
    reportDay: 1,
  });

  const [emailAddresses, setEmailAddresses] = useState([
    'john.smith@company.com',
    'hr-team@company.com'
  ]);

  const [teamsSettings, setTeamsSettings] = useState({
    enableTeamsIntegration: true,
    channelWebhook: 'https://outlook.office.com/webhook/...',
    criticalAlertsOnly: false,
  });

  const [newEmail, setNewEmail] = useState('');
  const [testEmailSent, setTestEmailSent] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEmailSettingChange = (setting: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmailSettings(prev => ({
      ...prev,
      [setting]: event.target.checked
    }));
  };

  const handleFrequencyChange = (setting: string) => (event: any) => {
    setFrequencies(prev => ({
      ...prev,
      [setting]: event.target.value
    }));
  };

  const handleTeamsSettingChange = (setting: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setTeamsSettings(prev => ({
      ...prev,
      [setting]: event.target.checked
    }));
  };

  const addEmailAddress = () => {
    if (newEmail && !emailAddresses.includes(newEmail)) {
      setEmailAddresses(prev => [...prev, newEmail]);
      setNewEmail('');
    }
  };

  const removeEmailAddress = (email: string) => {
    setEmailAddresses(prev => prev.filter(e => e !== email));
  };

  const sendTestEmail = () => {
    setTestEmailSent(true);
    setTimeout(() => setTestEmailSent(false), 3000);
  };

  const saveSettings = () => {
    // Save settings logic would go here
    console.log('Saving settings:', { emailSettings, frequencies, emailAddresses, teamsSettings });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
          <Tab
            icon={<SettingsIcon />}
            label="General"
            {...a11yProps(0)}
          />
          <Tab
            icon={<NotificationsActive />}
            label="Advanced Notifications"
            {...a11yProps(1)}
          />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
        {/* Email Notification Settings */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Email sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Email Notifications
                </Typography>
              </Box>
              
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailSettings.enableNotifications}
                      onChange={handleEmailSettingChange('enableNotifications')}
                      color="primary"
                    />
                  }
                  label="Enable Email Notifications"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailSettings.expirationAlerts}
                      onChange={handleEmailSettingChange('expirationAlerts')}
                      disabled={!emailSettings.enableNotifications}
                    />
                  }
                  label="Certification Expiration Alerts"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailSettings.bonusAlerts}
                      onChange={handleEmailSettingChange('bonusAlerts')}
                      disabled={!emailSettings.enableNotifications}
                    />
                  }
                  label="Bonus Eligibility Notifications"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailSettings.weeklyDigest}
                      onChange={handleEmailSettingChange('weeklyDigest')}
                      disabled={!emailSettings.enableNotifications}
                    />
                  }
                  label="Weekly Team Digest"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailSettings.monthlyReport}
                      onChange={handleEmailSettingChange('monthlyReport')}
                      disabled={!emailSettings.enableNotifications}
                    />
                  }
                  label="Monthly Compliance Report"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailSettings.teamUpdates}
                      onChange={handleEmailSettingChange('teamUpdates')}
                      disabled={!emailSettings.enableNotifications}
                    />
                  }
                  label="Team Achievement Updates"
                />
              </FormGroup>

              <Divider sx={{ my: 3 }} />

              {/* Frequency Settings */}
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
                Frequency Settings
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <FormLabel>Expiration Alert (days before)</FormLabel>
                    <Select
                      value={frequencies.expirationAlertDays}
                      onChange={handleFrequencyChange('expirationAlertDays')}
                      disabled={!emailSettings.expirationAlerts}
                    >
                      <MenuItem value={7}>7 days</MenuItem>
                      <MenuItem value={14}>14 days</MenuItem>
                      <MenuItem value={30}>30 days</MenuItem>
                      <MenuItem value={60}>60 days</MenuItem>
                      <MenuItem value={90}>90 days</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <FormLabel>Weekly Digest Day</FormLabel>
                    <Select
                      value={frequencies.digestDay}
                      onChange={handleFrequencyChange('digestDay')}
                      disabled={!emailSettings.weeklyDigest}
                    >
                      <MenuItem value="monday">Monday</MenuItem>
                      <MenuItem value="tuesday">Tuesday</MenuItem>
                      <MenuItem value="wednesday">Wednesday</MenuItem>
                      <MenuItem value="thursday">Thursday</MenuItem>
                      <MenuItem value="friday">Friday</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <FormLabel>Monthly Report Date</FormLabel>
                    <Select
                      value={frequencies.reportDay}
                      onChange={handleFrequencyChange('reportDay')}
                      disabled={!emailSettings.monthlyReport}
                    >
                      <MenuItem value={1}>1st of month</MenuItem>
                      <MenuItem value={15}>15th of month</MenuItem>
                      <MenuItem value={-1}>Last day of month</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Email Recipients & Teams Integration */}
        <Grid item xs={12} lg={6}>
          {/* Email Recipients */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Email Recipients
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="Add Email Address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addEmailAddress()}
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={addEmailAddress} disabled={!newEmail}>
                        <Add />
                      </IconButton>
                    )
                  }}
                />
              </Box>
              
              <List dense>
                {emailAddresses.map((email, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Email color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={email} />
                    <IconButton 
                      onClick={() => removeEmailAddress(email)}
                      size="small"
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Microsoft Teams Integration */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Microsoft sx={{ mr: 1, color: '#5059c9' }} />
                <Typography variant="h6">
                  Microsoft Teams Integration
                </Typography>
              </Box>
              
              <FormGroup sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={teamsSettings.enableTeamsIntegration}
                      onChange={handleTeamsSettingChange('enableTeamsIntegration')}
                    />
                  }
                  label="Enable Teams Notifications"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={teamsSettings.criticalAlertsOnly}
                      onChange={handleTeamsSettingChange('criticalAlertsOnly')}
                      disabled={!teamsSettings.enableTeamsIntegration}
                    />
                  }
                  label="Critical Alerts Only"
                />
              </FormGroup>
              
              <TextField
                fullWidth
                label="Teams Webhook URL"
                value={teamsSettings.channelWebhook}
                onChange={(e) => setTeamsSettings(prev => ({ ...prev, channelWebhook: e.target.value }))}
                disabled={!teamsSettings.enableTeamsIntegration}
                helperText="Configure your Teams channel webhook URL for notifications"
                sx={{ mb: 2 }}
              />
              
              <Alert severity="info" sx={{ mb: 2 }}>
                Teams notifications will include certification expirations, new achievements, and compliance alerts.
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Report Preview */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Email Report Preview
              </Typography>
              
              <Paper sx={{ p: 3, bgcolor: '#fafafa', border: '1px solid #e0e0e0' }}>
                <Typography variant="h6" sx={{ color: '#1976d2', mb: 2 }}>
                  📊 CertTracker Weekly Digest - December 18, 2023
                </Typography>
                
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Hello Team,
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Here's your weekly certification summary:
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Chip label="🎯 2 New Certifications" color="success" sx={{ mr: 1, mb: 1 }} />
                  <Chip label="⚠️ 3 Expiring Soon" color="warning" sx={{ mr: 1, mb: 1 }} />
                  <Chip label="🏆 1 Bonus Eligible" color="secondary" sx={{ mr: 1, mb: 1 }} />
                </Box>
                
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Upcoming Expirations:</strong><br />
                  • John Smith - AWS Solutions Architect (expires Jan 15, 2024)<br />
                  • Jane Doe - Azure Administrator (expires Jan 22, 2024)
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  View full dashboard: <a href="#">CertTracker Dashboard</a>
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<Send />}
                onClick={sendTestEmail}
                disabled={!emailSettings.enableNotifications}
              >
                Send Test Email
              </Button>
              
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={saveSettings}
              >
                Save Settings
              </Button>
            </Box>
            
            {testEmailSent && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <CheckCircle sx={{ mr: 1 }} />
                Test email sent successfully to all configured recipients!
              </Alert>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <NotificationSettings />
      </TabPanel>
    </Box>
  );
};

export default Settings;