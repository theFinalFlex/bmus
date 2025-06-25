import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Chip,
  Button,
  Avatar,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  CheckCircle,
  Lock,
  RadioButtonUnchecked,
  Star,
  TrendingUp,
  School,
} from '@mui/icons-material';

interface SkillNode {
  id: string;
  name: string;
  vendor: string;
  level: 'FOUNDATIONAL' | 'ASSOCIATE' | 'PROFESSIONAL' | 'EXPERT';
  points: number;
  status: 'completed' | 'available' | 'locked';
  prerequisites: string[];
  position: { x: number; y: number };
  description: string;
}

const CareerPath: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState('AWS');

  const skillTrees: Record<string, SkillNode[]> = {
    AWS: [
      {
        id: 'aws-practitioner',
        name: 'Cloud Practitioner',
        vendor: 'AWS',
        level: 'FOUNDATIONAL',
        points: 10,
        status: 'completed',
        prerequisites: [],
        position: { x: 2, y: 0 },
        description: 'Entry-level AWS certification covering cloud concepts'
      },
      {
        id: 'aws-solutions-architect-associate',
        name: 'Solutions Architect Associate',
        vendor: 'AWS',
        level: 'ASSOCIATE',
        points: 20,
        status: 'available',
        prerequisites: ['aws-practitioner'],
        position: { x: 1, y: 1 },
        description: 'Design and deploy scalable systems on AWS'
      },
      {
        id: 'aws-developer-associate',
        name: 'Developer Associate',
        vendor: 'AWS',
        level: 'ASSOCIATE',
        points: 20,
        status: 'available',
        prerequisites: ['aws-practitioner'],
        position: { x: 3, y: 1 },
        description: 'Develop and maintain AWS applications'
      },
      {
        id: 'aws-sysops-associate',
        name: 'SysOps Administrator Associate',
        vendor: 'AWS',
        level: 'ASSOCIATE',
        points: 20,
        status: 'locked',
        prerequisites: ['aws-practitioner'],
        position: { x: 2, y: 1.5 },
        description: 'Deploy, manage, and operate systems on AWS'
      },
      {
        id: 'aws-solutions-architect-professional',
        name: 'Solutions Architect Professional',
        vendor: 'AWS',
        level: 'PROFESSIONAL',
        points: 30,
        status: 'completed',
        prerequisites: ['aws-solutions-architect-associate'],
        position: { x: 1, y: 2.5 },
        description: 'Advanced AWS architecture and complex solutions'
      },
      {
        id: 'aws-devops-professional',
        name: 'DevOps Engineer Professional',
        vendor: 'AWS',
        level: 'PROFESSIONAL',
        points: 30,
        status: 'locked',
        prerequisites: ['aws-developer-associate', 'aws-sysops-associate'],
        position: { x: 3, y: 2.5 },
        description: 'Implement and manage continuous delivery systems'
      },
      {
        id: 'aws-security-specialty',
        name: 'Security Specialty',
        vendor: 'AWS',
        level: 'EXPERT',
        points: 25,
        status: 'locked',
        prerequisites: ['aws-solutions-architect-associate'],
        position: { x: 0, y: 2 },
        description: 'Specialized knowledge in securing AWS workloads'
      }
    ],
    Microsoft: [
      {
        id: 'az-900',
        name: 'Azure Fundamentals',
        vendor: 'Microsoft',
        level: 'FOUNDATIONAL',
        points: 10,
        status: 'available',
        prerequisites: [],
        position: { x: 2, y: 0 },
        description: 'Foundational knowledge of cloud services and Azure'
      },
      {
        id: 'az-104',
        name: 'Azure Administrator',
        vendor: 'Microsoft',
        level: 'ASSOCIATE',
        points: 20,
        status: 'completed',
        prerequisites: ['az-900'],
        position: { x: 2, y: 1 },
        description: 'Implement, manage, and monitor Azure environments'
      },
      {
        id: 'az-204',
        name: 'Azure Developer',
        vendor: 'Microsoft',
        level: 'ASSOCIATE',
        points: 20,
        status: 'locked',
        prerequisites: ['az-900'],
        position: { x: 1, y: 1 },
        description: 'Design, build, test, and maintain cloud applications'
      },
      {
        id: 'az-305',
        name: 'Azure Solutions Architect',
        vendor: 'Microsoft',
        level: 'PROFESSIONAL',
        points: 30,
        status: 'locked',
        prerequisites: ['az-104'],
        position: { x: 2, y: 2 },
        description: 'Design solutions that run on Azure'
      }
    ]
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'available':
        return <RadioButtonUnchecked sx={{ color: '#2196f3' }} />;
      case 'locked':
        return <Lock sx={{ color: '#9e9e9e' }} />;
      default:
        return <RadioButtonUnchecked />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4caf50';
      case 'available':
        return '#2196f3';
      case 'locked':
        return '#9e9e9e';
      default:
        return '#9e9e9e';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'FOUNDATIONAL':
        return '#4caf50';
      case 'ASSOCIATE':
        return '#2196f3';
      case 'PROFESSIONAL':
        return '#ff9800';
      case 'EXPERT':
        return '#9c27b0';
      default:
        return '#9e9e9e';
    }
  };

  const currentSkillTree = skillTrees[selectedPath] || [];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Career Path Planning
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Certification Skill Tree
            </Typography>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Certification Path</InputLabel>
              <Select
                value={selectedPath}
                onChange={(e) => setSelectedPath(e.target.value)}
                label="Certification Path"
              >
                <MenuItem value="AWS">AWS Cloud</MenuItem>
                <MenuItem value="Microsoft">Microsoft Azure</MenuItem>
                <MenuItem value="Google">Google Cloud (Coming Soon)</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Interactive skill tree showing certification paths with prerequisites and career progression. 
            Click on available certifications to view details and start your journey!
          </Typography>

          {/* Legend */}
          <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
              <Typography variant="body2">Completed</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RadioButtonUnchecked sx={{ color: '#2196f3', fontSize: 20 }} />
              <Typography variant="body2">Available</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lock sx={{ color: '#9e9e9e', fontSize: 20 }} />
              <Typography variant="body2">Locked</Typography>
            </Box>
          </Box>

          {/* Skill Tree Visualization */}
          <Box 
            sx={{ 
              position: 'relative',
              minHeight: '500px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 2,
              p: 3,
              overflow: 'hidden'
            }}
          >
            {/* Background pattern */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `
                  radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 2px, transparent 2px),
                  radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 2px, transparent 2px)
                `,
                backgroundSize: '40px 40px',
                opacity: 0.3
              }}
            />

            {/* Connection Lines */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}
            >
              {currentSkillTree.map((node) =>
                node.prerequisites.map((prereqId) => {
                  const prereqNode = currentSkillTree.find(n => n.id === prereqId);
                  if (!prereqNode) return null;
                  
                  const startX = (prereqNode.position.x * 150) + 75 + 50;
                  const startY = (prereqNode.position.y * 120) + 60 + 50;
                  const endX = (node.position.x * 150) + 75 + 50;
                  const endY = (node.position.y * 120) + 60 + 50;
                  
                  return (
                    <line
                      key={`${prereqId}-${node.id}`}
                      x1={startX}
                      y1={startY}
                      x2={endX}
                      y2={endY}
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="3"
                      strokeDasharray={node.status === 'locked' ? '5,5' : 'none'}
                    />
                  );
                })
              )}
            </svg>

            {/* Skill Nodes */}
            {currentSkillTree.map((node) => (
              <Tooltip
                key={node.id}
                title={
                  <Box>
                    <Typography variant="subtitle2">{node.name}</Typography>
                    <Typography variant="body2">{node.description}</Typography>
                    <Typography variant="caption">Points: {node.points}</Typography>
                  </Box>
                }
                arrow
              >
                <Paper
                  sx={{
                    position: 'absolute',
                    left: `${node.position.x * 150 + 50}px`,
                    top: `${node.position.y * 120 + 50}px`,
                    width: 150,
                    height: 120,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: node.status !== 'locked' ? 'pointer' : 'not-allowed',
                    border: `3px solid ${getStatusColor(node.status)}`,
                    borderRadius: 3,
                    background: node.status === 'completed' 
                      ? 'linear-gradient(135deg, #4caf50, #66bb6a)'
                      : node.status === 'available'
                      ? 'linear-gradient(135deg, #2196f3, #42a5f5)'
                      : 'linear-gradient(135deg, #9e9e9e, #bdbdbd)',
                    color: 'white',
                    transition: 'all 0.3s ease',
                    transform: node.status === 'completed' ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: node.status === 'completed' 
                      ? '0 8px 25px rgba(76, 175, 80, 0.4)'
                      : '0 4px 15px rgba(0,0,0,0.2)',
                    '&:hover': {
                      transform: node.status !== 'locked' ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: node.status !== 'locked' 
                        ? '0 12px 30px rgba(0,0,0,0.3)'
                        : '0 4px 15px rgba(0,0,0,0.2)',
                    }
                  }}
                >
                  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                    {getStatusIcon(node.status)}
                  </Box>
                  
                  <Avatar
                    sx={{
                      bgcolor: getLevelColor(node.level),
                      width: 40,
                      height: 40,
                      mb: 1,
                      border: '2px solid rgba(255,255,255,0.3)'
                    }}
                  >
                    {node.level === 'FOUNDATIONAL' && <School />}
                    {node.level === 'ASSOCIATE' && <TrendingUp />}
                    {node.level === 'PROFESSIONAL' && <Star />}
                    {node.level === 'EXPERT' && <Star />}
                  </Avatar>
                  
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      textAlign: 'center', 
                      fontWeight: 'bold',
                      fontSize: '0.7rem',
                      lineHeight: 1.2,
                      px: 1
                    }}
                  >
                    {node.name}
                  </Typography>
                  
                  <Chip
                    label={`${node.points} pts`}
                    size="small"
                    sx={{
                      mt: 1,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontSize: '0.6rem',
                      height: 20
                    }}
                  />
                </Paper>
              </Tooltip>
            ))}
          </Box>

          {/* Path Statistics */}
          <Grid container spacing={2} sx={{ mt: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#4caf50', color: 'white' }}>
                <Typography variant="h6">
                  {currentSkillTree.filter(n => n.status === 'completed').length}
                </Typography>
                <Typography variant="body2">Completed</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#2196f3', color: 'white' }}>
                <Typography variant="h6">
                  {currentSkillTree.filter(n => n.status === 'available').length}
                </Typography>
                <Typography variant="body2">Available</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ff9800', color: 'white' }}>
                <Typography variant="h6">
                  {currentSkillTree.reduce((sum, n) => sum + (n.status === 'completed' ? n.points : 0), 0)}
                </Typography>
                <Typography variant="body2">Points Earned</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#9c27b0', color: 'white' }}>
                <Typography variant="h6">
                  {Math.round((currentSkillTree.filter(n => n.status === 'completed').length / currentSkillTree.length) * 100)}%
                </Typography>
                <Typography variant="body2">Path Progress</Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CareerPath;