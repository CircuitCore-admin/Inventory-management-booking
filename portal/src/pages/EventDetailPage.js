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
    Textarea,
    Tabs, 
    TabList, 
    TabPanels, 
    Tab, 
    TabPanel,
    Card,
    CardBody,
    Flex,
    Spacer,
    SimpleGrid,
    Icon,
    Progress
} from '@chakra-ui/react';
import { Table, Thead, Tbody, Tr, Th, Td, TableContainer } from '@chakra-ui/table';
import { FaEdit, FaTrash, FaTimes, FaFileAlt, FaComment, FaPaperclip, FaReply, FaCalendarAlt, FaMapMarkerAlt, FaBoxOpen, FaComments, FaHourglassHalf } from 'react-icons/fa';
import ItemAllocationModal from '../components/ItemAllocationModal';

// --- Helper Components ---

const StatCard = ({ icon, label, value, colorScheme }) => (
    <Card variant="outline">
        <CardBody>
            <HStack>
                <Flex
                    align="center"
                    justify="center"
                    borderRadius="lg"
                    bg={`${colorScheme}.100`}
                    p={3}
                >
                    <Icon as={icon} w={6} h={6} color={`${colorScheme}.600`} />
                </Flex>
                <Box>
                    <Heading size="md">{value}</Heading>
                    <Text color="gray.500">{label}</Text>
                </Box>
            </HStack>
        </CardBody>
    </Card>
);

