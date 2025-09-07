// portal/src/components/StatusManagementModal.js
import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Text,
  useToast,
  Box,
  IconButton,
} from '@chakra-ui/react';
import axios from 'axios';
import { FaTrash, FaPlus } from 'react-icons/fa';

const StatusManagementModal = ({ isOpen, onClose, customStatusOptions, fetchCustomStatusOptions }) => {
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#5e6c84');
  const toast = useToast();

  const handleCreateStatus = async () => {
    try {
      if (!newStatusLabel) {
        toast({
          title: "Label is required.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };

      await axios.post(
        '/api/event-status-options',
        { label: newStatusLabel, color: newStatusColor },
        { headers }
      );

      toast({
        title: "Status added.",
        description: `New status '${newStatusLabel}' has been created.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setNewStatusLabel('');
      setNewStatusColor('#5e6c84');
      fetchCustomStatusOptions();
    } catch (error) {
      console.error('Failed to create status', error);
      toast({
        title: "Creation failed.",
        description: error.response?.data?.msg || "Could not add status.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteStatus = async (statusId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      
      await axios.delete(`/api/event-status-options/${statusId}`, { headers });
      
      toast({
        title: "Status deleted.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      fetchCustomStatusOptions();
    } catch (error) {
      console.error('Failed to delete status', error);
      toast({
        title: "Deletion failed.",
        description: "Could not delete status.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Manage Status Labels</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontSize="md" fontWeight="semibold">Existing Statuses:</Text>
            {customStatusOptions.length > 0 ? (
              <VStack spacing={2} align="stretch">
                {customStatusOptions.map(option => (
                  <HStack key={option.id} justifyContent="space-between" p={2} bg="gray.100" borderRadius="md">
                    <HStack>
                      <Box w="20px" h="20px" borderRadius="full" bg={option.color} mr={2} />
                      <Text>{option.label}</Text>
                    </HStack>
                    <IconButton
                      aria-label="Delete status"
                      icon={<FaTrash />}
                      size="sm"
                      colorScheme="red"
                      onClick={() => handleDeleteStatus(option.id)}
                    />
                  </HStack>
                ))}
              </VStack>
            ) : (
              <Text color="gray.500">No custom statuses found.</Text>
            )}

            <Text fontSize="md" fontWeight="semibold" mt={4}>Add New Status:</Text>
            <FormControl>
              <FormLabel>Label</FormLabel>
              <Input
                value={newStatusLabel}
                onChange={(e) => setNewStatusLabel(e.target.value)}
                placeholder="Enter status label"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Color</FormLabel>
              <HStack>
                <Input
                  type="color"
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                  w="50px"
                  p={0}
                  border="none"
                />
                <Input
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                  placeholder="e.g., #FF5733"
                />
              </HStack>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            leftIcon={<FaPlus />}
            colorScheme="blue"
            onClick={handleCreateStatus}
          >
            Add Status
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default StatusManagementModal;