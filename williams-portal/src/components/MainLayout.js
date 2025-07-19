// src/components/MainLayout.js

import React from 'react';
import { Outlet, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Flex,
  Heading,
  Button,
  VStack,
  Link,
  useColorModeValue,
} from '@chakra-ui/react';

const MainLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', path: '/dashboard' },
    { text: 'Inventory', path: '/inventory' },
  ];

  const sidebarBg = useColorModeValue('gray.100', 'gray.800');
  const sidebarHoverBg = useColorModeValue('gray.200', 'gray.700');

  return (
    <Flex height="100vh" overflow="hidden">
      {/* Sidebar */}
      <Box width="240px" bg={sidebarBg} p={4} boxShadow="md">
        <Heading size="md" mb={8}>
          Williams Inv.
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
        </VStack>
      </Box>

      {/* Main Content */}
      <Box flex="1" display="flex" flexDirection="column">
        <Flex as="header" p={4} borderBottomWidth="1px" justifyContent="flex-end">
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
