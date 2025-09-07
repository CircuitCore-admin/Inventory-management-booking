import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Button, VStack, HStack, FormControl, FormLabel, Input, Text, useToast, Box, IconButton
} from '@chakra-ui/react';
import axios from 'axios';
import { FaTrash, FaPlus, FaCheck } from 'react-icons/fa';

const ContinentManagementModal = ({ isOpen, onClose, continents, fetchContinents }) => {
  const [newContinentLabel, setNewContinentLabel] = useState('');
  const [newContinentColor, setNewContinentColor] = useState('#ff7f0e');
  const toast = useToast();

  const predefinedColors = [
    '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22',
    '#17becf', '#1f77b4', '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5', '#c49c94'
  ];

  const handleCreateContinent = async () => {
    try {
      if (!newContinentLabel) {
        toast({ title: "Label is required.", status: "error", duration: 3000, isClosable: true });
        return;
      }
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };

      await axios.post('/api/continents', { label: newContinentLabel, color: newContinentColor }, { headers });

      toast({ title: "Continent added.", description: `New continent '${newContinentLabel}' has been created.`, status: "success", duration: 3000, isClosable: true });
      setNewContinentLabel('');
      setNewContinentColor('#ff7f0e');
      fetchContinents();
    } catch (error) {
      console.error('Failed to create continent', error);
      toast({ title: "Creation failed.", description: error.response?.data?.msg || "Could not add continent.", status: "error", duration: 5000, isClosable: true });
    }
  };

  const handleDeleteContinent = async (continentId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      
      await axios.delete(`/api/continents/${continentId}`, { headers });
      
      toast({ title: "Continent deleted.", status: "success", duration: 3000, isClosable: true });
      fetchContinents();
    } catch (error) {
      console.error('Failed to delete continent', error);
      toast({ title: "Deletion failed.", description: "Could not delete continent.", status: "error", duration: 5000, isClosable: true });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Manage Continents</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontSize="md" fontWeight="semibold">Existing Continents:</Text>
            {continents.length > 0 ? (
              <VStack spacing={2} align="stretch">
                {continents.map(option => (
                  <HStack key={option.id} justifyContent="space-between" p={2} bg="gray.100" borderRadius="md">
                    <HStack>
                      <Box w="20px" h="20px" borderRadius="full" bg={option.color} mr={2} />
                      <Text>{option.label}</Text>
                    </HStack>
                    <IconButton aria-label="Delete continent" icon={<FaTrash />} size="sm" colorScheme="red" onClick={() => handleDeleteContinent(option.id)} />
                  </HStack>
                ))}
              </VStack>
            ) : (
              <Text color="gray.500">No custom continents found.</Text>
            )}

            <Text fontSize="md" fontWeight="semibold" mt={4}>Add New Continent:</Text>
            <FormControl>
              <FormLabel>Label</FormLabel>
              <Input value={newContinentLabel} onChange={(e) => setNewContinentLabel(e.target.value)} placeholder="Enter continent label" />
            </FormControl>
            <FormControl>
              <FormLabel>Predefined Colors</FormLabel>
              <VStack spacing={2}>
                <HStack spacing={2} flexWrap="wrap">
                  {predefinedColors.slice(0, 8).map(color => (
                    <Box key={color} w="30px" h="30px" borderRadius="md" bg={color} cursor="pointer" border={newContinentColor === color ? "2px solid white" : "none"} boxShadow="md" onClick={() => setNewContinentColor(color)} display="flex" alignItems="center" justifyContent="center">
                      {newContinentColor === color && <FaCheck color="white" />}
                    </Box>
                  ))}
                </HStack>
                <HStack spacing={2} flexWrap="wrap">
                  {predefinedColors.slice(8, 16).map(color => (
                    <Box key={color} w="30px" h="30px" borderRadius="md" bg={color} cursor="pointer" border={newContinentColor === color ? "2px solid white" : "none"} boxShadow="md" onClick={() => setNewContinentColor(color)} display="flex" alignItems="center" justifyContent="center">
                      {newContinentColor === color && <FaCheck color="white" />}
                    </Box>
                  ))}
                </HStack>
              </VStack>
            </FormControl>
            <FormControl>
              <FormLabel>Or pick a custom color</FormLabel>
              <HStack>
                <Input type="color" value={newContinentColor} onChange={(e) => setNewContinentColor(e.target.value)} w="40px" h="40px" p={1} border="1px solid" borderColor="gray.200" borderRadius="md" />
                <Input value={newContinentColor} onChange={(e) => setNewContinentColor(e.target.value)} placeholder="e.g., #ff7f0e" />
              </HStack>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button leftIcon={<FaPlus />} colorScheme="blue" onClick={handleCreateContinent}>Add Continent</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ContinentManagementModal;