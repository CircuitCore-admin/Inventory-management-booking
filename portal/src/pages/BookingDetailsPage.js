import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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
  Button,
  Flex,
  Badge,
  useToast,
} from '@chakra-ui/react';

const BookingDetailsPage = () => {
  const { eventId } = useParams();
  const [allocatedItems, setAllocatedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const tableBg = useColorModeValue('white', 'gray.700');
  const toast = useToast();

  const fetchAllocatedItems = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`http://localhost:3001/api/bookings/${eventId}`, {
        headers: { 'x-auth-token': token },
      });
      setAllocatedItems(data);
    } catch (error) {
      console.error('Failed to fetch allocated items:', error);
      toast({
        title: 'Error fetching allocated items.',
        description: 'Unable to load booking details. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, toast]);

  useEffect(() => {
    fetchAllocatedItems();
  }, [fetchAllocatedItems]);

  const handleStatusUpdate = async (itemId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:3001/api/bookings/${eventId}/items/${itemId}/status`,
        { status: newStatus },
        { headers: { 'x-auth-token': token } }
      );
      toast({
        title: 'Status Updated.',
        description: `Item status changed to "${newStatus}".`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      fetchAllocatedItems(); // Refresh the list
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        title: 'Update Failed.',
        description: 'There was an error updating the item status. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Allocated':
        return 'yellow';
      case 'Picked Up':
        return 'orange';
      case 'Returned':
        return 'green';
      default:
        return 'gray';
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
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading>Event Hardware Allocation</Heading>
      </Flex>
      <TableContainer bg={tableBg} borderWidth="1px" borderRadius="lg" boxShadow="sm">
        <Table variant="striped" colorScheme="gray">
          <Thead>
            <Tr>
              <Th>Item Name</Th>
              <Th>Unique ID</Th>
              <Th>Category</Th>
              <Th>Picking Location</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {allocatedItems.length > 0 ? (
              allocatedItems.map((item) => (
                <Tr key={item.allocation_id}>
                  <Td>{item.name}</Td>
                  <Td>{item.unique_identifier}</Td>
                  <Td>{item.category}</Td>
                  <Td>{item.pickup_location || 'N/A'}</Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(item.allocation_status)}>{item.allocation_status}</Badge>
                  </Td>
                  <Td>
                    {item.allocation_status === 'Allocated' && (
                      <Button size="sm" colorScheme="orange" onClick={() => handleStatusUpdate(item.item_id, 'Picked Up')}>
                        Mark as Picked Up
                      </Button>
                    )}
                    {item.allocation_status === 'Picked Up' && (
                      <Button size="sm" colorScheme="green" onClick={() => handleStatusUpdate(item.item_id, 'Returned')}>
                        Mark as Returned
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={6} textAlign="center" py={8}>
                  No items have been allocated for this event.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default BookingDetailsPage;