// src/pages/EventDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  Spinner,
  VStack,
  Divider,
  Button,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  useToast,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  IconButton,
} from '@chakra-ui/react';
import { Table, Thead, Tbody, Tr, Th, Td, TableContainer } from '@chakra-ui/table';
import { FaEdit, FaTrash } from 'react-icons/fa';
import ItemAllocationModal from '../components/ItemAllocationModal';

const EventDetailPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [bookedItems, setBookedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const toast = useToast();

  const { isOpen: isDeleteAlertOpen, onOpen: onOpenDeleteAlert, onClose: onCloseDeleteAlert } = useDisclosure();
  const { isOpen: isAllocationModalOpen, onOpen: onOpenAllocationModal, onClose: onCloseAllocationModal } = useDisclosure();
  const { isOpen: isRemoveAlertOpen, onOpen: onOpenRemoveAlert, onClose: onCloseRemoveAlert } = useDisclosure();
  const [itemToRemove, setItemToRemove] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editedLocation, setEditedLocation] = useState('');
  const cancelRef = React.useRef();

  const fetchEventDetails = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };

      const [eventRes, bookedItemsRes] = await Promise.all([
        axios.get(`/api/events/${eventId}`, { headers }),
        axios.get(`/api/events/${eventId}/allocated-items`, { headers })
      ]);

      setEvent(eventRes.data);
      setFormData(eventRes.data);
      setBookedItems(bookedItemsRes.data);
    } catch (error) {
      console.error('Failed to fetch event details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch event details.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, toast]);

  useEffect(() => {
    fetchEventDetails();
  }, [fetchEventDetails]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      // CORRECTED: Send the entire formData object with the updated status
      const updatedFormData = { ...formData, status: newStatus };
      await axios.put(`/api/events/${eventId}`, updatedFormData, { headers });
      
      // Update state directly for a snappier UI
      setFormData(updatedFormData);

      toast({
        title: 'Status updated.',
        description: `Event status changed to ${newStatus}.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to update event status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update event status.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      // Re-fetch to revert to the correct state if the update failed
      fetchEventDetails(); 
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      await axios.put(`/api/events/${eventId}`, formData, { headers });

      setIsEditing(false);
      fetchEventDetails();
      toast({
        title: 'Event updated.',
        description: 'The event details have been saved.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to save event:', error);
      toast({
        title: 'Error',
        description: 'Failed to save event details.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      await axios.delete(`/api/events/${eventId}`, { headers });

      toast({
        title: 'Event deleted.',
        description: 'The event was successfully deleted.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      navigate('/events');
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the event.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleRemoveItem = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      await axios.delete(`/api/events/${eventId}/allocated-items/${itemToRemove.item_id}`, { headers });
      
      onCloseRemoveAlert();
      fetchEventDetails();
      toast({
        title: 'Item Deallocated.',
        description: 'The item has been successfully removed from the event.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to deallocate item:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove the item from the event.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const openRemoveItemAlert = (item) => {
    setItemToRemove(item);
    onOpenRemoveAlert();
  };

  const handleEditLocation = (itemId, location) => {
    setEditingItemId(itemId);
    setEditedLocation(location);
  };

  const handleSaveLocation = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      await axios.put(`/api/events/${eventId}/allocated-items/${itemId}`, { pickup_location: editedLocation }, { headers });
      
      // Update state directly instead of re-fetching all data
      setBookedItems(prevItems =>
        prevItems.map(item =>
          item.item_id === itemId ? { ...item, pickup_location: editedLocation } : item
        )
      );

      setEditingItemId(null);
      toast({
        title: 'Location Updated.',
        description: 'The pickup location has been updated.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to update pickup location:', error);
      toast({
        title: 'Error',
        description: 'Failed to update pickup location.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleKeyPress = (e, itemId) => {
    if (e.key === 'Enter') {
      handleSaveLocation(itemId);
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="100%"><Spinner size="xl" /></Box>;
  }

  if (!event) {
    return <Heading>Event not found.</Heading>;
  }

  return (
    <Box>
      <VStack align="stretch" spacing={4} mb={8}>
        <HStack justifyContent="space-between">
          <Heading>{event.name}</Heading>
          <HStack>
            {isEditing ? (
              <>
                <Button colorScheme="green" onClick={handleSave}>Save</Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              </>
            ) : (
              <>
                <Button colorScheme="blue" onClick={() => setIsEditing(true)}>Edit Event</Button>
                <Button colorScheme="red" onClick={onOpenDeleteAlert}>Delete Event</Button>
              </>
            )}
          </HStack>
        </HStack>
        
        {isEditing ? (
          <VStack align="stretch" spacing={4}>
            <FormControl>
              <FormLabel>Event Name</FormLabel>
              <Input
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Location</FormLabel>
              <Input
                name="location"
                value={formData.location || ''}
                onChange={handleInputChange}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Start Date</FormLabel>
              <Input
                name="start_date"
                type="date"
                value={formData.start_date ? new Date(formData.start_date).toISOString().split('T')[0] : ''}
                onChange={handleInputChange}
              />
            </FormControl>
            <FormControl>
              <FormLabel>End Date</FormLabel>
              <Input
                name="end_date"
                type="date"
                value={formData.end_date ? new Date(formData.end_date).toISOString().split('T')[0] : ''}
                onChange={handleInputChange}
              />
            </FormControl>
          </VStack>
        ) : (
          <>
            <HStack>
              <Text><strong>Status:</strong></Text>
              <Select
                name="status"
                value={formData.status || ''}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                size="sm"
                width="200px"
              >
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="in progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </HStack>
            <Text><strong>Location:</strong> {event.location}</Text>
            <Text><strong>Dates:</strong> {new Date(event.start_date).toLocaleDateString()} to {new Date(event.end_date).toLocaleDateString()}</Text>
          </>
        )}
      </VStack>

      <Divider my={6} />
      
      <HStack justifyContent="space-between" mb={4}>
        <Heading size="lg">Booked Inventory</Heading>
        <Button onClick={onOpenAllocationModal} leftIcon={<FaEdit />} colorScheme="blue" size="sm">Manage Items</Button>
      </HStack>
      <TableContainer borderWidth="1px" borderRadius="lg">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Item Name</Th>
              <Th>Category</Th>
              <Th>Pickup Location</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {bookedItems.length > 0 ? (
              bookedItems.map((item, index) => (
                <Tr key={index}>
                  <Td>{item.unique_identifier}</Td>
                  <Td>{item.name}</Td>
                  <Td>{item.category}</Td>
                  <Td>
                    {editingItemId === item.item_id ? (
                      <HStack>
                        <Input
                          value={editedLocation}
                          onChange={(e) => setEditedLocation(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, item.item_id)}
                          size="sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveLocation(item.item_id)}
                          colorScheme="green"
                        >
                          Save
                        </Button>
                      </HStack>
                    ) : (
                      <HStack>
                        <Text>{item.pickup_location || 'Not set'}</Text>
                        <IconButton
                          icon={<FaEdit />}
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditLocation(item.item_id, item.pickup_location)}
                          aria-label={`Edit location for ${item.name}`}
                        />
                      </HStack>
                    )}
                  </Td>
                  <Td>
                    <IconButton
                      icon={<FaTrash />}
                      size="sm"
                      colorScheme="red"
                      onClick={() => openRemoveItemAlert(item)}
                      aria-label={`Remove ${item.name}`}
                    />
                  </Td>
                </Tr>
              ))
            ) : (
              <Tr><Td colSpan={5} textAlign="center">No items booked for this event yet.</Td></Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>

      <Divider my={6} />
      
      {isAllocationModalOpen && (
        <ItemAllocationModal 
          isOpen={isAllocationModalOpen} 
          onClose={onCloseAllocationModal} 
          eventId={eventId}
          onAllocationSuccess={fetchEventDetails}
          event={event}
        />
      )}

      {/* Confirmation Dialog for Deleting an Event */}
      <AlertDialog
        isOpen={isDeleteAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={onCloseDeleteAlert}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Event
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={handleDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Confirmation Dialog for Removing an Item */}
      <AlertDialog
        isOpen={isRemoveAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={onCloseRemoveAlert}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Remove Item
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to remove **{itemToRemove?.name}** from this event?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onCloseRemoveAlert}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleRemoveItem} ml={3}>
                Remove
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default EventDetailPage;