import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Alert,
  Divider,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Email as EmailIcon,
  Notifications as NotificationsIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  Science as TestIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
  Snooze as SnoozeIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { notificationApi } from '../../services/api';

interface AlertConfiguration {
  id: string;
  emailEnabled: boolean;
  teamsEnabled: boolean;
  teamsWebhook?: string;
  daysBeforeExpiration: number;
  notificationChannels: {
    email: boolean;
    teams: boolean;
  };
  alertTiming: {
    days: number;
  };
}

interface NotificationLog {
  id: string;
  notificationType: string;
  channel: string;
  sentAt: string;
  delivered: boolean;
  messageContent: string;
  userCertification?: {
    certification: {
      name: string;
      vendor: {
        name: string;
      };
    };
  };
}

interface ExpiringCertification {
  id: string;
  expirationDate: string;
  certification: {
    name: string;
    vendor: {
      name: string;
    };
  };
}

const NotificationSettings: React.FC = () => {
  const [config, setConfig] = useState<AlertConfiguration | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testCertName, setTestCertName] = useState('Test Certification');
  const [showHistory, setShowHistory] = useState(false);
  const [snoozeDialog, setSnoozeDialog] = useState<{ open: boolean; certId?: string }>({ open: false });
  const [snoozeDays, setSnoozeDays] = useState(7);

  const queryClient = useQueryClient();

  // Get current notification configuration
  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['notificationConfig'],
    queryFn: notificationApi.getConfig
  });

  // Get notification history
  const { data: historyData } = useQuery({
    queryKey: ['notificationLogs'],
    queryFn: () => notificationApi.getLogs({ page: 1, limit: 20 }),
    enabled: showHistory
  });

  // Get expiring certifications
  const { data: expiringData } = useQuery({
    queryKey: ['expiringCertifications'],
    queryFn: () => notificationApi.getExpiringCertifications({ days: 90 })
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: notificationApi.updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationConfig'] });
    }
  });

  // Test email mutation
  const testEmailMutation = useMutation({
    mutationFn: (data: { email: string; certificationName: string }) =>
      notificationApi.testEmail(data),
    onSuccess: () => {
      setTestEmail('');
      setTestCertName('Test Certification');
    }
  });

  // Snooze reminder mutation
  const snoozeReminderMutation = useMutation({
    mutationFn: ({ certId, days }: { certId: string; days: number }) =>
      notificationApi.snoozeReminder(certId, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expiringCertifications'] });
      setSnoozeDialog({ open: false });
    }
  });

  useEffect(() => {
    if (configData?.config) {
      setConfig(configData.config);
    }
  }, [configData]);

  const handleConfigChange = (field: keyof AlertConfiguration, value: any) => {
    if (!config) return;

    const updatedConfig = { ...config, [field]: value };
    
    // Update notification channels when individual toggles change
    if (field === 'emailEnabled' || field === 'teamsEnabled') {
      updatedConfig.notificationChannels = {
        email: field === 'emailEnabled' ? value : config.emailEnabled,
        teams: field === 'teamsEnabled' ? value : config.teamsEnabled
      };
    }

    // Update alert timing when days change
    if (field === 'daysBeforeExpiration') {
      updatedConfig.alertTiming = { days: value };
    }

    setConfig(updatedConfig);
  };

  const handleSaveConfig = () => {
    if (!config) return;
    updateConfigMutation.mutate(config);
  };

  const handleTestEmail = () => {
    if (!testEmail || !testCertName) return;
    testEmailMutation.mutate({
      email: testEmail,
      certificationName: testCertName
    });
  };

  const handleSnoozeReminder = (certId: string) => {
    setSnoozeDialog({ open: true, certId });
  };

  const confirmSnooze = () => {
    if (!snoozeDialog.certId) return;
    snoozeReminderMutation.mutate({
      certId: snoozeDialog.certId,
      days: snoozeDays
    });
  };

  const getDaysUntilExpiration = (expirationDate: string) => {
    const days = Math.ceil((new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 7) return 'error';
    if (days <= 30) return 'warning';
    if (days <= 90) return 'info';
    return 'default';
  };

  if (configLoading) {
    return <Box>Loading notification settings...</Box>;
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <NotificationsIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
        Notification Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Alert Configuration
              </Typography>

              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config?.emailEnabled || false}
                      onChange={(e) => handleConfigChange('emailEnabled', e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <EmailIcon sx={{ mr: 1 }} />
                      Email Notifications
                    </Box>
                  }
                />
              </Box>

              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config?.teamsEnabled || false}
                      onChange={(e) => handleConfigChange('teamsEnabled', e.target.checked)}
                    />
                  }
                  label="Microsoft Teams Notifications"
                />
              </Box>

              {config?.teamsEnabled && (
                <TextField
                  fullWidth
                  label="Teams Webhook URL"
                  value={config?.teamsWebhook || ''}
                  onChange={(e) => handleConfigChange('teamsWebhook', e.target.value)}
                  sx={{ mt: 2 }}
                  placeholder="https://outlook.office.com/webhook/..."
                />
              )}

              <Box sx={{ mt: 3 }}>
                <Typography gutterBottom>
                  <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Default Reminder Timing
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Days before expiration to start sending reminders
                </Typography>
                <Slider
                  value={config?.daysBeforeExpiration || 30}
                  onChange={(_, value) => handleConfigChange('daysBeforeExpiration', value)}
                  min={7}
                  max={365}
                  marks={[
                    { value: 7, label: '7 days' },
                    { value: 30, label: '30 days' },
                    { value: 90, label: '90 days' },
                    { value: 180, label: '180 days' },
                    { value: 365, label: '1 year' }
                  ]}
                  valueLabelDisplay="on"
                />
              </Box>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSaveConfig}
                  disabled={updateConfigMutation.isPending}
                >
                  Save Settings
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setShowHistory(!showHistory)}
                  startIcon={<HistoryIcon />}
                >
                  {showHistory ? 'Hide' : 'Show'} History
                </Button>
              </Box>

              {updateConfigMutation.isSuccess && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Notification settings saved successfully!
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Test Email Panel */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TestIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Test Email Notifications
              </Typography>

              <TextField
                fullWidth
                label="Test Email Address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                type="email"
                sx={{ mt: 2 }}
              />

              <TextField
                fullWidth
                label="Test Certification Name"
                value={testCertName}
                onChange={(e) => setTestCertName(e.target.value)}
                sx={{ mt: 2 }}
              />

              <Button
                variant="outlined"
                onClick={handleTestEmail}
                disabled={!testEmail || !testCertName || testEmailMutation.isPending}
                sx={{ mt: 2 }}
              >
                Send Test Email
              </Button>

              {testEmailMutation.isSuccess && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Test email sent successfully!
                </Alert>
              )}

              {testEmailMutation.isError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  Failed to send test email. Please check your configuration.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Expiring Certifications Panel */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Expirations
              </Typography>

              {expiringData?.expiringCertifications?.length > 0 ? (
                <List>
                  {expiringData.expiringCertifications.map((cert: ExpiringCertification) => {
                    const daysUntilExpiration = getDaysUntilExpiration(cert.expirationDate);
                    return (
                      <ListItem key={cert.id} divider>
                        <ListItemText
                          primary={cert.certification.name}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {cert.certification.vendor.name}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                <Chip
                                  size="small"
                                  label={`${daysUntilExpiration} days`}
                                  color={getUrgencyColor(daysUntilExpiration)}
                                />
                                <Typography variant="caption" sx={{ ml: 1 }}>
                                  Expires: {new Date(cert.expirationDate).toLocaleDateString()}
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                        <IconButton
                          onClick={() => handleSnoozeReminder(cert.id)}
                          title="Snooze reminders"
                        >
                          <SnoozeIcon />
                        </IconButton>
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No certifications expiring in the next 90 days.
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Notification History */}
          {showHistory && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Notifications
                </Typography>

                {historyData?.logs?.length > 0 ? (
                  <List>
                    {historyData.logs.map((log: NotificationLog) => (
                      <ListItem key={log.id} divider>
                        <ListItemIcon>
                          {log.channel === 'EMAIL' ? <EmailIcon /> : <NotificationsIcon />}
                        </ListItemIcon>
                        <ListItemText
                          primary={log.messageContent}
                          secondary={
                            <Box>
                              <Typography variant="caption">
                                {new Date(log.sentAt).toLocaleString()}
                              </Typography>
                              <Chip
                                size="small"
                                label={log.delivered ? 'Delivered' : 'Failed'}
                                color={log.delivered ? 'success' : 'error'}
                                sx={{ ml: 1 }}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary">
                    No recent notifications found.
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Snooze Dialog */}
      <Dialog open={snoozeDialog.open} onClose={() => setSnoozeDialog({ open: false })}>
        <DialogTitle>Snooze Reminders</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            How many days would you like to snooze reminders for this certification?
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Snooze Duration</InputLabel>
            <Select
              value={snoozeDays}
              onChange={(e) => setSnoozeDays(Number(e.target.value))}
              label="Snooze Duration"
            >
              <MenuItem value={1}>1 day</MenuItem>
              <MenuItem value={3}>3 days</MenuItem>
              <MenuItem value={7}>1 week</MenuItem>
              <MenuItem value={14}>2 weeks</MenuItem>
              <MenuItem value={30}>1 month</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnoozeDialog({ open: false })}>Cancel</Button>
          <Button
            onClick={confirmSnooze}
            variant="contained"
            disabled={snoozeReminderMutation.isPending}
          >
            Snooze
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationSettings;