// src/pages/EventsPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Spinner,
  useToast,
  Button,
  VStack,
  Input,
  InputGroup,
  InputLeftElement,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  HStack,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import BookingModal from '../components/BookingModal';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  const fetchEvents = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      const res = await axios.get('/api/events', { headers });
      setEvents(res.data);
      setLoading(false);
    } catch (error) {
      toast({
        title: "Error loading events.",
        description: error.response?.data?.msg || "Unable to fetch events.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter(event =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [events, searchTerm]);

  // CORRECTED: The handleEventClick function now correctly navigates
  // to the event details page with the specific event_id.
  const handleEventClick = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  const handleCreateEvent = () => {
    setShowModal(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      <HStack justifyContent="space-between">
        <Heading>Events</Heading>
        <Button colorScheme="blue" onClick={handleCreateEvent}>
          Create New Event
        </Button>
      </HStack>
      <InputGroup mb={4}>
        <InputLeftElement
          pointerEvents="none"
          children={<SearchIcon color="gray.300" />}
        />
        <Input
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </InputGroup>
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="white">
        <TableContainer>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Event Name</Th>
                <Th>Location</Th>
                <Th>Dates</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredEvents.length > 0 ? (
                filteredEvents.map(event => (
                  <Tr
                    key={event.event_id}
                    _hover={{ bg: 'gray.100', cursor: 'pointer' }}
                    onClick={() => handleEventClick(event.event_id)}
                  >
                    <Td>{event.name}</Td>
                    <Td>{event.location}</Td>
                    <Td>{new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}</Td>
                    <Td>{event.status}</Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={4} textAlign="center">
                    No events found.
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>
      <BookingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={() => {
          setShowModal(false);
          fetchEvents();
        }}
        event={null}
      />
    </VStack>
  );
};

export default EventsPage;