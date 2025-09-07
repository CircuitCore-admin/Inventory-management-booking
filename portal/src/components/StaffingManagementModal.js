import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Button, VStack, HStack, FormControl, FormLabel, Input, Text, useToast, Box, IconButton
} from '@chakra-ui/react';
import axios from 'axios';
import { FaTrash, FaPlus, FaCheck } from 'react-icons/fa';

const StaffingManagementModal = ({ isOpen, onClose, staffingOptions, fetchStaffingOptions }) => {
  const [newStaffingLabel, setNewStaffingLabel] = useState('');
  const [newStaffingColor, setNewStaffingColor] = useState('#36b37e');
  const toast = useToast();

  const predefinedColors = [
    '#36b37e', '#ffb300', '#dc3545', '#007bff', '#17a2b8', '#6554c0', '#212529', '#e83e8c',
    '#6c757d', '#19d229ff', '#1b60a4ff', '#f9f509ff', '#28a745', '#495057', '#adb5bd', '#1f69b4ff',
  ];

  const handleCreateStaffing = async () => {
    try {
      if (!newStaffingLabel) {
        toast({ title: "Label is required.", status: "error", duration: 3000, isClosable: true });
        return;
      }
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };

      await axios.post('/api/staffing', { label: newStaffingLabel, color: newStaffingColor }, { headers });

      toast({ title: "Staffing option added.", description: `New staffing option '${newStaffingLabel}' has been created.`, status: "success", duration: 3000, isClosable: true });
      setNewStaffingLabel('');
      setNewStaffingColor('#36b37e');
      fetchStaffingOptions();
    } catch (error) {
      console.error('Failed to create staffing option', error);
      toast({ title: "Creation failed.", description: error.response?.data?.msg || "Could not add staffing option.", status: "error", duration: 5000, isClosable: true });
    }
  };

  const handleDeleteStaffing = async (staffingId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      
      await axios.delete(`/api/staffing/${staffingId}`, { headers });
      
      toast({ title: "Staffing option deleted.", status: "success", duration: 3000, isClosable: true });
      fetchStaffingOptions();
    } catch (error) {
      console.error('Failed to delete staffing option', error);
      toast({ title: "Deletion failed.", description: "Could not delete staffing option.", status: "error", duration: 5000, isClosable: true });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Manage Staffing Options</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontSize="md" fontWeight="semibold">Existing Staffing Options:</Text>
            {staffingOptions.length > 0 ? (
              <VStack spacing={2} align="stretch">
                {staffingOptions.map(option => (
                  <HStack key={option.id} justifyContent="space-between" p={2} bg="gray.100" borderRadius="md">
                    <HStack>
                      <Box w="20px" h="20px" borderRadius="full" bg={option.color} mr={2} />
                      <Text>{option.label}</Text>
                    </HStack>
                    <IconButton aria-label="Delete staffing option" icon={<FaTrash />} size="sm" colorScheme="red" onClick={() => handleDeleteStaffing(option.id)} />
                  </HStack>
                ))}
              </VStack>
            ) : (
              <Text color="gray.500">No custom staffing options found.</Text>
            )}

            <Text fontSize="md" fontWeight="semibold" mt={4}>Add New Staffing Option:</Text>
            <FormControl>
              <FormLabel>Label</FormLabel>
              <Input value={newStaffingLabel} onChange={(e) => setNewStaffingLabel(e.target.value)} placeholder="Enter staffing label" />
            </FormControl>
            <FormControl>
              <FormLabel>Predefined Colors</FormLabel>
              <VStack spacing={2}>
                <HStack spacing={2} flexWrap="wrap">
                  {predefinedColors.slice(0, 8).map(color => (
                    <Box key={color} w="30px" h="30px" borderRadius="md" bg={color} cursor="pointer" border={newStaffingColor === color ? "2px solid white" : "none"} boxShadow="md" onClick={() => setNewStaffingColor(color)} display="flex" alignItems="center" justifyContent="center">
                      {newStaffingColor === color && <FaCheck color="white" />}
                    </Box>
                  ))}
                </HStack>
                <HStack spacing={2} flexWrap="wrap">
                  {predefinedColors.slice(8, 16).map(color => (
                    <Box key={color} w="30px" h="30px" borderRadius="md" bg={color} cursor="pointer" border={newStaffingColor === color ? "2px solid white" : "none"} boxShadow="md" onClick={() => setNewStaffingColor(color)} display="flex" alignItems="center" justifyContent="center">
                      {newStaffingColor === color && <FaCheck color="white" />}
                    </Box>
                  ))}
                </HStack>
              </VStack>
            </FormControl>
            <FormControl>
              <FormLabel>Or pick a custom color</FormLabel>
              <HStack>
                <Input type="color" value={newStaffingColor} onChange={(e) => setNewStaffingColor(e.target.value)} w="40px" h="40px" p={1} border="1px solid" borderColor="gray.200" borderRadius="md" />
                <Input value={newStaffingColor} onChange={(e) => setNewStaffingColor(e.target.value)} placeholder="e.g., #36b37e" />
              </HStack>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button leftIcon={<FaPlus />} colorScheme="blue" onClick={handleCreateStaffing}>Add Option</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default StaffingManagementModal;