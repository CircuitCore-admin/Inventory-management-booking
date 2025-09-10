// portal/src/pages/EventDetailPage.js
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Textarea
} from '@chakra-ui/react';
import { Table, Thead, Tbody, Tr, Th, Td, TableContainer } from '@chakra-ui/table';
import { FaEdit, FaTrash, FaTimes, FaFileAlt, FaComment, FaPaperclip } from 'react-icons/fa';
import ItemAllocationModal from '../components/ItemAllocationModal';

const EventDetailPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [bookedItems, setBookedItems] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [updates, setUpdates] = useState([]); // MODIFIED: Single state for all updates
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [newUpdateText, setNewUpdateText] = useState(''); // MODIFIED: Single state for text input
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewType, setPreviewType] = useState('');
  const { isOpen: isPreviewOpen, onOpen: onOpenPreview, onClose: onClosePreview } = useDisclosure();
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

      const [eventRes, bookedItemsRes, timelineRes] = await Promise.all([
        axios.get(`/api/events/${eventId}`, { headers }),
        axios.get(`/api/events/${eventId}/allocated-items`, { headers }),
        axios.get(`/api/audit/event/${eventId}`, { headers })
      ]);

      setEvent(eventRes.data);
      setFormData(eventRes.data);
      setBookedItems(bookedItemsRes.data);
      setTimeline(timelineRes.data);
      setUpdates(eventRes.data.updates); // MODIFIED: Fetch from the unified 'updates'
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
      const updatedFormData = { ...formData, status: newStatus };
      await axios.put(`/api/events/${eventId}`, updatedFormData, { headers });
      
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

// --- NEW UNIFIED FUNCTION ---
const handleAddUpdate = async () => {
    if (!newUpdateText.trim() && !selectedFile) {
        toast({
            title: 'No content to add.',
            description: 'Please write a note or select a file.',
            status: 'warning',
            duration: 3000,
            isClosable: true,
        });
        return;
    }

    const formData = new FormData();
    formData.append('note_text', newUpdateText);
    if (selectedFile) {
        formData.append('document', selectedFile);
    }

    try {
        const token = localStorage.getItem('token');
        const headers = { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' };
        await axios.post(
            `/api/events/${eventId}/updates`,
            formData,
            { headers }
        );
        setNewUpdateText('');
        setSelectedFile(null);
        toast({
            title: 'Update added.',
            description: 'Your comment and/or file has been added to the event.',
            status: 'success',
            duration: 3000,
            isClosable: true,
        });
        fetchEventDetails();
    } catch (error) {
        console.error('Error adding update:', error);
        toast({
            title: 'Error',
            description: 'Failed to add the update.',
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
    }
};

// --- NEW UNIFIED FUNCTION ---
const handleDeleteUpdate = async (updateId) => {
    try {
        const token = localStorage.getItem('token');
        const headers = { 'x-auth-token': token };
        await axios.delete(`/api/events/updates/${updateId}`, { headers });
        toast({
            title: 'Update deleted.',
            description: 'The update has been successfully deleted.',
            status: 'success',
            duration: 3000,
            isClosable: true,
        });
        fetchEventDetails();
    } catch (error) {
        console.error('Error deleting update:', error);
        toast({
            title: 'Error',
            description: 'Failed to delete the update.',
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
    }
};

const openQuickView = (update) => {
    setPreviewContent(update.file_path);
    setPreviewType(update.file_type);
    onOpenPreview();
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
      
      <VStack align="stretch" spacing={4}>
        <Heading size="lg">Event Updates 🚀</Heading>
        <Box>
            <Textarea
                placeholder="Add a new comment or attach a file..."
                value={newUpdateText}
                onChange={(e) => setNewUpdateText(e.target.value)}
                mb={2}
            />
            <HStack justifyContent="space-between">
              <Button leftIcon={<FaPaperclip />} as="label" htmlFor="file-upload">
                Attach File
              </Button>
              <Input id="file-upload" type="file" onChange={(e) => setSelectedFile(e.target.files[0])} style={{ display: 'none' }} />
              {selectedFile && <Text fontSize="sm">{selectedFile.name}</Text>}
              <Button colorScheme="blue" onClick={handleAddUpdate}>Add Update</Button>
            </HStack>
        </Box>
        <VStack align="stretch" spacing={4} maxH="500px" overflowY="auto">
            {updates.length > 0 ? (
                updates.map(update => (
                    <Box key={update.update_id} p={3} borderWidth="1px" borderRadius="md">
                        <HStack justifyContent="space-between">
                            <Text fontWeight="bold">
                                {update.uploaded_by_full_name}
                                {update.update_text && !update.file_path && <Text as="span" ml={2}><FaComment /></Text>}
                                {update.file_path && <Text as="span" ml={2}><FaPaperclip /></Text>}
                            </Text>
                            <IconButton icon={<FaTimes />} size="sm" onClick={() => handleDeleteUpdate(update.update_id)} aria-label="Delete update" />
                        </HStack>
                        {update.update_text && <Text mt={2}>{update.update_text}</Text>}
                        {update.file_path && (
                            <Button variant="link" onClick={() => openQuickView(update)} leftIcon={<FaFileAlt />} mt={2}>
                                {update.file_name} ({update.file_type})
                            </Button>
                        )}
                        <Text fontSize="sm" color="gray.500" mt={1}>
                            {new Date(update.uploaded_at).toLocaleString()}
                        </Text>
                    </Box>
                ))
            ) : (
                <Text>No updates for this event yet.</Text>
            )}
        </VStack>
      </VStack>

      <Divider my={6} />

      <Heading size="lg" mb={4}>Event Timeline</Heading>
      <VStack align="start" spacing={3}>
        {timeline.length > 0 ? (
          timeline.map((entry, index) => (
            <Box key={index} p={3} borderWidth="1px" borderRadius="md" w="100%">
              <HStack justifyContent="space-between">
                <Text fontWeight="bold">{entry.action}</Text>
                <Text fontSize="sm" color="gray.500">{new Date(entry.created_at).toLocaleString()}</Text>
              </HStack>
              <Text fontSize="sm" mt={1}>
                {entry.actor_full_name ? entry.actor_full_name : 'System'}
                {entry.details && `: ${JSON.stringify(entry.details)}`}
              </Text>
            </Box>
          ))
        ) : (
          <Text>No timeline events to display.</Text>
        )}
      </VStack>
      
      {isAllocationModalOpen && (
        <ItemAllocationModal 
          isOpen={isAllocationModalOpen} 
          onClose={onCloseAllocationModal} 
          eventId={eventId}
          onAllocationSuccess={fetchEventDetails}
          event={event}
        />
      )}

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
              <Button ref={cancelRef} onClick={onCloseDeleteAlert}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

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

      <Modal isOpen={isPreviewOpen} onClose={onClosePreview} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Document Quickview</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {previewType.includes('image') && <img src={previewContent} alt="Document Preview" />}
            {previewType === 'application/pdf' && <iframe src={previewContent} style={{ width: '100%', height: '75vh' }} title="PDF Preview" />}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClosePreview}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default EventDetailPage;