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
  IconButton
} from '@chakra-ui/react';
import axios from 'axios';
import { FaTrash, FaPlus, FaCheck } from 'react-icons/fa';

const ActivationTypeManagementModal = ({ isOpen, onClose, activationTypes, fetchActivationTypes }) => {
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#007bff');
  const toast = useToast();

  const predefinedColors = [
    '#007bff', '#28a745', '#fd7e14', '#dc3545', '#6c757d', '#ffb300', '#6554c0', '#17a2b8',
    '#e83e8c', '#6f42c1', '#f6f200ff', '#343a40', '#84a542ff', '#1adb1aff', '#ff0015ff', '#05e4c6ff',
  ];

  const handleCreateType = async () => {
    try {
      if (!newTypeLabel) {
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
        '/api/activation_types',
        { label: newTypeLabel, color: newTypeColor },
        { headers }
      );

      toast({
        title: "Activation Type added.",
        description: `New type '${newTypeLabel}' has been created.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setNewTypeLabel('');
      setNewTypeColor('#007bff');
      fetchActivationTypes();
    } catch (error) {
      console.error('Failed to create activation type', error);
      toast({
        title: "Creation failed.",
        description: error.response?.data?.msg || "Could not add activation type.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteType = async (typeId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'x-auth-token': token };
      
      await axios.delete(`/api/activation_types/${typeId}`, { headers });
      
      toast({
        title: "Activation Type deleted.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      fetchActivationTypes();
    } catch (error) {
      console.error('Failed to delete activation type', error);
      toast({
        title: "Deletion failed.",
        description: "Could not delete activation type.",
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
        <ModalHeader>Manage Activation Types</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontSize="md" fontWeight="semibold">Existing Activation Types:</Text>
            {activationTypes.length > 0 ? (
              <VStack spacing={2} align="stretch">
                {activationTypes.map(option => (
                  <HStack key={option.id} justifyContent="space-between" p={2} bg="gray.100" borderRadius="md">
                    <HStack>
                      <Box w="20px" h="20px" borderRadius="full" bg={option.color} mr={2} />
                      <Text>{option.label}</Text>
                    </HStack>
                    <IconButton
                      aria-label="Delete activation type"
                      icon={<FaTrash />}
                      size="sm"
                      colorScheme="red"
                      onClick={() => handleDeleteType(option.id)}
                    />
                  </HStack>
                ))}
              </VStack>
            ) : (
              <Text color="gray.500">No custom activation types found.</Text>
            )}

            <Text fontSize="md" fontWeight="semibold" mt={4}>Add New Activation Type:</Text>
            <FormControl>
              <FormLabel>Label</FormLabel>
              <Input
                value={newTypeLabel}
                onChange={(e) => setNewTypeLabel(e.target.value)}
                placeholder="Enter type label"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Predefined Colors</FormLabel>
              <VStack spacing={2}>
                <HStack spacing={2} flexWrap="wrap">
                  {predefinedColors.slice(0, 8).map(color => (
                    <Box
                      key={color}
                      w="30px"
                      h="30px"
                      borderRadius="md"
                      bg={color}
                      cursor="pointer"
                      border={newTypeColor === color ? "2px solid white" : "none"}
                      boxShadow="md"
                      onClick={() => setNewTypeColor(color)}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {newTypeColor === color && <FaCheck color="white" />}
                    </Box>
                  ))}
                </HStack>
                <HStack spacing={2} flexWrap="wrap">
                  {predefinedColors.slice(8, 16).map(color => (
                    <Box
                      key={color}
                      w="30px"
                      h="30px"
                      borderRadius="md"
                      bg={color}
                      cursor="pointer"
                      border={newTypeColor === color ? "2px solid white" : "none"}
                      boxShadow="md"
                      onClick={() => setNewTypeColor(color)}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {newTypeColor === color && <FaCheck color="white" />}
                    </Box>
                  ))}
                </HStack>
              </VStack>
            </FormControl>
            <FormControl>
              <FormLabel>Or pick a custom color</FormLabel>
              <HStack>
                <Input
                  type="color"
                  value={newTypeColor}
                  onChange={(e) => setNewTypeColor(e.target.value)}
                  w="40px"
                  h="40px"
                  p={1}
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="md"
                />
                <Input
                  value={newTypeColor}
                  onChange={(e) => setNewTypeColor(e.target.value)}
                  placeholder="e.g., #007bff"
                />
              </HStack>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            leftIcon={<FaPlus />}
            colorScheme="blue"
            onClick={handleCreateType}
          >
            Add Type
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ActivationTypeManagementModal;