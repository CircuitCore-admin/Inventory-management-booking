// src/pages/EventsPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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
  Select,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import EventCreationModal from '../components/EventCreationModal'; // New component for creating events

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
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
    let filtered = events.filter(event =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterStatus !== 'all') {
      filtered = filtered.filter(event => event.status.toLowerCase() === filterStatus);
    }

    return filtered;
  }, [events, searchTerm, filterStatus]);

  const handleEventClick = (eventId) => {
    navigate(`/events/${eventId}`);
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
        <Button colorScheme="blue" onClick={handleCreateEvent}>
          Create New Event
        </Button>
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
                  <VStack align="end" spacing={1}>
                    <HStack>
                      <Text fontWeight="bold">Dates:</Text>
                      <Text>{new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}</Text>
                    </HStack>
                    <Tag size="md" colorScheme={getStatusColor(event.status)} borderRadius="full">
                      <TagLabel>{event.status}</TagLabel>
                    </Tag>
                  </VStack>
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