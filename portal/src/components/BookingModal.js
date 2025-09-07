// src/components/BookingModal.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, useToast, VStack, Text, Spinner
} from '@chakra-ui/react';
import { Table, Thead, Tbody, Tr, Th, Td, TableContainer } from '@chakra-ui/table';

const BookingModal = ({ isOpen, onClose, event, onSuccess }) => {
  const [availableItems, setAvailableItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchAvailableItems = useCallback(async () => {
    if (!event) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`/api/items?available_for_event_id=${event.event_id}`, {
        headers: { 'x-auth-token': token },
      });
      setAvailableItems(data);
    } catch (error) {
      console.error('Failed to fetch available items', error);
    } finally {
      setLoading(false);
    }
  }, [event]);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableItems();
    }
  }, [isOpen, fetchAvailableItems]);

  const handleBookItem = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/bookings', 
        { item_id: itemId, event_id: event.event_id },
        { headers: { 'x-auth-token': token } }
      );
      toast({ title: 'Item Booked!', status: 'success', duration: 3000, isClosable: true });
      fetchAvailableItems(); // Refresh the list of available items
      onSuccess(); // Refresh the list on the detail page
    } catch (error) {
      toast({ title: 'Booking Failed', description: error.response?.data?.msg || 'An error occurred.', status: 'error', duration: 5000, isClosable: true });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Book Inventory for {event?.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {loading ? (
            <Spinner />
          ) : (
            <TableContainer>
              <Table variant="simple">
                <Thead><Tr><Th>Name</Th><Th>Category</Th><Th>Action</Th></Tr></Thead>
                <Tbody>
                  {availableItems.length > 0 ? availableItems.map(item => (
                    <Tr key={item.item_id}>
                      <Td>{item.name}</Td>
                      <Td>{item.category}</Td>
                      <Td>
                        <Button colorScheme="blue" size="sm" onClick={() => handleBookItem(item.item_id)}>
                          Book
                        </Button>
                      </Td>
                    </Tr>
                  )) : (
                    <Tr><Td colSpan={3}>No available items for this event's timeframe.</Td></Tr>
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Done</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BookingModal;