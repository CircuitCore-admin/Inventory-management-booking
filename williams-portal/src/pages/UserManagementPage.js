// williams-portal/src/pages/UserManagementPage.js
import React, { useState, useEffect, useRef } from 'react';
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
  FormErrorMessage,
  useDisclosure,
  Flex,
  IconButton,
  Text, // Ensure Text is imported if you use it for messages
  AlertDialog, // For the second confirmation prompt
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { TriangleUpIcon, TriangleDownIcon } from '@chakra-ui/icons';
import { jwtDecode } from 'jwt-decode'; // Import jwtDecode to get current user ID

// Helper function to format role names
const formatRoleName = (role) => {
  switch (role) {
    case 'event_team':
      return 'Event Team';
    case 'warehouse':
      return 'Warehouse';
    case 'contractor':
      return 'Contractor';
    case 'admin':
      return 'Admin';
    case 'management':
      return 'Management';
    default:
      return role;
  }
};

const UserManagementPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('event_team');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // New states for delete functionality
  const { isOpen: isConfirmDeleteOpen, onOpen: onOpenConfirmDelete, onClose: onCloseConfirmDelete } = useDisclosure();
  const { isOpen: isPasswordPromptOpen, onOpen: onOpenPasswordPrompt, onClose: onClosePasswordPrompt } = useDisclosure();
  const [userToDelete, setUserToDelete] = useState(null);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const cancelRef = useRef(); // For AlertDialog focus management

  const { isOpen: isCreateModalOpen, onOpen: onOpenCreateModal, onClose: onCloseCreateModal } = useDisclosure();

  const [createEmailError, setCreateEmailError] = useState('');
  const emailCheckTimeoutRef = useRef(null);

  const [sortColumn, setSortColumn] = useState('full_name');
  const [sortDirection, setSortDirection] = useState('asc');

  const toast = useToast();

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
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedUsers = React.useMemo(() => {
    let sortableUsers = [...users];

    sortableUsers.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sortableUsers;
  }, [users, sortColumn, sortDirection]);

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setCreateEmailError('');

    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }

    if (newEmail.length > 0 && newEmail.includes('@') && newEmail.includes('.')) {
      emailCheckTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await axios.get(`/api/users/check-email?email=${newEmail}`);
          if (response.data.exists) {
            setCreateEmailError(response.data.msg);
          }
        } catch (error) {
          console.error('Error during real-time email check:', error);
        }
      }, 500);
    }
  };


  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateEmailError('');

    try {
      const checkResponse = await axios.get(`/api/users/check-email?email=${email}`);
      if (checkResponse.data.exists) {
        setCreateEmailError(checkResponse.data.msg);
        return;
      }
    } catch (error) {
      console.error('Error during pre-submission email check:', error);
      toast({
        title: 'Validation Error.',
        description: 'Could not perform final email validation. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

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
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('event_team');
      onCloseCreateModal();
      fetchUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
      const errorMessage = error.response?.data?.msg || 'Could not add team member.';

      if (error.response?.status === 400 && errorMessage === 'User with this email already exists.') {
        setCreateEmailError(errorMessage);
      } else {
        toast({
          title: 'Error creating user.',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  const handleEditUser = (user) => {
    setCurrentUser({ ...user, password: '' });
    setIsEditModalOpen(true);
  };

  // --- NEW DELETE LOGIC ---
  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    onOpenConfirmDelete(); // Open the first confirmation dialog
  };

  const handleConfirmDeleteProceed = () => {
    onCloseConfirmDelete(); // Close the first dialog
    onOpenPasswordPrompt(); // Open the password prompt
  };

  const handleFinalDelete = async () => {
    if (!userToDelete) return;

    setLoading(true); // Indicate loading while deleting
    try {
      const token = localStorage.getItem('token');
      // Get the current user's ID from the token to prevent self-deletion
      const decodedToken = jwtDecode(token);
      const currentUserId = decodedToken.user.id;

      if (currentUserId === userToDelete.user_id) {
        toast({
          title: 'Deletion Blocked.',
          description: 'You cannot delete your own account.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        setLoading(false);
        onClosePasswordPrompt();
        setAdminPasswordInput('');
        return;
      }

      await axios.delete(
        `/api/users/${userToDelete.user_id}`,
        {
          headers: { 'x-auth-token': token },
          data: { adminPassword: adminPasswordInput }, // Send password in request body for DELETE
        }
      );

      toast({
        title: 'User Deleted.',
        description: `${userToDelete.full_name} has been removed.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      onClosePasswordPrompt();
      setAdminPasswordInput(''); // Clear password input
      setUserToDelete(null); // Clear user to delete
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast({
        title: 'Deletion Failed.',
        description: error.response?.data?.msg || 'Could not delete user. Check admin password.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setAdminPasswordInput(''); // Clear password input on error
    } finally {
      setLoading(false);
    }
  };
  // --- END NEW DELETE LOGIC ---


  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const token = localStorage.getItem('token');
      const updateData = {
        fullName: currentUser.full_name,
        email: currentUser.email,
        role: currentUser.role,
      };
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
      fetchUsers();
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

      <Button colorScheme="green" mb={6} onClick={onOpenCreateModal}>
        Create New Account
      </Button>

      {/* New Account Creation Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={onCloseCreateModal} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Account</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack as="form" spacing={4} onSubmit={handleCreateUser}>
              <FormControl id="createFullName" mb={4} isRequired>
                <FormLabel>Full Name</FormLabel>
                <Input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </FormControl>
              <FormControl id="createEmail" mb={4} isRequired isInvalid={!!createEmailError}>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailChange}
                />
                {createEmailError && <FormErrorMessage>{createEmailError}</FormErrorMessage>}
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
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onCloseCreateModal}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Existing Users Table */}
      <Heading size="md" mb={4}>Existing Users</Heading>
      <TableContainer borderWidth="1px" borderRadius="lg" boxShadow="sm">
        <Table variant="striped" colorScheme="gray">
          <Thead>
            <Tr>
              <Th cursor="pointer" onClick={() => handleSort('full_name')}>
                <Flex align="center">
                  Full Name
                  {sortColumn === 'full_name' && (
                    <IconButton
                      size="xs"
                      ml={1}
                      icon={sortDirection === 'asc' ? <TriangleUpIcon /> : <TriangleDownIcon />}
                      aria-label="sort by full name"
                      variant="ghost"
                    />
                  )}
                </Flex>
              </Th>
              <Th cursor="pointer" onClick={() => handleSort('email')}>
                <Flex align="center">
                  Email
                  {sortColumn === 'email' && (
                    <IconButton
                      size="xs"
                      ml={1}
                      icon={sortDirection === 'asc' ? <TriangleUpIcon /> : <TriangleDownIcon />}
                      aria-label="sort by email"
                      variant="ghost"
                    />
                  )}
                </Flex>
              </Th>
              <Th cursor="pointer" onClick={() => handleSort('role')}>
                <Flex align="center">
                  Role (Function)
                  {sortColumn === 'role' && (
                    <IconButton
                      size="xs"
                      ml={1}
                      icon={sortDirection === 'asc' ? <TriangleUpIcon /> : <TriangleDownIcon />}
                      aria-label="sort by role"
                      variant="ghost"
                    />
                  )}
                </Flex>
              </Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {sortedUsers.map((user) => (
              <Tr key={user.user_id}>
                <Td>{user.full_name}</Td>
                <Td>{user.email}</Td>
                <Td>
                  {formatRoleName(user.role)}
                </Td>
                <Td>
                  <Button size="sm" onClick={() => handleEditUser(user)} mr={2}>
                    Edit
                  </Button>
                  <Button size="sm" colorScheme="red" onClick={() => handleDeleteClick(user)}>
                    Delete
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      {/* Edit User Modal (existing) */}
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

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog
        isOpen={isConfirmDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onCloseConfirmDelete}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete User
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete {userToDelete?.full_name}? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onCloseConfirmDelete}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleConfirmDeleteProceed} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Admin Password Prompt Modal */}
      <Modal isOpen={isPasswordPromptOpen} onClose={onClosePasswordPrompt} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Admin Password</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4}>Please enter your admin password to confirm deletion of {userToDelete?.full_name}:</Text>
            <FormControl id="adminPassword">
              <FormLabel>Admin Password</FormLabel>
              <Input
                type="password"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => { onClosePasswordPrompt(); setAdminPasswordInput(''); }}>Cancel</Button>
            <Button colorScheme="red" onClick={handleFinalDelete} ml={3} isLoading={loading}>
              Confirm Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default UserManagementPage;