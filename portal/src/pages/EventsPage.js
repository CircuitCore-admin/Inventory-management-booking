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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Select,
  Portal,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue
} from '@chakra-ui/react';
import { SearchIcon, CalendarIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { FaEllipsisV, FaList, FaPlus } from 'react-icons/fa';
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

  const tableBg = useColorModeValue('white', 'gray.700');
  const pageBg = useColorModeValue('gray.50', 'gray.800');

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
      console.error('Failed to fetch events', error);
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
    ).sort((a, b) => new Date(a.start_date) - new Date(b.start_date)) // Sorting by date
    .map(event => ({
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
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'teal';
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  };

  const capitalizeStatus = (status) => {
    return status.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh" bg={pageBg}>
        <Spinner size="xl" color="blue.500" />
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 8 }} bg={pageBg} minH="100vh">
      <VStack spacing={{ base: 6, md: 8 }} align="stretch">
        <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap">
          <Heading size={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="gray.800">Events Dashboard</Heading>
          <HStack spacing={4} mt={{ base: 4, md: 0 }}>
            <Button
              colorScheme="blue"
              onClick={handleCreateEvent}
              size="lg"
              leftIcon={<FaPlus />}
              boxShadow="md"
              _hover={{ boxShadow: 'lg' }}
            >
              Add New Event
            </Button>
            <IconButton
              icon={<FaList />}
              aria-label="List View"
              onClick={() => setViewMode('list')}
              colorScheme={viewMode === 'list' ? 'blue' : 'gray'}
              variant="solid"
              size="lg"
            />
            <IconButton
              icon={<CalendarIcon />}
              aria-label="Calendar View"
              onClick={() => setViewMode('calendar')}
              colorScheme={viewMode === 'calendar' ? 'blue' : 'gray'}
              variant="solid"
              size="lg"
            />
          </HStack>
        </HStack>

        <HStack spacing={4} flexWrap="wrap">
          <InputGroup flex="1" size="lg">
            <InputLeftElement
              pointerEvents="none"
              children={<SearchIcon color="gray.400" />}
            />
            <Input
              placeholder="Search by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              bg={tableBg}
              borderRadius="lg"
              boxShadow="sm"
            />
          </InputGroup>
          <Select
            width={{ base: '100%', md: '200px' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            bg={tableBg}
            borderRadius="lg"
            boxShadow="sm"
            size="lg"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in progress">In Progress</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </HStack>

        {viewMode === 'list' ? (
          <TableContainer bg={tableBg} borderWidth="1px" borderRadius="lg" boxShadow="sm">
            <Table variant="striped" colorScheme="gray">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Location</Th>
                  <Th>Start Date</Th>
                  <Th>End Date</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredEvents.length > 0 ? (
                  filteredEvents.map(event => (
                    <Tr key={event.event_id}>
                      <Td>
                        <Text fontWeight="bold">{event.name}</Text>
                      </Td>
                      <Td>{event.location}</Td>
                      <Td>{formatDate(event.start_date)}</Td>
                      <Td>{formatDate(event.end_date)}</Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={Button}
                            rightIcon={<ChevronDownIcon />}
                            colorScheme={getStatusColor(event.status)}
                            variant="solid"
                            size="sm"
                            minW="120px"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {capitalizeStatus(event.status)}
                          </MenuButton>
                          <Portal>
                            <MenuList
                              onClick={(e) => e.stopPropagation()}
                              zIndex={9999}
                              minW="120px"
                              maxW="180px"
                            >
                              <MenuItem
                                bg={getStatusColor('pending') + '.500'}
                                color="white"
                                _hover={{ bg: getStatusColor('pending') + '.600' }}
                                fontWeight="bold"
                                onClick={() => updateEventStatus(event.event_id, 'pending')}
                              >
                                Pending
                              </MenuItem>
                              <MenuItem
                                bg={getStatusColor('in progress') + '.500'}
                                color="white"
                                _hover={{ bg: getStatusColor('in progress') + '.600' }}
                                fontWeight="bold"
                                onClick={() => updateEventStatus(event.event_id, 'in progress')}
                              >
                                In Progress
                              </MenuItem>
                              <MenuItem
                                bg={getStatusColor('approved') + '.500'}
                                color="white"
                                _hover={{ bg: getStatusColor('approved') + '.600' }}
                                fontWeight="bold"
                                onClick={() => updateEventStatus(event.event_id, 'approved')}
                              >
                                Approved
                              </MenuItem>
                              <MenuItem
                                bg={getStatusColor('completed') + '.500'}
                                color="white"
                                _hover={{ bg: getStatusColor('completed') + '.600' }}
                                fontWeight="bold"
                                onClick={() => updateEventStatus(event.event_id, 'completed')}
                              >
                                Completed
                              </MenuItem>
                              <MenuItem
                                bg={getStatusColor('cancelled') + '.500'}
                                color="white"
                                _hover={{ bg: getStatusColor('cancelled') + '.600' }}
                                fontWeight="bold"
                                onClick={() => updateEventStatus(event.event_id, 'cancelled')}
                              >
                                Cancelled
                              </MenuItem>
                            </MenuList>
                          </Portal>
                        </Menu>
                      </Td>
                      <Td>
                        <IconButton
                          icon={<FaEllipsisV />}
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event.event_id);
                          }}
                        />
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={6} textAlign="center">
                      <Text color="gray.500">No events found.</Text>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </TableContainer>
        ) : (
          <Box p={4} borderWidth="1px" borderRadius="lg" bg={tableBg} boxShadow="sm">
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
              height="auto"
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
    </Box>
  );
};

export default EventsPage;