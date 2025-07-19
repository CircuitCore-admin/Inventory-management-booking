// src/pages/LoginPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// CORRECTED: Import form components from their own package
import { FormControl, FormLabel } from "@chakra-ui/form-control";
import {
  Box, Button, Input, VStack, Heading, Text
} from '@chakra-ui/react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(`Login Failed: ${err.message}`);
      console.error('Login failed:', err);
    }
  };

  return (
    <Box display="flex" alignItems="center" justifyContent="center" height="100vh">
      <VStack as="form" onSubmit={handleLogin} spacing={4} p={8} borderWidth={1} borderRadius="lg" boxShadow="lg">
        <Heading>Inventory Login</Heading>
        <FormControl isRequired>
          <FormLabel>Email Address</FormLabel>
          <Input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Password</FormLabel>
          <Input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
        </FormControl>
        {error && <Text color="red.500">{error}</Text>}
        <Button type="submit" colorScheme="blue" width="full">
          Sign In
        </Button>
      </VStack>
    </Box>
  );
};

export default LoginPage;