const ReplyBox = ({ update, onAddUpdate, onCancel }) => {
    const [replyText, setReplyText] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

    return (
        <Box mt={4} p={4} bg="gray.50" borderRadius="md">
            <Textarea
                placeholder={`Replying to ${update.uploaded_by_full_name}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                mb={2}
                bg="white"
            />
            <HStack justifyContent="space-between">
                <Button leftIcon={<FaPaperclip />} size="sm" as="label" htmlFor={`file-upload-${update.update_id}`}>
                    Attach
                </Button>
                <Input id={`file-upload-${update.update_id}`} type="file" onChange={handleFileChange} style={{ display: 'none' }} />
                <HStack flexGrow={1} justifyContent="flex-end">
                  <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
                  <Button size="sm" colorScheme="blue" onClick={() => onAddUpdate(replyText, update.update_id, selectedFile)}>Reply</Button>
                </HStack>
            </HStack>
            {selectedFile && <Text fontSize="xs" color="gray.500" mt={1}>{selectedFile.name}</Text>}
        </Box>
    );
};


// --- Main Event Detail Page ---
const EventDetailPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  // State Hooks
  const [event, setEvent] = useState(null);
  const [bookedItems, setBookedItems] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [newUpdateText, setNewUpdateText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewType, setPreviewType] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [itemToRemove, setItemToRemove] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editedLocation, setEditedLocation] = useState('');
  const [tabIndex, setTabIndex] = useState(0); // State to control tabs
  
  // Disclosure Hooks for Modals/Alerts
  const { isOpen: isPreviewOpen, onOpen: onOpenPreview, onClose: onClosePreview } = useDisclosure();
  const { isOpen: isDeleteAlertOpen, onOpen: onOpenDeleteAlert, onClose: onCloseDeleteAlert } = useDisclosure();
  const { isOpen: isAllocationModalOpen, onOpen: onOpenAllocationModal, onClose: onCloseAllocationModal } = useDisclosure();
  const { isOpen: isRemoveAlertOpen, onOpen: onOpenRemoveAlert, onClose: onCloseRemoveAlert } = useDisclosure();
  const cancelRef = React.useRef();

  // --- Data Fetching ---
  const fetchEventDetails = useCallback(async () => {
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
      setUpdates(eventRes.data.updates);
    } catch (error) {
      console.error('Failed to fetch event details:', error);
      toast({ title: 'Error', description: 'Failed to fetch event details.', status: 'error', duration: 5000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [eventId, toast]);

  useEffect(() => {
    setLoading(true);
    fetchEventDetails();
  }, [fetchEventDetails]);

  // --- Event Handlers ---
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleUpdateStatus = async (newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/events/${eventId}`, { ...formData, status: newStatus }, { headers: { 'x-auth-token': token } });
      setEvent(prev => ({ ...prev, status: newStatus }));
      setFormData(prev => ({ ...prev, status: newStatus }));
      toast({ title: 'Status updated.', description: `Event status changed to ${newStatus}.`, status: 'success', duration: 3000, isClosable: true });
    } catch (error) {
      console.error('Failed to update event status:', error);
      toast({ title: 'Error', description: 'Failed to update event status.', status: 'error', duration: 5000, isClosable: true });
      fetchEventDetails(); 
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/events/${eventId}`, formData, { headers: { 'x-auth-token': token } });
      setIsEditing(false);
      fetchEventDetails();
      toast({ title: 'Event updated.', description: 'The event details have been saved.', status: 'success', duration: 5000, isClosable: true });
    } catch (error) {
      console.error('Failed to save event:', error);
      toast({ title: 'Error', description: 'Failed to save event details.', status: 'error', duration: 5000, isClosable: true });
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/events/${eventId}`, { headers: { 'x-auth-token': token } });
      toast({ title: 'Event deleted.', description: 'The event was successfully deleted.', status: 'success', duration: 5000, isClosable: true });
      navigate('/events');
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast({ title: 'Error', description: 'Failed to delete the event.', status: 'error', duration: 5000, isClosable: true });
    }
  };

  const handleRemoveItem = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/events/${eventId}/allocated-items/${itemToRemove.item_id}`, { headers: { 'x-auth-token': token } });
      onCloseRemoveAlert();
      fetchEventDetails();
      toast({ title: 'Item Deallocated.', description: 'The item has been removed from the event.', status: 'success', duration: 5000, isClosable: true });
    } catch (error) {
      console.error('Failed to deallocate item:', error);
      toast({ title: 'Error', description: 'Failed to remove the item.', status: 'error', duration: 5000, isClosable: true });
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
      await axios.put(`/api/events/${eventId}/allocated-items/${itemId}`, { pickup_location: editedLocation }, { headers: { 'x-auth-token': token } });
      fetchEventDetails();
      setEditingItemId(null);
      toast({ title: 'Location Updated.', description: 'The pickup location has been updated.', status: 'success', duration: 5000, isClosable: true });
    } catch (error) {
      console.error('Failed to update pickup location:', error);
      toast({ title: 'Error', description: 'Failed to update pickup location.', status: 'error', duration: 5000, isClosable: true });
    }
  };

  const handleKeyPress = (e, itemId) => e.key === 'Enter' && handleSaveLocation(itemId);

  const handleAddUpdate = async (text, parentId = null, file = null) => {
    if (!text.trim() && !file) {
      return toast({ title: 'No content to add.', description: 'Please write a note or select a file.', status: 'warning', duration: 3000, isClosable: true });
    }
    const updateFormData = new FormData();
    updateFormData.append('note_text', text);
    if (file) updateFormData.append('document', file);
    if (parentId) updateFormData.append('parent_id', parentId);
    try {
        const token = localStorage.getItem('token');
        await axios.post(`/api/events/${eventId}/updates`, updateFormData, { headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' } });
        setNewUpdateText('');
        setSelectedFile(null);
        setReplyingTo(null);
        toast({ title: 'Update added.', status: 'success', duration: 3000, isClosable: true });
        fetchEventDetails();
    } catch (error) {
        console.error('Error adding update:', error);
        toast({ title: 'Error', description: 'Failed to add the update.', status: 'error', duration: 5000, isClosable: true });
    }
  };

  const handleDeleteUpdate = async (updateId) => {
    try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/events/updates/${updateId}`, { headers: { 'x-auth-token': token } });
        toast({ title: 'Update deleted.', status: 'success', duration: 3000, isClosable: true });
        fetchEventDetails();
    } catch (error) {
        console.error('Error deleting update:', error);
        toast({ title: 'Error', description: 'Failed to delete the update.', status: 'error', duration: 5000, isClosable: true });
    }
  };

  const openQuickView = (update) => {
    try {
      const backendUrl = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3001';
      const normalizedPath = update.file_path.replace(/\\/g, '/');
      const fileUrl = `${backendUrl}/${normalizedPath}`;
      setPreviewContent(fileUrl);
      setPreviewType(update.file_type);
      onOpenPreview();
    } catch (error) {
        console.error('Error opening quick view:', error);
        toast({ title: 'Error', description: 'Could not load file for preview.', status: 'error', duration: 5000, isClosable: true });
    }
  };

  // --- Helper Functions for Dashboard ---
  const countTotalUpdates = (updates) => {
    let count = updates.length;
    for (const update of updates) {
      if (update.replies && update.replies.length > 0) {
        count += countTotalUpdates(update.replies);
      }
    }
    return count;
  };

  const calculateEventTiming = (startDate, endDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Normalize dates to midnight to compare only the date part
    now.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (now > end) {
        return "Completed";
    }
    if (now >= start && now <= end) {
        return "In Progress";
    }
    // If we are here, the event is in the future
    const diffTime = start - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} Day${diffDays !== 1 ? 's' : ''}`;
  };
  
  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('en-US', options);
    }
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  // --- Render Functions ---
  const renderUpdates = (updates, parentUpdate = null) => {
    return updates.map(update => (
        <Box key={update.update_id} pt={4}>
            <Box p={4} borderWidth="1px" borderRadius="md" bg={parentUpdate ? "white" : "gray.50"}>
                <HStack justifyContent="space-between">
                    <Text fontWeight="bold">{update.uploaded_by_full_name}</Text>
                    <div>
                        <IconButton icon={<FaReply />} size="sm" variant="ghost" onClick={() => setReplyingTo(update.update_id)} aria-label="Reply" mr={2} />
                        <IconButton icon={<FaTimes />} size="sm" variant="ghost" colorScheme="red" onClick={() => handleDeleteUpdate(update.update_id)} aria-label="Delete" />
                    </div>
                </HStack>
                {parentUpdate && <Text fontSize="sm" color="gray.500" mt={2}>Replying to <strong>@{parentUpdate.uploaded_by_full_name}</strong></Text>}
                {update.update_text && <Text mt={2}>{update.update_text}</Text>}
                {update.file_path && (
                    <Button variant="link" onClick={() => openQuickView(update)} leftIcon={<FaFileAlt />} mt={2}>
                        {update.file_name} ({update.file_type})
                    </Button>
                )}
                <Text fontSize="xs" color="gray.500" mt={2}>{new Date(update.uploaded_at).toLocaleString()}</Text>
                {replyingTo === update.update_id && <ReplyBox update={update} onAddUpdate={handleAddUpdate} onCancel={() => setReplyingTo(null)} />}
            </Box>
            {update.replies && update.replies.length > 0 && (
                <Box pl={6} borderLeft="2px solid" borderColor="gray.200" ml={3}>
                    {renderUpdates(update.replies, update)}
                </Box>
            )}
        </Box>
    ));
  };
  
  // --- Loading and Not Found States ---
  if (loading) return <Flex justify="center" align="center" height="80vh"><Spinner size="xl" /></Flex>;
  if (!event) return <Heading>Event not found.</Heading>;

  // --- Main Component Render ---
  return (
    <Box p={5}>
      {/* --- Main Header --- */}
      <Flex align="center" mb={4}>
        <Box>
            <Heading size="lg">{event.name}</Heading>
            <HStack color="gray.600" mt={2}>
                <HStack><Icon as={FaMapMarkerAlt} /><Text>{event.location}</Text></HStack>
                <HStack><Icon as={FaCalendarAlt} /><Text>{formatDateRange(event.start_date, event.end_date)}</Text></HStack>
            </HStack>
        </Box>
        <Spacer />
        <HStack>
            <Button colorScheme="blue" onClick={() => setIsEditing(true)}>Edit Event</Button>
            <Button colorScheme="red" onClick={onOpenDeleteAlert}>Delete Event</Button>
        </HStack>
      </Flex>
      
      {/* --- Dashboard Header --- */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={5} mb={6}>
        <StatCard 
            label="Event Status" 
            value={event.status} 
            icon={FaHourglassHalf}
            colorScheme="yellow"
        />
        <StatCard 
            label="Allocated Items" 
            value={bookedItems.length} 
            icon={FaBoxOpen}
            colorScheme="blue"
        />
        <StatCard 
            label="Total Updates" 
            value={countTotalUpdates(updates)} 
            icon={FaComments}
            colorScheme="green"
        />
        <StatCard 
            label="Event Timing" 
            value={calculateEventTiming(event.start_date, event.end_date)} 
            icon={FaCalendarAlt}
            colorScheme="purple"
        />
      </SimpleGrid>

      {/* --- Tabbed Content --- */}
      <Tabs isLazy colorScheme="blue" index={tabIndex} onChange={(index) => setTabIndex(index)}>
        <TabList>
          <Tab>Inventory</Tab>
          <Tab>Updates & Notes</Tab>
          <Tab>Timeline</Tab>
        </TabList>
        <TabPanels>
          {/* Inventory Panel */}
          <TabPanel>
            <HStack justify="flex-end" mb={4}><Button onClick={onOpenAllocationModal} leftIcon={<FaEdit />} colorScheme="blue" size="sm">Manage Items</Button></HStack>
            <TableContainer borderWidth="1px" borderRadius="lg"><Table variant="simple">
                <Thead><Tr><Th>ID</Th><Th>Item Name</Th><Th>Category</Th><Th>Pickup Location</Th><Th>Actions</Th></Tr></Thead>
                <Tbody>{bookedItems.length > 0 ? (bookedItems.map((item) => (
                    <Tr key={item.item_id}><Td>{item.unique_identifier}</Td><Td>{item.name}</Td><Td>{item.category}</Td>
                    <Td>{editingItemId === item.item_id ? (
                        <HStack><Input value={editedLocation} onChange={(e) => setEditedLocation(e.target.value)} onKeyDown={(e) => handleKeyPress(e, item.item_id)} size="sm" />
                        <Button size="sm" onClick={() => handleSaveLocation(item.item_id)} colorScheme="green">Save</Button></HStack>
                    ) : (
                        <HStack><Text>{item.pickup_location || 'Not set'}</Text><IconButton icon={<FaEdit />} size="sm" variant="ghost" onClick={() => handleEditLocation(item.item_id, item.pickup_location)} /></HStack>
                    )}</Td>
                    <Td><IconButton icon={<FaTrash />} size="sm" colorScheme="red" onClick={() => openRemoveItemAlert(item)} /></Td></Tr>
                ))) : (<Tr><Td colSpan={5} textAlign="center">No items booked for this event yet.</Td></Tr>)}</Tbody>
            </Table></TableContainer>
          </TabPanel>

          {/* Updates & Notes Panel */}
          <TabPanel>
            <VStack align="stretch" spacing={4}>
              <Box><Textarea placeholder="Add a new comment or attach a file..." value={newUpdateText} onChange={(e) => setNewUpdateText(e.target.value)} mb={2} />
                <HStack justifyContent="space-between"><Button leftIcon={<FaPaperclip />} as="label" htmlFor="file-upload">Attach File</Button>
                <Input id="file-upload" type="file" onChange={(e) => setSelectedFile(e.target.files[0])} style={{ display: 'none' }} />
                {selectedFile && <Text fontSize="sm">{selectedFile.name}</Text>}<Button colorScheme="blue" onClick={() => handleAddUpdate(newUpdateText, null, selectedFile)}>Add Update</Button></HStack>
              </Box>
              <VStack align="stretch" spacing={4} maxH="60vh" overflowY="auto" p={2}>
                {updates.length > 0 ? renderUpdates(updates) : <Text>No updates for this event yet.</Text>}
              </VStack>
            </VStack>
          </TabPanel>

          {/* Timeline Panel */}
          <TabPanel>
            <VStack align="start" spacing={3}>
              {timeline.length > 0 ? (timeline.map((entry, index) => (
                <Box key={index} p={3} borderWidth="1px" borderRadius="md" w="100%">
                  <HStack justifyContent="space-between"><Text fontWeight="bold">{entry.action}</Text><Text fontSize="sm" color="gray.500">{new Date(entry.created_at).toLocaleString()}</Text></HStack>
                  <Text fontSize="sm" mt={1}>{entry.actor_full_name ? entry.actor_full_name : 'System'}{entry.details && `: ${JSON.stringify(entry.details)}`}</Text>
                </Box>
              ))) : (<Text>No timeline events to display.</Text>)}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
      
      {/* --- Modals and Alerts --- */}
      {isEditing && (
        <Modal isOpen={isEditing} onClose={() => setIsEditing(false)}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Edit Event Details</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack align="stretch" spacing={4}>
                        <FormControl><FormLabel>Event Name</FormLabel><Input name="name" value={formData.name || ''} onChange={handleInputChange} /></FormControl>
                        <FormControl><FormLabel>Location</FormLabel><Input name="location" value={formData.location || ''} onChange={handleInputChange} /></FormControl>
                        <HStack>
                            <FormControl><FormLabel>Start Date</FormLabel><Input name="start_date" type="date" value={formData.start_date ? new Date(formData.start_date).toISOString().split('T')[0] : ''} onChange={handleInputChange} /></FormControl>
                            <FormControl><FormLabel>End Date</FormLabel><Input name="end_date" type="date" value={formData.end_date ? new Date(formData.end_date).toISOString().split('T')[0] : ''} onChange={handleInputChange} /></FormControl>
                        </HStack>
                        <FormControl><FormLabel>Status</FormLabel>
                            <Select name="status" value={formData.status || ''} onChange={handleInputChange}>
                                <option value="approved">Approved</option><option value="pending">Pending</option><option value="in progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                            </Select>
                        </FormControl>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button colorScheme="blue" onClick={handleSave} ml={3}>Save Changes</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
      )}

      {isAllocationModalOpen && <ItemAllocationModal isOpen={isAllocationModalOpen} onClose={onCloseAllocationModal} eventId={eventId} onAllocationSuccess={fetchEventDetails} event={event} />}
      <AlertDialog isOpen={isDeleteAlertOpen} leastDestructiveRef={cancelRef} onClose={onCloseDeleteAlert}>
        <AlertDialogOverlay><AlertDialogContent><AlertDialogHeader>Delete Event</AlertDialogHeader><AlertDialogBody>Are you sure? This action cannot be undone.</AlertDialogBody>
        <AlertDialogFooter><Button ref={cancelRef} onClick={onCloseDeleteAlert}>Cancel</Button><Button colorScheme="red" onClick={handleDelete} ml={3}>Delete</Button></AlertDialogFooter>
        </AlertDialogContent></AlertDialogOverlay>
      </AlertDialog>
      <AlertDialog isOpen={isRemoveAlertOpen} leastDestructiveRef={cancelRef} onClose={onCloseRemoveAlert}>
        <AlertDialogOverlay><AlertDialogContent><AlertDialogHeader>Remove Item</AlertDialogHeader><AlertDialogBody>Are you sure you want to remove **{itemToRemove?.name}** from this event?</AlertDialogBody>
        <AlertDialogFooter><Button ref={cancelRef} onClick={onCloseRemoveAlert}>Cancel</Button><Button colorScheme="red" onClick={handleRemoveItem} ml={3}>Remove</Button></AlertDialogFooter>
        </AlertDialogContent></AlertDialogOverlay>
      </AlertDialog>
      <Modal isOpen={isPreviewOpen} onClose={onClosePreview} size="xl">
        <ModalOverlay /><ModalContent><ModalHeader>Document Quickview</ModalHeader><ModalCloseButton />
        <ModalBody>{previewType.includes('image') ? <img src={previewContent} alt="Preview" style={{ width: '100%' }} /> : <iframe src={previewContent} style={{ width: '100%', height: '75vh' }} title="PDF Preview" />}</ModalBody>
        <ModalFooter><Button onClick={onClosePreview}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default EventDetailPage;