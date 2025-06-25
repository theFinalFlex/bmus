import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Profile: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile Settings
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            User Profile Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This page allows users to manage their profile information, notification preferences, and account settings.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;