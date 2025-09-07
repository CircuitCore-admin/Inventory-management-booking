import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Button, VStack, HStack, FormControl, FormLabel, Input, Text, useToast, Box, IconButton
} from '@chakra-ui/react';
import axios from 'axios';
import { FaTrash, FaPlus, FaCheck } from 'react-icons/fa';

const PartnerManagementModal = ({ isOpen, onClose, partners, fetchPartners }) => {
  const [newPartnerLabel, setNewPartnerLabel] = useState('');
  const [newPartnerColor, setNewPartnerColor] = useState('#003366');
  const toast = useToast();

  const predefinedColors = [
    '#003366', '#212529', '#17a2b8', '#e83e8c', '#6f42c1', '#dc3545', '#ffc107', '#28a745',
    '#fd7e14', '#007bff', '#6c757d', '#f8f9fa', '#adb5bd', '#e9ecef', '#ced4da', '#ff5621'
  ];

  const handleCreatePartner = async () => {
    try {
      if (!newPartnerLabel) {
        toast({ title: "Label is required.", status: "error", duration: 3000, isClosable: true });
        return;
      }
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };

      await axios.post('/api/partners', { label: newPartnerLabel, color: newPartnerColor }, { headers });

      toast({ title: "Partner added.", description: `New partner '${newPartnerLabel}' has been created.`, status: "success", duration: 3000, isClosable: true });
      setNewPartnerLabel('');
      setNewPartnerColor('#003366');
      fetchPartners();
    } catch (error) {
      console.error('Failed to create partner', error);
      toast({ title: "Creation failed.", description: error.response?.data?.msg || "Could not add partner.", status: "error", duration: 5000, isClosable: true });
    }
  };

  const handleDeletePartner = async (partnerId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      
      await axios.delete(`/api/partners/${partnerId}`, { headers });
      
      toast({ title: "Partner deleted.", status: "success", duration: 3000, isClosable: true });
      fetchPartners();
    } catch (error) {
      console.error('Failed to delete partner', error);
      toast({ title: "Deletion failed.", description: "Could not delete partner.", status: "error", duration: 5000, isClosable: true });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Manage Partners</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontSize="md" fontWeight="semibold">Existing Partners:</Text>
            {partners.length > 0 ? (
              <VStack spacing={2} align="stretch">
                {partners.map(option => (
                  <HStack key={option.id} justifyContent="space-between" p={2} bg="gray.100" borderRadius="md">
                    <HStack>
                      <Box w="20px" h="20px" borderRadius="full" bg={option.color} mr={2} />
                      <Text>{option.label}</Text>
                    </HStack>
                    <IconButton aria-label="Delete partner" icon={<FaTrash />} size="sm" colorScheme="red" onClick={() => handleDeletePartner(option.id)} />
                  </HStack>
                ))}
              </VStack>
            ) : (
              <Text color="gray.500">No custom partners found.</Text>
            )}

            <Text fontSize="md" fontWeight="semibold" mt={4}>Add New Partner:</Text>
            <FormControl>
              <FormLabel>Label</FormLabel>
              <Input value={newPartnerLabel} onChange={(e) => setNewPartnerLabel(e.target.value)} placeholder="Enter partner label" />
            </FormControl>
            <FormControl>
              <FormLabel>Predefined Colors</FormLabel>
              <VStack spacing={2}>
                <HStack spacing={2} flexWrap="wrap">
                  {predefinedColors.slice(0, 8).map(color => (
                    <Box key={color} w="30px" h="30px" borderRadius="md" bg={color} cursor="pointer" border={newPartnerColor === color ? "2px solid white" : "none"} boxShadow="md" onClick={() => setNewPartnerColor(color)} display="flex" alignItems="center" justifyContent="center">
                      {newPartnerColor === color && <FaCheck color="white" />}
                    </Box>
                  ))}
                </HStack>
                <HStack spacing={2} flexWrap="wrap">
                  {predefinedColors.slice(8, 16).map(color => (
                    <Box key={color} w="30px" h="30px" borderRadius="md" bg={color} cursor="pointer" border={newPartnerColor === color ? "2px solid white" : "none"} boxShadow="md" onClick={() => setNewPartnerColor(color)} display="flex" alignItems="center" justifyContent="center">
                      {newPartnerColor === color && <FaCheck color="white" />}
                    </Box>
                  ))}
                </HStack>
              </VStack>
            </FormControl>
            <FormControl>
              <FormLabel>Or pick a custom color</FormLabel>
              <HStack>
                <Input type="color" value={newPartnerColor} onChange={(e) => setNewPartnerColor(e.target.value)} w="40px" h="40px" p={1} border="1px solid" borderColor="gray.200" borderRadius="md" />
                <Input value={newPartnerColor} onChange={(e) => setNewPartnerColor(e.target.value)} placeholder="e.g., #007bff" />
              </HStack>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button leftIcon={<FaPlus />} colorScheme="blue" onClick={handleCreatePartner}>Add Partner</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PartnerManagementModal;