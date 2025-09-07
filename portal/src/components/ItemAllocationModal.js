// src/components/ItemAllocationModal.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  Checkbox,
  Flex,
  Text,
  useToast,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';

const ItemAllocationModal = ({ isOpen, onClose, event, onAllocationSuccess }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const toast = useToast();

  const fetchAvailableItems = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Fetch only items that are 'In Storage' and available
      const { data } = await axios.get(`http://localhost:3001/api/items?status=In Storage&excludeEventId=${event.event_id}`, {
        headers: { 'x-auth-token': token },
      });
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch available items:', error);
      toast({
        title: 'Error fetching items.',
        description: 'Unable to load available inventory. Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast, event]);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableItems();
      setSelectedItems({});
    }
  }, [isOpen, fetchAvailableItems]);

  const handleCheckboxChange = (item) => {
    setSelectedItems(prev => {
      const newSelected = { ...prev };
      if (newSelected[item.item_id]) {
        delete newSelected[item.item_id];
      } else {
        newSelected[item.item_id] = { ...item, pickupLocation: '' };
      }
      return newSelected;
    });
  };

  const handleLocationChange = (itemId, location) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        pickupLocation: location,
      },
    }));
  };

  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.unique_identifier.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const handleAllocate = async () => {
    if (Object.keys(selectedItems).length === 0) {
      toast({
        title: 'No items selected.',
        description: 'Please select at least one item to allocate.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const itemsToAllocate = Object.values(selectedItems).map(item => ({
      itemId: item.item_id,
      pickupLocation: item.pickupLocation,
    }));

    try {
      const token = localStorage.getItem('token');
      // Updated the API endpoint to be consistent with the other back-end routes
      await axios.post(
        `http://localhost:3001/api/events/${event.event_id}/allocate-items`,
        { items: itemsToAllocate },
        { headers: { 'x-auth-token': token } }
      );
      toast({
        title: 'Items Allocated.',
        description: `Successfully allocated ${itemsToAllocate.length} items to ${event.name}.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      // Call the success callback to refresh the parent component
      onAllocationSuccess();
      onClose();
    } catch (error) {
      console.error('Allocation failed:', error);
      toast({
        title: 'Allocation Failed.',
        description: 'There was an error allocating the items. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Allocate Hardware to "{event.name}"</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box mb={4}>
            <InputGroup>
              <InputLeftElement pointerEvents="none" children={<SearchIcon color="gray.300" />} />
              <Input
                placeholder="Search items by name or ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Box>

          {loading ? (
            <Flex justifyContent="center" alignItems="center" py={10}>
              <Spinner size="xl" />
            </Flex>
          ) : (
            <>
              <Text mb={2}>Select items to allocate and enter their picking locations:</Text>
              <TableContainer maxHeight="400px" overflowY="auto">
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Select</Th>
                      <Th>Item Name</Th>
                      <Th>Unique ID</Th>
                      <Th>Category</Th>
                      <Th>Picking Location</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredItems.length > 0 ? (
                      filteredItems.map(item => (
                        <Tr key={item.item_id}>
                          <Td>
                            <Checkbox
                              isChecked={!!selectedItems[item.item_id]}
                              onChange={() => handleCheckboxChange(item)}
                            />
                          </Td>
                          <Td>{item.name}</Td>
                          <Td>{item.unique_identifier}</Td>
                          <Td>{item.category}</Td>
                          <Td>
                            <Input
                              placeholder="e.g., Aisle 5, Shelf 2"
                              size="sm"
                              isDisabled={!selectedItems[item.item_id]}
                              value={selectedItems[item.item_id]?.pickupLocation || ''}
                              onChange={(e) => handleLocationChange(item.item_id, e.target.value)}
                            />
                          </Td>
                        </Tr>
                      ))
                    ) : (
                      <Tr>
                        <Td colSpan={5} textAlign="center">No available items found.</Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
              </TableContainer>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="green" mr={3} onClick={handleAllocate} isDisabled={Object.keys(selectedItems).length === 0}>
            Allocate Items ({Object.keys(selectedItems).length})
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ItemAllocationModal;