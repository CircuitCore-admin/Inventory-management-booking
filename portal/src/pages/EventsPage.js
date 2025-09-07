// src/components/EventsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Box, Heading, Spinner, useToast } from '@chakra-ui/react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid/index.js';
import { useNavigate } from 'react-router-dom';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/events', {
        headers: { 'x-auth-token': token },
      });

      // REMOVED: Unnecessary filtering. All events from this endpoint are approved.

      // Format the events for the FullCalendar component
      const formattedEvents = data.map(event => {
        // To make the end date inclusive in all-day view, we need to add one day.
        const endDate = new Date(event.end_date);
        endDate.setDate(endDate.getDate() + 1);

        return {
          id: event.event_id,
          title: event.name,
          start: event.start_date,
          end: endDate.toISOString().split('T')[0],
          allDay: true,
        };
      });

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast({
        title: 'Error',
        description: 'Could not fetch events.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleEventClick = (clickInfo) => {
    navigate(`/events/${clickInfo.event.id}`);
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="100%"><Spinner size="xl" /></Box>;
  }

  return (
    <Box>
      <Heading mb={6}>Events Calendar</Heading>
      <Box borderWidth="1px" borderRadius="lg" p={4}>
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          events={events}
          eventClick={handleEventClick}
          height="auto"
          eventDisplay="block"
        />
      </Box>
    </Box>
  );
};

export default EventsPage;