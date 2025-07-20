// williams-portal/src/components/ItemFormModal.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Text,
  FormErrorMessage,
} from '@chakra-ui/react';

// Helper to generate a short unique string (like a UUID snippet)
const generateShortId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// Helper to map category to abbreviation for ID generation
const getCategoryAbbr = (category) => {
  switch (category.toLowerCase()) {
    case 'wheelbase': return 'WB';
    case 'steering wheel': return 'SW';
    case 'pedals': return 'PD';
    case 'rig': return 'RG';
    case 'pc': return 'PC';
    case 'monitor': return 'MN';
    case 'headphones': return 'HP';
    case 'keyboard': return 'KB';
    case 'accessories': return 'ACC';
    default: return 'GEN';
  }
};

const ItemFormModal = ({ isOpen, onClose, item, onSuccess }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [uniqueIdentifier, setUniqueIdentifier] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [status, setStatus] = useState('In Storage');
  const [location, setLocation] = useState('Main Warehouse');
  const [region, setRegion] = useState('EU');
  const [loading, setLoading] = useState(false);
  const [identifierError, setIdentifierError] = useState('');
  const identifierCheckTimeoutRef = useRef(null);
  const toast = useToast();

  const categories = useMemo(() => [
    'Wheelbase', 'Steering Wheel', 'Pedals', 'Rig', 'PC', 'Monitor',
    'Headphones', 'Keyboard', 'Accessories'
  ], []);

  const regions = useMemo(() => ['EU', 'US', 'ASIA', 'AFRICA', 'NORTH_AMERICA', 'OCEANIA', 'OTHER'], []);

  const suggestUniqueIdentifier = useCallback((cat, reg) => {
    const categoryAbbr = getCategoryAbbr(cat);
    const regionCode = reg ? reg.toUpperCase() : '';
    const timestampPart = Date.now().toString().substring(7);
    return `${categoryAbbr}${categoryAbbr ? '-' : ''}${regionCode}${regionCode ? '-' : ''}${generateShortId()}-${timestampPart}`;
  }, []);

  const generateUniqueIdentifier = useCallback(async (initialCategory, initialRegion, retries = 0) => {
    if (retries > 5) {
        setIdentifierError('Failed to generate a unique identifier after several attempts.');
        setLoading(false);
        return;
    }

    const suggestedId = suggestUniqueIdentifier(initialCategory, initialRegion);
    try {
        const token = localStorage.getItem('token'); // Get the token
        const response = await axios.get(`http://localhost:3001/api/items/check-identifier?identifier=${suggestedId}`, {
            headers: { 'x-auth-token': token }, // ADDED: Send the authentication token
        });
        if (response.data.exists) {
            await generateUniqueIdentifier(initialCategory, initialRegion, retries + 1);
        } else {
            setUniqueIdentifier(suggestedId);
            setIdentifierError('');
        }
    } catch (error) {
        console.error('Error checking unique identifier:', error);
        setIdentifierError('Could not verify identifier uniqueness.');
        setLoading(false);
    } finally {
        if (retries === 0) setLoading(false);
    }
  }, [suggestUniqueIdentifier]);

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setCategory(item.category || '');
      setUniqueIdentifier(item.unique_identifier || '');
      setPurchaseCost(item.purchase_cost != null ? String(item.purchase_cost) : '');
      setPurchaseDate(item.purchase_date ? item.purchase_date.split('T')[0] : '');
      setStatus(item.status || 'In Storage');
      setLocation(item.location || 'Main Warehouse');
      setRegion(item.region || 'EU');
    } else {
      setName('');
      setCategory(categories[0]);
      setPurchaseCost('');
      setPurchaseDate('');
      setStatus('In Storage');
      setLocation('Main Warehouse');
      setRegion('EU');
      setLoading(true);
      generateUniqueIdentifier(categories[0], 'EU');
    }
  }, [item, generateUniqueIdentifier, categories]);

  useEffect(() => {
    if (!item && category && region) {
      if (identifierCheckTimeoutRef.current) {
        clearTimeout(identifierCheckTimeoutRef.current);
      }
      setLoading(true);
      identifierCheckTimeoutRef.current = setTimeout(() => {
        generateUniqueIdentifier(category, region);
      }, 300);
    }
  }, [category, region, item, generateUniqueIdentifier]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setIdentifierError('');

    if (!item) {
        try {
            const token = localStorage.getItem('token'); // Get the token for final check
            const response = await axios.get(`http://localhost:3001/api/items/check-identifier?identifier=${uniqueIdentifier}`, {
                headers: { 'x-auth-token': token }, // ADDED: Send the authentication token
            });
            if (response.data.exists) {
                setIdentifierError('This unique identifier is already in use. Please generate a new one or modify manually.');
                setLoading(false);
                return;
            }
        } catch (error) {
            console.error('Error during final identifier check:', error);
            setIdentifierError('Could not verify identifier uniqueness prior to saving.');
            setLoading(false);
            return;
        }
    }

    const itemData = {
      name,
      category,
      unique_identifier: uniqueIdentifier,
      purchase_cost: purchaseCost === '' ? null : parseFloat(purchaseCost),
      purchase_date: purchaseDate === '' ? null : purchaseDate,
      status,
      location,
      region,
    };

    try {
      const token = localStorage.getItem('token');
      if (item) {
        await axios.put(`http://localhost:3001/api/items/${item.item_id}`, itemData, {
          headers: { 'x-auth-token': token },
        });
        toast({
          title: 'Item updated.',
          description: `"${name}" has been updated.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        await axios.post('http://localhost:3001/api/items', itemData, {
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
      onSuccess();
      onClose();
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
              <FormLabel>Region</FormLabel>
              <Select value={region} onChange={(e) => setRegion(e.target.value)}>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Item Name</FormLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FormControl>
            
            <FormControl isRequired>
              <FormLabel>Category</FormLabel>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select Category</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </Select>
            </FormControl>

            <FormControl isRequired isInvalid={!!identifierError}>
              <FormLabel>Unique Identifier</FormLabel>
              <Input 
                value={uniqueIdentifier} 
                onChange={(e) => setUniqueIdentifier(e.target.value)} 
                isReadOnly={!!item || loading}
              />
              {!item && <Text fontSize="xs" color="gray.500">Suggested. You can modify it.</Text>}
              {identifierError && <FormErrorMessage>{identifierError}</FormErrorMessage>}
              {!item && (
                <Button size="xs" mt={1} onClick={() => generateUniqueIdentifier(category, region)} isDisabled={loading}>
                  Regenerate ID
                </Button>
              )}
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