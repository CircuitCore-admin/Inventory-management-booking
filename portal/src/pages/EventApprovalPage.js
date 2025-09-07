// src/pages/EventApprovalPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Box, Heading, Spinner, Text, VStack, HStack, Button, useToast, Badge
} from '@chakra-ui/react';

const EventApprovalPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/event-requests', {
        headers: { 'x-auth-token': token },
      });
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch event requests:', error);
      toast({
        title: 'Error',
        description: 'Could not fetch event requests.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleStatusUpdate = async (requestId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/event-requests/${requestId}/status`, { status }, {
        headers: { 'x-auth-token': token },
      });
      toast({
        title: `Request ${status}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      // Refresh the list after updating
      fetchRequests();
    } catch (error) {
      console.error(`Failed to ${status.toLowerCase()} request:`, error);
      toast({
        title: 'Update Failed',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="100%"><Spinner size="xl" /></Box>;
  }

  return (
    <Box>
      <Heading mb={6}>Manage Event Requests</Heading>
      <VStack spacing={4} align="stretch">
        {requests.length > 0 ? requests.map(req => (
          <Box key={req.request_id} p={4} borderWidth="1px" borderRadius="lg" boxShadow="sm">
            <HStack justifyContent="space-between">
              <Box>
                <Heading size="md">{req.name}</Heading>
                <Text><strong>Requester:</strong> {req.requested_by_name}</Text>
                <Text><strong>Location:</strong> {req.location}</Text>
                <Text><strong>Dates:</strong> {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}</Text>
              </Box>
              <HStack>
                <Badge colorScheme={req.status === 'Approved' ? 'green' : req.status === 'Denied' ? 'red' : 'yellow'}>
                  {req.status}
                </Badge>
                {req.status === 'Pending' && (
                  <>
                    <Button colorScheme="green" size="sm" onClick={() => handleStatusUpdate(req.request_id, 'Approved')}>Approve</Button>
                    <Button colorScheme="red" size="sm" onClick={() => handleStatusUpdate(req.request_id, 'Denied')}>Deny</Button>
                  </>
                )}
              </HStack>
            </HStack>
            {req.notes && <Text mt={3}><strong>Notes:</strong> {req.notes}</Text>}
          </Box>
        )) : (
          <Text>No pending event requests.</Text>
        )}
      </VStack>
    </Box>
  );
};

export default EventApprovalPage;