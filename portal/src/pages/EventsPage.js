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
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { SearchIcon, CalendarIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { FaEllipsisV, FaList, FaPlus } from 'react-icons/fa';
import EventCreationModal from '../components/EventCreationModal';
import StatusManagementModal from '../components/StatusManagementModal'; // NEW MODAL

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [customStatusOptions, setCustomStatusOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { isOpen: isStatusModalOpen, onOpen: onStatusModalOpen, onClose: onStatusModalClose } = useDisclosure();
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

  const fetchCustomStatusOptions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      const res = await axios.get('/api/event-status-options', { headers });
      setCustomStatusOptions(res.data);
    } catch (error) {
      console.error('Failed to fetch status options', error);
      toast({
        title: "Error loading status options.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchEvents();
    fetchCustomStatusOptions();
  }, [fetchEvents, fetchCustomStatusOptions]);

  const updateEventStatus = async (eventId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
  
      await axios.put(`/api/events/${eventId}`, { status: newStatus }, { headers });
  
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
    ).sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
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
    setShowCreateModal(true);
  };

  const getStatusColor = (status) => {
    const statusOption = customStatusOptions.find(opt => opt.label.toLowerCase() === status.toLowerCase());
    return statusOption ? statusOption.color : 'gray';
  };

  const formatDateRange = (startDateString, endDateString) => {
    if (!startDateString || !endDateString) return 'N/A';
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    
    if (startDate.toDateString() === endDate.toDateString()) {
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      return new Intl.DateTimeFormat('en-US', options).format(startDate);
    }
    
    const startOptions = { day: 'numeric', month: 'short' };
    const endOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    
    const formattedStartDate = new Intl.DateTimeFormat('en-US', startOptions).format(startDate);
    const formattedEndDate = new Intl.DateTimeFormat('en-US', endOptions).format(endDate);
    
    return `${formattedStartDate} - ${formattedEndDate}`;
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
            {customStatusOptions.map(option => (
              <option key={option.id} value={option.label}>{capitalizeStatus(option.label)}</option>
            ))}
          </Select>
          <Button onClick={onStatusModalOpen} size="lg" variant="outline">
            Manage Statuses
          </Button>
        </HStack>

        {viewMode === 'list' ? (
          <TableContainer bg={tableBg} borderWidth="1px" borderRadius="lg" boxShadow="sm">
            <Table variant="striped" colorScheme="gray">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredEvents.length > 0 ? (
                  filteredEvents.map(event => (
                    <Tr key={event.event_id}>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold">{event.name}</Text>
                          <Text fontSize="sm" color="gray.500">{event.location}</Text>
                        </VStack>
                      </Td>
                      <Td>{formatDateRange(event.start_date, event.end_date)}</Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={Button}
                            rightIcon={<ChevronDownIcon />}
                            bg={getStatusColor(event.status)}
                            color="white"
                            variant="solid"
                            size="sm"
                            minW="120px"
                            _hover={{ bg: getStatusColor(event.status) + '.600' }}
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
                              {customStatusOptions.map(option => (
                                <MenuItem
                                  key={option.id}
                                  bg={option.color}
                                  color="white"
                                  fontWeight="bold"
                                  _hover={{ bg: option.color + '.600' }}
                                  onClick={() => updateEventStatus(event.event_id, option.label)}
                                >
                                  {capitalizeStatus(option.label)}
                                </MenuItem>
                              ))}
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
                    <Td colSpan={4} textAlign="center">
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
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreationSuccess={() => {
            setShowCreateModal(false);
            fetchEvents();
          }}
        />

        <StatusManagementModal
          isOpen={isStatusModalOpen}
          onClose={onStatusModalClose}
          customStatusOptions={customStatusOptions}
          fetchCustomStatusOptions={fetchCustomStatusOptions}
        />
      </VStack>
    </Box>
  );
};

export default EventsPage;