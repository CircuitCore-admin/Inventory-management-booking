// williams-portal/src/pages/UserManagementPage.js
import React, { useState } from 'react';
import axios from 'axios';
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  Select,
  useToast,
} from '@chakra-ui/react';

const UserManagementPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('event_team'); // Default role
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        '/api/users',
        { fullName, email, password, role },
        {
          headers: { 'x-auth-token': token },
        }
      );
      toast({
        title: 'User created.',
        description: 'New team member has been successfully added.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      // Clear form
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('event_team');
    } catch (error) {
      console.error('Failed to create user:', error);
      toast({
        title: 'Error creating user.',
        description: error.response?.data?.msg || 'Could not add team member.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box>
      <Heading mb={6}>User Management</Heading>
      <Box as="form" onSubmit={handleSubmit} p={4} borderWidth="1px" borderRadius="lg" maxWidth="500px">
        <FormControl id="fullName" mb={4} isRequired>
          <FormLabel>Full Name</FormLabel>
          <Input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </FormControl>
        <FormControl id="email" mb={4} isRequired>
          <FormLabel>Email</FormLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormControl>
        <FormControl id="password" mb={4} isRequired>
          <FormLabel>Password</FormLabel>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormControl>
        <FormControl id="role" mb={6} isRequired>
          <FormLabel>Role</FormLabel>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="admin">Admin</option>
            <option value="management">Management</option>
            <option value="event_team">Event Team</option>
            <option value="warehouse">Warehouse</option>
            {/* Contractors will typically be created via OTP for events */}
            {/* <option value="contractor">Contractor</option> */}
          </Select>
        </FormControl>
        <Button type="submit" colorScheme="blue" width="full">
          Add User
        </Button>
      </Box>
    </Box>
  );
};

export default UserManagementPage;