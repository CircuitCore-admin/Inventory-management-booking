import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  useDisclosure,
  Badge,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';

import ItemAllocationModal from '../components/ItemAllocationModal';

const BookingsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const tableBg = useColorModeValue('white', 'gray.700');

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`http://localhost:3001/api/bookings`, {
        headers: { 'x-auth-token': token },
      });
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      // TODO: Handle error display to user
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleAllocateClick = (event) => {
    setSelectedEvent(event);
    onOpen();
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending Allocation':
        return 'yellow';
      case 'Allocated':
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
        <Heading>Bookings & Allocations</Heading>
      </Flex>
      <TableContainer bg={tableBg} borderWidth="1px" borderRadius="lg" boxShadow="sm">
        <Table variant="striped" colorScheme="gray">
          <Thead>
            <Tr>
              <Th>Event Name</Th>
              <Th>Location</Th>
              <Th>Start Date</Th>
              <Th>End Date</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {events.length > 0 ? (
              events.map((event) => (
                <Tr key={event.event_id}>
                  <Td>{event.name}</Td>
                  <Td>{event.location}</Td>
                  <Td>{new Date(event.start_date).toLocaleDateString()}</Td>
                  <Td>{new Date(event.end_date).toLocaleDateString()}</Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(event.booking_status)}>{event.booking_status}</Badge>
                  </Td>
                  <Td>
                    {event.booking_status !== 'Allocated' && (
                        <Button
                            size="sm"
                            onClick={() => handleAllocateClick(event)}
                            leftIcon={<AddIcon />}
                            colorScheme="green"
                        >
                            Allocate Hardware
                        </Button>
                    )}
                    {event.booking_status === 'Allocated' && (
                        <Button
                            as={RouterLink}
                            to={`/bookings/${event.event_id}`}
                            size="sm"
                        >
                            View Details
                        </Button>
                    )}
                  </Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={6} textAlign="center" py={8}>
                  No events found.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>

      {selectedEvent && (
          <ItemAllocationModal
              isOpen={isOpen}
              onClose={() => { onClose(); setSelectedEvent(null); }}
              event={selectedEvent}
              onSuccess={fetchEvents}
          />
      )}
    </Box>
  );
};

export default BookingsPage;