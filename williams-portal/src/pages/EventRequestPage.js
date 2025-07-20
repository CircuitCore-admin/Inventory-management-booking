// src/pages/EventRequestPage.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, FormControl, FormLabel, Input, Textarea, Button, VStack, useToast
} from '@chakra-ui/react';

const EventRequestPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    start_date: '',
    end_date: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/event-requests', formData, {
        headers: { 'x-auth-token': token }
      });

      toast({
        title: 'Request Submitted',
        description: 'Your event request has been sent for approval.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Navigate to the main events page or dashboard after submission
      navigate('/events'); 

    } catch (error) {
      console.error('Failed to submit event request:', error);
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting your request. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Heading mb={6}>Request a New Event</Heading>
      <Box as="form" onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <FormControl isRequired>
            <FormLabel>Event Name</FormLabel>
            <Input name="name" value={formData.name} onChange={handleChange} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Location</FormLabel>
            <Input name="location" value={formData.location} onChange={handleChange} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Start Date</FormLabel>
            <Input type="date" name="start_date" value={formData.start_date} onChange={handleChange} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>End Date</FormLabel>
            <Input type="date" name="end_date" value={formData.end_date} onChange={handleChange} />
          </FormControl>
          <FormControl>
            <FormLabel>Notes (e.g., requested gear, special requirements)</FormLabel>
            <Textarea name="notes" value={formData.notes} onChange={handleChange} />
          </FormControl>
          <Button 
            type="submit" 
            colorScheme="blue" 
            isLoading={isLoading}
            alignSelf="flex-start"
          >
            Submit Request
          </Button>
        </VStack>
      </Box>
    </Box>
  );
};

export default EventRequestPage;