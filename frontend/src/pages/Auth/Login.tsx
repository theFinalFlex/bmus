import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoginFormData } from '@/types';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError('');

    try {
      const result = await login(data);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleDemoLogin = async (role: 'admin' | 'engineer') => {
    const credentials = {
      admin: { email: 'admin@certtracker.com', password: 'admin123' },
      engineer: { email: 'engineer@certtracker.com', password: 'engineer123' }
    };

    const { email, password } = credentials[role];
    
    // Set form values
    setValue('email', email);
    setValue('password', password);
    
    // Auto-submit the form after a brief delay to allow form to update
    setTimeout(async () => {
      await onSubmit({ email, password });
    }, 100);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography variant="h5" component="h2" textAlign="center" gutterBottom>
        Sign In
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        {...register('email')}
        label="Email Address"
        type="email"
        fullWidth
        error={!!errors.email}
        helperText={errors.email?.message}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Email />
            </InputAdornment>
          ),
        }}
      />

      <TextField
        {...register('password')}
        label="Password"
        type={showPassword ? 'text' : 'password'}
        fullWidth
        error={!!errors.password}
        helperText={errors.password?.message}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleTogglePasswordVisibility}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={loading}
        sx={{ mt: 2, mb: 2 }}
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </Button>

      <Box textAlign="center">
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Don't have an account?{' '}
          <Link
            component={RouterLink}
            to="/register"
            underline="hover"
            sx={{
              color: 'primary.light',
              fontWeight: 500,
              '&:hover': {
                color: 'primary.main'
              }
            }}
          >
            Sign up here
          </Link>
        </Typography>
      </Box>

      {/* Demo credentials */}
      <Box
        sx={{
          mt: 2,
          p: 2,
          bgcolor: 'grey.900',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'grey.700'
        }}
      >
        <Typography
          variant="caption"
          display="block"
          gutterBottom
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5
          }}
        >
          Demo Credentials:
        </Typography>
        <Typography
          variant="body2"
          display="block"
          sx={{
            color: 'text.primary',
            fontFamily: 'monospace',
            mt: 1
          }}
        >
          <Box component="span" sx={{ color: 'primary.light', fontWeight: 500 }}>
            Admin:
          </Box>
          {' '}admin@certtracker.com / admin123
        </Typography>
        <Typography
          variant="body2"
          display="block"
          sx={{
            color: 'text.primary',
            fontFamily: 'monospace',
            mt: 0.5
          }}
        >
          <Box component="span" sx={{ color: 'secondary.main', fontWeight: 500 }}>
            Engineer:
          </Box>
          {' '}engineer@certtracker.com / engineer123
       </Typography>
       
       {/* Demo Login Buttons */}
       <Box sx={{ mt: 2, display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
         <Button
           variant="outlined"
           size="small"
           fullWidth
           onClick={() => handleDemoLogin('admin')}
           disabled={loading}
           sx={{
             borderColor: 'primary.light',
             color: 'primary.light',
             '&:hover': {
               borderColor: 'primary.main',
               backgroundColor: 'primary.main',
               color: 'white'
             }
           }}
         >
           Login as Admin
         </Button>
         <Button
           variant="outlined"
           size="small"
           fullWidth
           onClick={() => handleDemoLogin('engineer')}
           disabled={loading}
           sx={{
             borderColor: 'secondary.main',
             color: 'secondary.main',
             '&:hover': {
               borderColor: 'secondary.dark',
               backgroundColor: 'secondary.main',
               color: 'white'
             }
           }}
         >
           Login as Engineer
         </Button>
       </Box>
     </Box>
    </Box>
  );
};

export default Login;