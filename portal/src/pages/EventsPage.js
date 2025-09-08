// williams-portal/src/pages/EventsPage.js
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
  MenuDivider
} from '@chakra-ui/react';
import { SearchIcon, CalendarIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { FaEllipsisV, FaList, FaPlus } from 'react-icons/fa';
import EventCreationModal from '../components/EventCreationModal';
import StatusManagementModal from '../components/StatusManagementModal';
import ActivationTypeManagementModal from '../components/ActivationTypeManagementModal';
import PartnerManagementModal from '../components/PartnerManagementModal';
import ContinentManagementModal from '../components/ContinentManagementModal';
import StaffingManagementModal from '../components/StaffingManagementModal';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [customStatusOptions, setCustomStatusOptions] = useState([]);
  const [activationTypeOptions, setActivationTypeOptions] = useState([]);
  const [partnerOptions, setPartnerOptions] = useState([]);
  const [continentOptions, setContinentOptions] = useState([]);
  const [staffingOptions, setStaffingOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { isOpen: isStatusModalOpen, onOpen: onStatusModalOpen, onClose: onStatusModalClose } = useDisclosure();
  const { isOpen: isActivationModalOpen, onOpen: onActivationModalOpen, onClose: onActivationModalClose } = useDisclosure();
  const { isOpen: isPartnerModalOpen, onOpen: onPartnerModalOpen, onClose: onPartnerModalClose } = useDisclosure();
  const { isOpen: isContinentModalOpen, onOpen: onContinentModalOpen, onClose: onContinentModalClose } = useDisclosure();
  const { isOpen: isStaffingModalOpen, onOpen: onStaffingModalOpen, onClose: onStaffingModalClose } = useDisclosure();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [filterStatus, setFilterStatus] = useState('all');
  const [staffMembersInput, setStaffMembersInput] = useState({});
  const [nameInput, setNameInput] = useState({});
  const [locationInput, setLocationInput] = useState({});
  const toast = useToast();
  const navigate = useNavigate();

  const tableBg = useColorModeValue('white', 'gray.700');
  const pageBg = useColorModeValue('gray.50', 'gray.800');
  const menuBg = useColorModeValue('white', 'gray.700');
  const menuHoverBg = useColorModeValue('gray.100', 'gray.600');
  const rowHoverBg = useColorModeValue('gray.50', 'gray.600');
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
      const initialStaffMembers = {};
      const initialNames = {};
      const initialLocations = {};
      res.data.forEach(event => {
        initialStaffMembers[event.event_id] = event.staff_members || '';
        initialNames[event.event_id] = event.name || '';
        initialLocations[event.event_id] = event.location || '';
      });
      setStaffMembersInput(initialStaffMembers);
      setNameInput(initialNames);
      setLocationInput(initialLocations);
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

  const fetchActivationTypeOptions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      const res = await axios.get('/api/activation_types', { headers });
      setActivationTypeOptions(res.data);
    } catch (error) {
      console.error('Failed to fetch activation types', error);
      toast({
        title: "Error loading activation types.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [toast]);

  const fetchPartnerOptions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      const res = await axios.get('/api/partners', { headers });
      setPartnerOptions(res.data);
    } catch (error) {
      console.error('Failed to fetch partner options', error);
      toast({
        title: "Error loading partner options.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [toast]);

  const fetchContinentOptions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      const res = await axios.get('/api/continents', { headers });
      setContinentOptions(res.data);
    } catch (error) {
      console.error('Failed to fetch continent options', error);
      toast({
        title: "Error loading continent options.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [toast]);

  const fetchStaffingOptions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      const res = await axios.get('/api/staffing', { headers });
      setStaffingOptions(res.data);
    } catch (error) {
      console.error('Failed to fetch staffing options', error);
      toast({
        title: "Error loading staffing options.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchEvents();
    fetchCustomStatusOptions();
    fetchActivationTypeOptions();
    fetchPartnerOptions();
    fetchContinentOptions();
    fetchStaffingOptions();
  }, [fetchEvents, fetchCustomStatusOptions, fetchActivationTypeOptions, fetchPartnerOptions, fetchContinentOptions, fetchStaffingOptions]);

  const updateEventStatus = async (eventId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      await axios.put(`/api/events/${eventId}`, { status: newStatus }, { headers });
      toast({ title: "Status Updated.", description: `Event status changed to ${newStatus}.`, status: "success", duration: 3000, isClosable: true });
      fetchEvents();
    } catch (error) {
      console.error('Update Failed:', error);
      toast({ title: "Update Failed.", description: "Could not update event status.", status: "error", duration: 5000, isClosable: true });
    }
  };

  const updateEventActivationType = async (eventId, newType) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      await axios.put(`/api/events/${eventId}`, { activation_type: newType }, { headers });
      toast({ title: "Activation Type Updated.", description: `Event activation type changed to ${newType}.`, status: "success", duration: 3000, isClosable: true });
      fetchEvents();
    } catch (error) {
      console.error('Update Failed:', error);
      toast({ title: "Update Failed.", description: "Could not update event activation type.", status: "error", duration: 5000, isClosable: true });
    }
  };

  const updateEventPartner = async (eventId, newPartner) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      await axios.put(`/api/events/${eventId}`, { partner: newPartner }, { headers });
      toast({ title: "Partner Updated.", description: `Event partner changed to ${newPartner}.`, status: "success", duration: 3000, isClosable: true });
      fetchEvents();
    } catch (error) {
      console.error('Update Failed:', error);
      toast({ title: "Update Failed.", description: "Could not update event partner.", status: "error", duration: 5000, isClosable: true });
    }
  };

  const updateEventContinent = async (eventId, newContinent) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      await axios.put(`/api/events/${eventId}`, { continent: newContinent }, { headers });
      toast({ title: "Continent Updated.", description: `Event continent changed to ${newContinent}.`, status: "success", duration: 3000, isClosable: true });
      fetchEvents();
    } catch (error) {
      console.error('Update Failed:', error);
      toast({ title: "Update Failed.", description: "Could not update event continent.", status: "error", duration: 5000, isClosable: true });
    }
  };

  const updateEventStaffing = async (eventId, newStaffing) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      await axios.put(`/api/events/${eventId}`, { staffing: newStaffing }, { headers });
      toast({ title: "Staffing Updated.", description: `Event staffing changed to ${newStaffing}.`, status: "success", duration: 3000, isClosable: true });
      fetchEvents();
    } catch (error) {
      console.error('Update Failed:', error);
      toast({ title: "Update Failed.", description: "Could not update event staffing.", status: "error", duration: 5000, isClosable: true });
    }
  };

  const updateEventStaffMembers = async (eventId, newStaffMembers) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      await axios.put(`/api/events/${eventId}`, { staff_members: newStaffMembers }, { headers });
      fetchEvents();
    } catch (error) {
      console.error('Update Failed:', error);
      toast({ title: "Update Failed.", description: "Could not update staff members.", status: "error", duration: 5000, isClosable: true });
    }
  };

  const handleNameChange = (eventId, value) => {
    setNameInput(prev => ({
      ...prev,
      [eventId]: value
    }));
  };

  const handleLocationChange = (eventId, value) => {
    setLocationInput(prev => ({
      ...prev,
      [eventId]: value
    }));
  };

  const handleNameBlur = (eventId, value) => {
    updateEventName(eventId, value);
  };

  const handleLocationBlur = (eventId, value) => {
    updateEventLocation(eventId, value);
  };

  const updateEventName = async (eventId, newName) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      await axios.put(`/api/events/${eventId}`, { name: newName }, { headers });
      fetchEvents();
    } catch (error) {
      console.error('Update Failed:', error);
      toast({ title: "Update Failed.", description: "Could not update event name.", status: "error", duration: 5000, isClosable: true });
    }
  };

  const updateEventLocation = async (eventId, newLocation) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      await axios.put(`/api/events/${eventId}`, { location: newLocation }, { headers });
      fetchEvents();
    } catch (error) {
      console.error('Update Failed:', error);
      toast({ title: "Update Failed.", description: "Could not update event location.", status: "error", duration: 5000, isClosable: true });
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
    navigate(`/events/${eventId}`);
  };

  const handleCreateEvent = () => {
    setShowCreateModal(true);
  };

  const getStatusColor = (status) => {
    const statusOption = customStatusOptions.find(opt => opt.label.toLowerCase() === status?.toLowerCase());
    return statusOption ? statusOption.color : 'gray';
  };

  const getActivationColor = (type) => {
    const typeOption = activationTypeOptions.find(opt => opt.label.toLowerCase() === type?.toLowerCase());
    return typeOption ? typeOption.color : 'gray';
  };

  const getPartnerColor = (partner) => {
    const partnerOption = partnerOptions.find(opt => opt.label.toLowerCase() === partner?.toLowerCase());
    return partnerOption ? partnerOption.color : 'gray';
  };

  const getContinentColor = (continent) => {
    const continentOption = continentOptions.find(opt => opt.label.toLowerCase() === continent?.toLowerCase());
    return continentOption ? continentOption.color : 'gray';
  };

  const getStaffingColor = (staffing) => {
    const staffingOption = staffingOptions.find(opt => opt.label.toLowerCase() === staffing?.toLowerCase());
    return staffingOption ? staffingOption.color : 'gray';
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
    if (!status) return '';
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
        </HStack>

        {viewMode === 'list' ? (
          <TableContainer bg={tableBg} borderWidth="1px" borderRadius="lg" boxShadow="sm">
            <Table variant="striped" colorScheme="gray">
              <Thead>
                <Tr>
                  <Th w="25%">Name</Th>
                  <Th w="15%">Date</Th>
                  <Th w="8%">Status</Th>
                  <Th w="8%">Activation Type</Th>
                  <Th w="8%">Partner</Th>
                  <Th w="8%">Continent</Th>
                  <Th w="8%">Staffing</Th>
                  <Th w="15%">Staff Member(s)</Th>
                  <Th w="5%">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredEvents.length > 0 ? (
                  filteredEvents.map(event => (
                    <Tr
                      key={event.event_id}
                      cursor="pointer"
                      _hover={{ bg: rowHoverBg }}
                    >
                      <Td onClick={() => handleEventClick(event.event_id)}>
                        <VStack align="start" spacing={0}>
                          <Input
                            value={nameInput[event.event_id] || ''}
                            onChange={(e) => handleNameChange(event.event_id, e.target.value)}
                            onBlur={(e) => handleNameBlur(event.event_id, e.target.value)}
                            placeholder="Event Name"
                            size="sm"
                            fontWeight="bold"
                            variant="unstyled" // Removed borders
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Input
                            value={locationInput[event.event_id] || ''}
                            onChange={(e) => handleLocationChange(event.event_id, e.target.value)}
                            onBlur={(e) => handleLocationBlur(event.event_id, e.target.value)}
                            placeholder="Location"
                            size="sm"
                            color="gray.500"
                            variant="unstyled" // Removed borders
                            onClick={(e) => e.stopPropagation()}
                          />
                        </VStack>
                      </Td>
                      <Td onClick={() => handleEventClick(event.event_id)}>{formatDateRange(event.start_date, event.end_date)}</Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={Button}
                            rightIcon={<ChevronDownIcon />}
                            bg={getStatusColor(event.status)}
                            color="white"
                            variant="solid"
                            size="sm"
                            minW="90px"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {capitalizeStatus(event.status)}
                          </MenuButton>
                          <Portal>
                            <MenuList
                              onClick={(e) => e.stopPropagation()}
                              zIndex={9999}
                              minW="180px"
                              maxW="250px"
                            >
                              {customStatusOptions.map(option => (
                                <MenuItem
                                  key={option.id}
                                  bg={menuBg}
                                  _hover={{ bg: menuHoverBg }}
                                  onClick={() => updateEventStatus(event.event_id, option.label)}
                                >
                                  <HStack spacing={3}>
                                    <Box w="15px" h="15px" borderRadius="full" bg={option.color} />
                                    <Text fontWeight="bold">{capitalizeStatus(option.label)}</Text>
                                  </HStack>
                                </MenuItem>
                              ))}
                              <MenuDivider />
                              <MenuItem onClick={onStatusModalOpen}>Manage Statuses</MenuItem>
                            </MenuList>
                          </Portal>
                        </Menu>
                      </Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={Button}
                            rightIcon={<ChevronDownIcon />}
                            bg={getActivationColor(event.activation_type)}
                            color="white"
                            variant="solid"
                            size="sm"
                            minW="90px"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {capitalizeStatus(event.activation_type)}
                          </MenuButton>
                          <Portal>
                            <MenuList
                              onClick={(e) => e.stopPropagation()}
                              zIndex={9999}
                              minW="180px"
                              maxW="250px"
                            >
                              {activationTypeOptions.map(option => (
                                <MenuItem
                                  key={option.id}
                                  bg={menuBg}
                                  _hover={{ bg: menuHoverBg }}
                                  onClick={() => updateEventActivationType(event.event_id, option.label)}
                                >
                                  <HStack spacing={3}>
                                    <Box w="15px" h="15px" borderRadius="full" bg={option.color} />
                                    <Text fontWeight="bold">{capitalizeStatus(option.label)}</Text>
                                  </HStack>
                                </MenuItem>
                              ))}
                              <MenuDivider />
                              <MenuItem onClick={onActivationModalOpen}>Manage Types</MenuItem>
                            </MenuList>
                          </Portal>
                        </Menu>
                      </Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={Button}
                            rightIcon={<ChevronDownIcon />}
                            bg={getPartnerColor(event.partner)}
                            color="white"
                            variant="solid"
                            size="sm"
                            minW="90px"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {capitalizeStatus(event.partner)}
                          </MenuButton>
                          <Portal>
                            <MenuList
                              onClick={(e) => e.stopPropagation()}
                              zIndex={9999}
                              minW="180px"
                              maxW="250px"
                            >
                              {partnerOptions.map(option => (
                                <MenuItem
                                  key={option.id}
                                  bg={menuBg}
                                  _hover={{ bg: menuHoverBg }}
                                  onClick={() => updateEventPartner(event.event_id, option.label)}
                                >
                                  <HStack spacing={3}>
                                    <Box w="15px" h="15px" borderRadius="full" bg={option.color} />
                                    <Text fontWeight="bold">{capitalizeStatus(option.label)}</Text>
                                  </HStack>
                                </MenuItem>
                              ))}
                              <MenuDivider />
                              <MenuItem onClick={onPartnerModalOpen}>Manage Partners</MenuItem>
                            </MenuList>
                          </Portal>
                        </Menu>
                      </Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={Button}
                            rightIcon={<ChevronDownIcon />}
                            bg={getContinentColor(event.continent)}
                            color="white"
                            variant="solid"
                            size="sm"
                            minW="90px"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {capitalizeStatus(event.continent)}
                          </MenuButton>
                          <Portal>
                            <MenuList
                              onClick={(e) => e.stopPropagation()}
                              zIndex={9999}
                              minW="180px"
                              maxW="250px"
                            >
                              {continentOptions.map(option => (
                                <MenuItem
                                  key={option.id}
                                  bg={menuBg}
                                  _hover={{ bg: menuHoverBg }}
                                  onClick={() => updateEventContinent(event.event_id, option.label)}
                                >
                                  <HStack spacing={3}>
                                    <Box w="15px" h="15px" borderRadius="full" bg={option.color} />
                                    <Text fontWeight="bold">{capitalizeStatus(option.label)}</Text>
                                  </HStack>
                                </MenuItem>
                              ))}
                              <MenuDivider />
                              <MenuItem onClick={onContinentModalOpen}>Manage Continents</MenuItem>
                            </MenuList>
                          </Portal>
                        </Menu>
                      </Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={Button}
                            rightIcon={<ChevronDownIcon />}
                            bg={getStaffingColor(event.staffing)}
                            color="white"
                            variant="solid"
                            size="sm"
                            minW="90px"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {capitalizeStatus(event.staffing)}
                          </MenuButton>
                          <Portal>
                            <MenuList
                              onClick={(e) => e.stopPropagation()}
                              zIndex={9999}
                              minW="180px"
                              maxW="250px"
                            >
                              {staffingOptions.map(option => (
                                <MenuItem
                                  key={option.id}
                                  bg={menuBg}
                                  _hover={{ bg: menuHoverBg }}
                                  onClick={() => updateEventStaffing(event.event_id, option.label)}
                                >
                                  <HStack spacing={3}>
                                    <Box w="15px" h="15px" borderRadius="full" bg={option.color} />
                                    <Text fontWeight="bold">{capitalizeStatus(option.label)}</Text>
                                  </HStack>
                                </MenuItem>
                              ))}
                              <MenuDivider />
                              <MenuItem onClick={onStaffingModalOpen}>Manage Staffing</MenuItem>
                            </MenuList>
                          </Portal>
                        </Menu>
                      </Td>
                      <Td>
                        <Input
                          value={staffMembersInput[event.event_id] || ''}
                          onChange={(e) => setStaffMembersInput(prev => ({ ...prev, [event.event_id]: e.target.value }))}
                          onBlur={(e) => updateEventStaffMembers(event.event_id, e.target.value)}
                          placeholder="Enter Staff Members"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<FaEllipsisV />}
                            variant="ghost"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <MenuList
                            onClick={(e) => e.stopPropagation()}
                            zIndex={9999}
                          >
                            <MenuItem onClick={() => navigate(`/events/${event.event_id}`)}>View Details</MenuItem>
                            <MenuItem>Manage Bookings</MenuItem>
                            <MenuItem>Allocate Items</MenuItem>
                            <MenuItem>Manage OTPs</MenuItem>
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={9} textAlign="center">
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

        <ActivationTypeManagementModal
          isOpen={isActivationModalOpen}
          onClose={onActivationModalClose}
          activationTypes={activationTypeOptions}
          fetchActivationTypes={fetchActivationTypeOptions}
        />

        <PartnerManagementModal
          isOpen={isPartnerModalOpen}
          onClose={onPartnerModalClose}
          partners={partnerOptions}
          fetchPartners={fetchPartnerOptions}
        />

        <ContinentManagementModal
          isOpen={isContinentModalOpen}
          onClose={onContinentModalClose}
          continents={continentOptions}
          fetchContinents={fetchContinentOptions}
        />

        <StaffingManagementModal
          isOpen={isStaffingModalOpen}
          onClose={onStaffingModalClose}
          staffingOptions={staffingOptions}
          fetchStaffingOptions={fetchStaffingOptions}
        />
      </VStack>
    </Box>
  );
};

export default EventsPage;