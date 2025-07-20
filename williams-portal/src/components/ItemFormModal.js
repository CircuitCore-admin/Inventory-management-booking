// src/components/ItemFormModal.js
import React, { useState, useEffect } from 'react';
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
  Select,
  useToast,
  VStack,
} from '@chakra-ui/react';

const ItemFormModal = ({ isOpen, onClose, item, onSuccess }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [uniqueIdentifier, setUniqueIdentifier] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [status, setStatus] = useState('In Storage'); // Default status
  const [location, setLocation] = useState('Main Warehouse'); // Default location
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (item) { // If editing an existing item
      setName(item.name || '');
      setCategory(item.category || '');
      setUniqueIdentifier(item.unique_identifier || '');
      // Ensure purchase_cost is displayed correctly
      setPurchaseCost(item.purchase_cost != null ? String(item.purchase_cost) : '');
      // Format date for input: YYYY-MM-DD
      setPurchaseDate(item.purchase_date ? item.purchase_date.split('T')[0] : '');
      setStatus(item.status || 'In Storage');
      setLocation(item.location || 'Main Warehouse');
    } else { // If adding a new item, reset form
      setName('');
      setCategory('');
      setUniqueIdentifier('');
      setPurchaseCost('');
      setPurchaseDate('');
      setStatus('In Storage');
      setLocation('Main Warehouse');
    }
  }, [item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Prepare data, ensuring null for empty optional fields
    const itemData = {
      name,
      category,
      unique_identifier: uniqueIdentifier,
      // Convert to number or null
      purchase_cost: purchaseCost === '' ? null : parseFloat(purchaseCost),
      // Convert empty string to null for date
      purchase_date: purchaseDate === '' ? null : purchaseDate,
      status,
      location,
    };

    try {
      const token = localStorage.getItem('token');
      if (item) { // Update existing item
        await axios.put(`/api/items/${item.item_id}`, itemData, {
          headers: { 'x-auth-token': token },
        });
        toast({
          title: 'Item updated.',
          description: `"${name}" has been updated.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else { // Create new item
        await axios.post('/api/items', itemData, {
          headers: { 'x-auth-token': token },
        });
        toast({
          title: 'Item created.',
          description: `"${name}" has been added to inventory.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
      onSuccess(); // Refresh inventory list
      onClose(); // Close modal
    } catch (error) {
      console.error('Failed to save item:', error);
      toast({
        title: 'Error saving item.',
        description: error.response?.data?.msg || 'Could not save item.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{item ? 'Edit Item' : 'Add New Item'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack as="form" spacing={4} onSubmit={handleSubmit}>
            <FormControl isRequired>
              <FormLabel>Item Name</FormLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Category</FormLabel>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Unique Identifier</FormLabel>
              <Input value={uniqueIdentifier} onChange={(e) => setUniqueIdentifier(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Purchase Cost ($)</FormLabel>
              <Input type="number" step="0.01" value={purchaseCost} onChange={(e) => setPurchaseCost(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Purchase Date</FormLabel>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Status</FormLabel>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="In Storage">In Storage</option>
                <option value="In Transit">In Transit</option>
                <option value="In Use">In Use</option>
                <option value="In Repair">In Repair</option>
                <option value="Retired">Retired</option>
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Location</FormLabel>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose} mr={3}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleSubmit} isLoading={loading}>
            {item ? 'Save Changes' : 'Add Item'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ItemFormModal;