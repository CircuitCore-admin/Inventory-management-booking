// src/pages/EventDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Box, Heading, Text, Spinner, VStack, Divider } from '@chakra-ui/react';
import { Table, Thead, Tbody, Tr, Th, Td, TableContainer } from '@chakra-ui/table';

const EventDetailPage = () => {
  const { eventId } = useParams(); // Get event ID from the URL
  const [event, setEvent] = useState(null);
  const [bookedItems, setBookedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEventDetails = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };

      // Fetch event details and booked items concurrently
      const [eventRes, bookingsRes] = await Promise.all([
        axios.get(`/api/events/${eventId}`, { headers }),
        axios.get(`/api/bookings?eventId=${eventId}`, { headers })
      ]);

      setEvent(eventRes.data);
      setBookedItems(bookingsRes.data);
    } catch (error) {
      console.error('Failed to fetch event details:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventDetails();
  }, [fetchEventDetails]);

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="100%"><Spinner size="xl" /></Box>;
  }

  if (!event) {
    return <Heading>Event not found.</Heading>;
  }

  return (
    <Box>
      <VStack align="stretch" spacing={4} mb={8}>
        <Heading>{event.name}</Heading>
        <Text><strong>Location:</strong> {event.location}</Text>
        <Text><strong>Dates:</strong> {new Date(event.start_date).toLocaleDateString()} to {new Date(event.end_date).toLocaleDateString()}</Text>
        <Text><strong>Status:</strong> {event.status}</Text>
      </VStack>

      <Divider my={6} />

      <Heading size="lg" mb={4}>Booked Inventory</Heading>
      <TableContainer borderWidth="1px" borderRadius="lg">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Item Name</Th>
              <Th>Category</Th>
            </Tr>
          </Thead>
          <Tbody>
            {bookedItems.length > 0 ? (
              bookedItems.map(item => (
                <Tr key={item.item_id}>
                  <Td>{item.item_id}</Td>
                  <Td>{item.name}</Td>
                  <Td>{item.category}</Td>
                </Tr>
              ))
            ) : (
              <Tr><Td colSpan={3}>No items booked for this event yet.</Td></Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default EventDetailPage;