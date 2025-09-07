// src/components/EventCreationModal.js
import React, { useState } from 'react';
import axios from 'axios';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  useToast,
  Textarea,
} from '@chakra-ui/react';

const EventCreationModal = ({ isOpen, onClose, onCreationSuccess }) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateEvent = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      await axios.post(
        '/api/events',
        {
          name: formData.name,
          location: formData.location,
          start_date: formData.startDate,
          end_date: formData.endDate,
          notes: formData.notes,
        },
        { headers }
      );
      toast({
        title: 'Event created.',
        description: `Event "${formData.name}" has been created.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      onCreationSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create event:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.msg || 'Failed to create event.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create New Event</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Event Name</FormLabel>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Location</FormLabel>
              <Input
                name="location"
                value={formData.location}
                onChange={handleInputChange}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Start Date</FormLabel>
              <Input
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleInputChange}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>End Date</FormLabel>
              <Input
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleInputChange}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleCreateEvent}
            isLoading={isSubmitting}
            isDisabled={!formData.name || !formData.startDate || !formData.endDate}
          >
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EventCreationModal;