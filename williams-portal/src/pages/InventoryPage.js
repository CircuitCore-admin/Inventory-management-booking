// src/pages/InventoryPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Heading,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useColorModeValue,
} from '@chakra-ui/react';

const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const tableBg = useColorModeValue('white', 'gray.700');

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get('/api/items', {
          headers: { 'x-auth-token': token },
        });
        setItems(data);
      } catch (error) {
        console.error('Failed to fetch inventory items', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box>
      <Heading mb={6}>Inventory</Heading>
      <TableContainer bg={tableBg} borderWidth="1px" borderRadius="lg" boxShadow="sm">
        <Table variant="striped" colorScheme="gray">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Item Name</Th>
              <Th>Category</Th>
              <Th>Status</Th>
              <Th>Location</Th>
            </Tr>
          </Thead>
          <Tbody>
            {items.map((item) => (
              <Tr key={item.item_id}>
                <Td>{item.item_id}</Td>
                <Td>{item.name}</Td>
                <Td>{item.category}</Td>
                <Td>{item.status}</Td>
                <Td>{item.location}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default InventoryPage;
