// williams-portal/src/components/OtpManagementModal.js
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
  Select,
  Text,
  useToast,
  Spinner,
  Input, // For session expiry date input
  Box, // ADDED: Import Box as it's used for displaying the generated OTP
} from '@chakra-ui/react';

const OtpManagementModal = ({ isOpen, onClose, event }) => {
  const [contractors, setContractors] = useState([]);
  const [selectedContractorId, setSelectedContractorId] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [contractorsLoading, setContractorsLoading] = useState(true);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(''); // New state for session expiry
  const toast = useToast();

  useEffect(() => {
    const fetchContractors = async () => {
      try {
        const token = localStorage.getItem('token');
        // Fetch only active contractors
        const { data } = await axios.get('/api/users?role=contractor&includeInactive=false', {
          headers: { 'x-auth-token': token },
        });
        setContractors(data);
      } catch (error) {
        console.error('Failed to fetch contractors:', error);
        toast({
          title: 'Error fetching contractors.',
          description: 'Could not load contractor list.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setContractorsLoading(false);
      }
    };

    if (isOpen) {
      fetchContractors();
      setGeneratedOtp(''); // Clear previous OTP when modal opens
      setSelectedContractorId(''); // Reset selected contractor
      // Set default session expiry to 24 hours from now
      const defaultExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      setSessionExpiresAt(defaultExpiry.toISOString().slice(0, 16)); // Format for datetime-local input
    }
  }, [isOpen, toast]);

  const handleGenerateOtp = async () => {
    if (!selectedContractorId) {
      toast({
        title: 'No contractor selected.',
        description: 'Please select a contractor to generate OTP.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setOtpLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        '/api/auth/otp/generate', // Changed to the auth OTP generation endpoint
        { userId: selectedContractorId, eventId: event.event_id, sessionExpiresAt },
        {
          headers: { 'x-auth-token': token },
        }
      );
      setGeneratedOtp(data.otp);
      toast({
        title: 'OTP Generated!',
        description: `OTP: ${data.otp}. Expires: ${new Date(sessionExpiresAt).toLocaleString()}`,
        status: 'success',
        duration: 9000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to generate OTP:', error);
      toast({
        title: 'Error generating OTP.',
        description: error.response?.data?.msg || 'Could not generate OTP.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setGeneratedOtp('');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Manage OTPs for {event?.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl mb={4}>
            <FormLabel>Select Contractor</FormLabel>
            {contractorsLoading ? (
              <Spinner size="sm" />
            ) : (
              <Select
                placeholder="Select contractor"
                value={selectedContractorId}
                onChange={(e) => setSelectedContractorId(e.target.value)}
              >
                {contractors.map((contractor) => (
                  <option key={contractor.user_id} value={contractor.user_id}>
                    {contractor.full_name} ({contractor.email})
                  </option>
                ))}
              </Select>
            )}
          </FormControl>

          <FormControl mb={4}>
            <FormLabel>OTP Session Expires At</FormLabel>
            <Input
              type="datetime-local"
              value={sessionExpiresAt}
              onChange={(e) => setSessionExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)} // Prevent setting expiry in the past
            />
            <Text fontSize="sm" color="gray.500" mt={1}>
              This sets how long the generated OTP will allow the contractor to stay logged in.
            </Text>
          </FormControl>

          <Button
            onClick={handleGenerateOtp}
            colorScheme="green"
            mb={4}
            isLoading={otpLoading}
            isDisabled={!selectedContractorId || !sessionExpiresAt}
          >
            Generate New OTP
          </Button>

          {generatedOtp && (
            <Box p={3} bg="green.50" borderRadius="md">
              <Text fontSize="lg" fontWeight="bold">
                Generated OTP: {generatedOtp}
              </Text>
              <Text fontSize="sm" color="gray.600">
                (Provide this to the contractor for event login)
              </Text>
            </Box>
          )}
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default OtpManagementModal;