// williams-portal/src/pages/UserManagementPage.js
import React, { useState, useEffect } from 'react';
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
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';

const UserManagementPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('event_team');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // User being edited

  const toast = useToast();

  // Corrected: Memoize fetchUsers with useCallback or define it inside useEffect
  // For simplicity, we'll define it inside useEffect, or use useCallback outside
  // if it's referenced by other effects or event handlers often.
  // For this scenario, defining inside useEffect or using useCallback is fine.
  // Let's use useCallback for better practice if fetchUsers is involved in other places,
  // otherwise, defining it inside useEffect is simpler.
  // Given it's a utility for this component, wrapping in useCallback is a good approach.
  const fetchUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/users', {
        headers: { 'x-auth-token': token },
      });
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        title: 'Error fetching users.',
        description: error.response?.data?.msg || 'Could not load user list.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]); // toast is a dependency of useCallback

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // <--- Added fetchUsers to the dependency array

  const handleCreateUser = async (e) => {
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
      // Clear form and re-fetch users
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('event_team');
      fetchUsers(); 
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

  const handleEditUser = (user) => {
    setCurrentUser({ ...user, password: '' }); // Load user data, clear password for security
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const token = localStorage.getItem('token');
      const updateData = {
        fullName: currentUser.full_name, // Use full_name from state
        email: currentUser.email,
        role: currentUser.role,
      };
      // Only include password if it's explicitly set for update
      if (currentUser.password) { 
        updateData.password = currentUser.password;
      }

      await axios.put(
        `/api/users/${currentUser.user_id}`,
        updateData,
        {
          headers: { 'x-auth-token': token },
        }
      );
      toast({
        title: 'User updated.',
        description: 'User details have been successfully updated.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      setIsEditModalOpen(false);
      fetchUsers(); // Re-fetch users to reflect changes
    } catch (error) {
      console.error('Failed to update user:', error);
      toast({
        title: 'Error updating user.',
        description: error.response?.data?.msg || 'Could not update user.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box>
      <Heading mb={6}>User Management</Heading>

      {/* Add New User Section */}
      <Box as="form" onSubmit={handleCreateUser} p={4} borderWidth="1px" borderRadius="lg" maxWidth="500px" mb={10}>
        <Heading size="md" mb={4}>Add New User</Heading>
        <FormControl id="createFullName" mb={4} isRequired>
          <FormLabel>Full Name</FormLabel>
          <Input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </FormControl>
        <FormControl id="createEmail" mb={4} isRequired>
          <FormLabel>Email</FormLabel>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormControl>
        <FormControl id="createPassword" mb={4} isRequired>
          <FormLabel>Password</FormLabel>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormControl>
        <FormControl id="createRole" mb={6} isRequired>
          <FormLabel>Role</FormLabel>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="admin">Admin</option>
            <option value="management">Management</option>
            <option value="event_team">Event Team</option>
            <option value="warehouse">Warehouse</option>
            <option value="contractor">Contractor</option>
          </Select>
        </FormControl>
        <Button type="submit" colorScheme="blue" width="full">
          Add User
        </Button>
      </Box>

      {/* Existing Users Table */}
      <Heading size="md" mb={4}>Existing Users</Heading>
      <TableContainer borderWidth="1px" borderRadius="lg" boxShadow="sm">
        <Table variant="striped" colorScheme="gray">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Full Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.map((user) => (
              <Tr key={user.user_id}>
                <Td>{user.user_id}</Td>
                <Td>{user.full_name}</Td>
                <Td>{user.email}</Td>
                <Td>{user.role}</Td>
                <Td>
                  <Button size="sm" onClick={() => handleEditUser(user)}>
                    Edit
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      {/* Edit User Modal */}
      {currentUser && (
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Edit User: {currentUser.full_name}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack as="form" spacing={4} onSubmit={handleUpdateUser}>
                <FormControl id="editFullName">
                  <FormLabel>Full Name</FormLabel>
                  <Input 
                    type="text" 
                    value={currentUser.full_name} 
                    onChange={(e) => setCurrentUser({ ...currentUser, full_name: e.target.value })} 
                  />
                </FormControl>
                <FormControl id="editEmail">
                  <FormLabel>Email</FormLabel>
                  <Input 
                    type="email" 
                    value={currentUser.email} 
                    onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })} 
                  />
                </FormControl>
                <FormControl id="editPassword">
                  <FormLabel>New Password (leave blank to keep current)</FormLabel>
                  <Input 
                    type="password" 
                    value={currentUser.password} 
                    onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value })} 
                  />
                </FormControl>
                <FormControl id="editRole">
                  <FormLabel>Role</FormLabel>
                  <Select 
                    value={currentUser.role} 
                    onChange={(e) => setCurrentUser({ ...currentUser, role: e.target.value })}
                  >
                    <option value="admin">Admin</option>
                    <option value="management">Management</option>
                    <option value="event_team">Event Team</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="contractor">Contractor</option>
                  </Select>
                </FormControl>
                <Button type="submit" colorScheme="blue" width="full">
                  Save Changes
                </Button>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
};

export default UserManagementPage;