import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Reports: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports & Analytics
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Certification Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View expiring certifications, bonus eligibility reports, compliance status, and team analytics.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Reports;