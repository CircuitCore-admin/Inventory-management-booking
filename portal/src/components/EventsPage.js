// williams-portal/src/pages/EventsPage.js
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
  Button,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import OtpManagementModal from './OtpManagementModal'; // Import the new modal

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const tableBg = useColorModeValue('white', 'gray.700');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get('/api/events', {
          headers: { 'x-auth-token': token },
        });
        setEvents(data);
      } catch (error) {
        console.error('Failed to fetch events', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleManageOtpClick = (event) => {
    setSelectedEvent(event);
    onOpen();
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
      <Heading mb={6}>Events</Heading>
      <TableContainer bg={tableBg} borderWidth="1px" borderRadius="lg" boxShadow="sm">
        <Table variant="striped" colorScheme="gray">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>Location</Th>
              <Th>Start Date</Th>
              <Th>End Date</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {events.map((event) => (
              <Tr key={event.event_id}>
                <Td>{event.event_id}</Td>
                <Td>{event.name}</Td>
                <Td>{new Date(event.location).toLocaleDateString()}</Td> {/* Assuming location stores a date string here */}
                <Td>{new Date(event.start_date).toLocaleDateString()}</Td>
                <Td>{new Date(event.end_date).toLocaleDateString()}</Td>
                <Td>
                  <Button size="sm" onClick={() => handleManageOtpClick(event)}>
                    Manage OTPs
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      {selectedEvent && (
        <OtpManagementModal
          isOpen={isOpen}
          onClose={onClose}
          event={selectedEvent}
        />
      )}
    </Box>
  );
};

export default EventsPage;