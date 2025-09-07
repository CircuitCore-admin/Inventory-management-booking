import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Box,
  Heading,
  Text,
  Spinner,
  useToast,
  Button,
  VStack,
  Input,
  InputGroup,
  InputLeftElement,
  HStack,
  Tag,
  TagLabel,
  Flex,
  Spacer,
  Card,
  CardBody,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Select,
  Portal,
} from '@chakra-ui/react';
import { SearchIcon, CalendarIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { FaEllipsisV, FaList } from 'react-icons/fa';
import EventCreationModal from '../components/EventCreationModal';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [filterStatus, setFilterStatus] = useState('all');
  const toast = useToast();
  const navigate = useNavigate();

  const fetchEvents = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      let url = '/api/events';
      if (filterStatus !== 'all') {
        url += `?status=${filterStatus}`;
      }
      const res = await axios.get(url, { headers });
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
  }, [toast, filterStatus]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const updateEventStatus = async (eventId, newStatus) => {
    try {
      const eventToUpdate = events.find(event => event.event_id === eventId);
      if (!eventToUpdate) {
        throw new Error("Event not found in state.");
      }
  
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
  
      // Send the entire event object with the updated status
      await axios.put(`/api/events/${eventId}`, { ...eventToUpdate, status: newStatus }, { headers });
  
      toast({
        title: "Status Updated.",
        description: `Event status changed to ${newStatus}.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      fetchEvents();
    } catch (error) {
      console.error('Update Failed:', error);
      toast({
        title: "Update Failed.",
        description: "Could not update event status.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter(event =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase())
    ).map(event => ({
        id: event.event_id,
        title: event.name,
        start: event.start_date,
        end: event.end_date,
        allDay: true,
        ...event
    }));
  }, [events, searchTerm]);

  const handleEventClick = (eventId) => {
    navigate(`/event-details/${eventId}`);
  };

  const handleCreateEvent = () => {
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'green';
      case 'in progress':
        return 'blue';
      case 'pending':
        return 'orange';
      case 'completed':
        return 'purple';
      case 'cancelled':
        return 'red';
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
    <VStack spacing={4} align="stretch">
      <HStack justifyContent="space-between">
        <Heading>Events</Heading>
        <HStack>
            <IconButton
                icon={<FaList />}
                aria-label="List View"
                onClick={() => setViewMode('list')}
                colorScheme={viewMode === 'list' ? 'blue' : 'gray'}
            />
            <IconButton
                icon={<CalendarIcon />}
                aria-label="Calendar View"
                onClick={() => setViewMode('calendar')}
                colorScheme={viewMode === 'calendar' ? 'blue' : 'gray'}
            />
            <Button colorScheme="blue" onClick={handleCreateEvent}>
                Create New Event
            </Button>
        </HStack>
      </HStack>
      <HStack>
        <InputGroup flex="1">
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
        <Select
          width="200px"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="in progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </HStack>
      
      {viewMode === 'list' ? (
        <VStack spacing={4} align="stretch">
          {filteredEvents.length > 0 ? (
            filteredEvents.map(event => (
              <Card
                key={event.event_id}
                onClick={() => handleEventClick(event.event_id)}
                cursor="pointer"
                _hover={{ transform: 'scale(1.01)', transition: '0.2s', boxShadow: 'lg' }}
              >
                <CardBody p={4} position="relative">
                  <Box
                    position="absolute"
                    left="0"
                    top="0"
                    bottom="0"
                    width="5px"
                    bg={`${getStatusColor(event.status)}.500`}
                    borderLeftRadius="md"
                  />
                  <Flex direction={{ base: 'column', md: 'row' }} pl={3}>
                    <VStack align="start" flex="1">
                      <Heading size="sm">{event.name}</Heading>
                      <Text fontSize="sm" color="gray.500">{event.location}</Text>
                    </VStack>
                    <Spacer />
                    <HStack spacing={4} mt={{ base: 2, md: 0 }}>
                      <Text>{new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}</Text>
                      <Menu>
                        <MenuButton as={Tag} size="md" colorScheme={getStatusColor(event.status)} borderRadius="full" cursor="pointer" onClick={(e) => e.stopPropagation()}>
                          <TagLabel>{event.status}</TagLabel>
                          <ChevronDownIcon />
                        </MenuButton>
                        <Portal>
                          <MenuList onClick={(e) => e.stopPropagation()} zIndex={9999}>
                            <MenuItem onClick={() => updateEventStatus(event.event_id, 'approved')}>Approved</MenuItem>
                            <MenuItem onClick={() => updateEventStatus(event.event_id, 'in progress')}>In Progress</MenuItem>
                            <MenuItem onClick={() => updateEventStatus(event.event_id, 'completed')}>Completed</MenuItem>
                            <MenuItem onClick={() => updateEventStatus(event.event_id, 'cancelled')}>Cancelled</MenuItem>
                            <MenuItem onClick={() => updateEventStatus(event.event_id, 'pending')}>Pending</MenuItem>
                          </MenuList>
                        </Portal>
                      </Menu>
                      <Menu>
                        <MenuButton as={IconButton} icon={<FaEllipsisV />} variant="ghost" onClick={(e) => e.stopPropagation()} />
                        <MenuList onClick={(e) => e.stopPropagation()}>
                          <MenuItem onClick={() => navigate(`/event-details/${event.event_id}`)}>View Details</MenuItem>
                        </MenuList>
                      </Menu>
                    </HStack>
                  </Flex>
                </CardBody>
              </Card>
            ))
          ) : (
            <Box p={4} borderWidth="1px" borderRadius="lg" textAlign="center" bg="white">
              <Text color="gray.500">No events found.</Text>
            </Box>
          )}
        </VStack>
      ) : (
        <Box p={4} borderWidth="1px" borderRadius="lg" bg="white">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            }}
            events={filteredEvents}
            eventClick={(info) => handleEventClick(info.event.id)}
          />
        </Box>
      )}

      <EventCreationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreationSuccess={() => {
          setShowModal(false);
          fetchEvents();
        }}
      />
    </VStack>
  );
};

export default EventsPage;