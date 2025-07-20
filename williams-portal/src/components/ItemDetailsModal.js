// src/components/ItemDetailsModal.js
import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  VStack,
  HStack,
  Spacer,
  Badge,
  Heading, // ADDED: Import Heading
} from '@chakra-ui/react';

const ItemDetailsModal = ({ isOpen, onClose, item }) => {
  if (!item) return null; // Don't render if no item is passed

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{item.name} Details</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="start" spacing={3}>
            <HStack w="100%">
              <Text fontWeight="bold">Unique Identifier:</Text>
              <Text>{item.unique_identifier}</Text>
              <Spacer />
              <Badge colorScheme={item.status === 'In Repair' ? 'red' : item.status === 'In Storage' ? 'green' : 'blue'}>
                {item.status}
              </Badge>
            </HStack>
            <HStack w="100%">
              <Text fontWeight="bold">Category:</Text>
              <Text>{item.category}</Text>
            </HStack>
            <HStack w="100%">
              <Text fontWeight="bold">Location:</Text>
              <Text>{item.location}</Text>
            </HStack>
            <HStack w="100%">
              <Text fontWeight="bold">Purchase Cost:</Text>
              <Text>${item.purchase_cost ? parseFloat(item.purchase_cost).toFixed(2) : '0.00'}</Text>
            </HStack>
            <HStack w="100%">
              <Text fontWeight="bold">Purchase Date:</Text>
              <Text>{item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'N/A'}</Text>
            </HStack>

            {/* Placeholder for QR Code and Media */}
            <Heading size="md" mt={4} mb={2}>Attached Media & QR Code</Heading>
            <Text>
              QR Code and attached media (pictures, manuals) will appear here.
              <br/> (Future Development)
            </Text>
            {/* Example: <Image src={qrCodeUrl} alt="QR Code" /> */}
            {/* Example: <Link href={manualUrl} isExternal>View Manual</Link> */}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ItemDetailsModal;