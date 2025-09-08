// williams-portal/src/components/MainLayout.js
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Flex,
  Heading,
  Button,
  VStack,
  Link,
  useColorModeValue,
  Spacer,
  Text,
  useColorMode,
  IconButton,
} from '@chakra-ui/react';
import { FaMoon, FaSun } from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';

const MainLayout = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [userFullName, setUserFullName] = useState('Guest');
  const { colorMode, toggleColorMode } = useColorMode();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setUserRole(decodedToken.user.role);
        setUserFullName(decodedToken.user.full_name || 'User');
      } catch (error) {
        console.error('Failed to decode token:', error);
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', path: '/dashboard' },
    { text: 'Inventory', path: '/inventory' },
    { text: 'Events', path: '/events' },
    { text: 'Bookings', path: '/bookings' },
    { text: 'Maintenance', path: '/maintenance' },
    { text: 'Audit', path: '/audit' },
    { text: 'Templates', path: '/templates' },
  ];

  const adminMenuItems = [
    { text: 'User Management', path: '/users' },
  ];

  const sidebarBg = useColorModeValue('gray.100', 'gray.800');
  const sidebarHoverBg = useColorModeValue('gray.200', 'gray.700');

  return (
    <Flex height="100vh" overflow="hidden">
      {/* Sidebar */}
      <Box width="240px" bg={sidebarBg} p={4} boxShadow="md">
        <Heading size="md" mb={8}>
          Inventory Management
        </Heading>
        <VStack align="stretch" spacing={2}>
          {menuItems.map((item) => (
            <Link
              as={RouterLink}
              to={item.path}
              key={item.text}
              p={2}
              borderRadius="md"
              _hover={{ bg: sidebarHoverBg }}
            >
              {item.text}
            </Link>
          ))}
          {userRole === 'admin' && (
            <>
              {adminMenuItems.map((item) => (
                <Link
                  as={RouterLink}
                  to={item.path}
                  key={item.text}
                  p={2}
                  borderRadius="md"
                  _hover={{ bg: sidebarHoverBg }}
                >
                  {item.text}
                </Link>
              ))}
            </>
          )}
        </VStack>
      </Box>

      {/* Main Content */}
      <Box flex="1" display="flex" flexDirection="column">
        <Flex as="header" p={4} borderBottomWidth="1px" alignItems="center">
          <Spacer />
          <Text mr={4} fontWeight="bold">Welcome, {userFullName} ({userRole})</Text>
          <IconButton
            mr={4}
            onClick={toggleColorMode}
            icon={colorMode === 'light' ? <FaMoon /> : <FaSun />}
            isRound={true}
            size="md"
            aria-label="Toggle Dark Mode"
          />
          <Button onClick={handleLogout} colorScheme="red" size="sm">
            Logout
          </Button>
        </Flex>
        <Box as="main" p={6} flex="1" overflowY="auto">
          <Outlet />
        </Box>
      </Box>
    </Flex>
  );
};

export default MainLayout;