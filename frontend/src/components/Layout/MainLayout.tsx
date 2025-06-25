import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  WorkspacePremium as CertificateIcon,
  Search as SearchIcon,
  Assessment as ReportIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Timeline as TimelineIcon,
  AccountCircle,
  Notifications,
  Logout,
  Approval as ApprovalIcon,
  ManageAccounts as ManageIcon,
  EmojiEvents as BountyIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { competencyColors } from '@/theme';

const drawerWidth = 240;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigationItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: [] },
    { text: 'My Certifications', icon: <CertificateIcon />, path: '/certifications', roles: [] },
    { text: 'Bounty Board', icon: <BountyIcon />, path: '/bounty-board', roles: [] },
    { text: 'Search', icon: <SearchIcon />, path: '/search', roles: [] },
    { text: 'Career Path', icon: <TimelineIcon />, path: '/career-path', roles: [] },
    { text: 'Reports', icon: <ReportIcon />, path: '/reports', roles: ['MANAGER', 'ADMIN', 'HR'] },
    { text: 'Approvals', icon: <ApprovalIcon />, path: '/admin/approvals', roles: ['ADMIN'] },
    { text: 'Users', icon: <PeopleIcon />, path: '/users', roles: ['ADMIN'] },
    { text: 'Certification Management', icon: <ManageIcon />, path: '/admin/certifications', roles: ['ADMIN'] },
    { text: 'Bounty Management', icon: <BountyIcon />, path: '/admin/bounties', roles: ['ADMIN'] },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings', roles: [] },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          CertTracker
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navigationItems
          .filter(item => item.roles.length === 0 || hasRole(item.roles))
          .map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {navigationItems.find(item => item.path === location.pathname)?.text || 'CertTracker'}
          </Typography>
          
          {/* User info and competency tier */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {user?.competencyTier && (
              <Chip
                label={user.competencyTier}
                size="small"
                sx={{
                  bgcolor: competencyColors[user.competencyTier as keyof typeof competencyColors] || '#ccc',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />
            )}
            
            <IconButton color="inherit">
              <Badge badgeContent={2} color="error">
                <Notifications />
              </Badge>
            </IconButton>
            
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="primary-account-menu"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        id="primary-account-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
      >
        <MenuItem onClick={() => navigate('/profile')}>
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="navigation"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;