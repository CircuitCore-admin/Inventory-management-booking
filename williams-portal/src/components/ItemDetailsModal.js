// src/components/ItemDetailsModal.js
import React, { useState, useEffect, useCallback } from 'react';
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
  Text,
  VStack,
  HStack,
  Spacer,
  Badge,
  Heading,
  Image,
  FormControl, FormLabel, Input, Select,
  CloseButton,
  Spinner,
} from '@chakra-ui/react';

const ItemDetailsModal = ({ isOpen, onClose, item }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [itemMedia, setItemMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [mediaType, setMediaType] = useState('image'); // 'image' or 'manual'
  const [mediaDescription, setMediaDescription] = useState('');
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [qrLoading, setQrLoading] = useState(true);

  // Base URL for backend files, assuming 'public/uploads' is served from root
  const BACKEND_BASE_URL = 'http://localhost:3000'; // Adjust if your backend is on a different port/domain

  const fetchQrCode = useCallback(async () => {
    if (!item?.item_id) {
      setQrLoading(false);
      return;
    }
    setQrLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${BACKEND_BASE_URL}/api/items/${item.item_id}/qrcode`, {
        headers: { 'x-auth-token': token },
      });
      setQrCodeDataUrl(data.qrCodeDataUrl);
    } catch (error) {
      console.error('Failed to fetch QR code:', error);
      setQrCodeDataUrl('');
    } finally {
      setQrLoading(false);
    }
  }, [item, BACKEND_BASE_URL]);

  const fetchItemMedia = useCallback(async () => {
    if (!item?.item_id) {
      setLoadingMedia(false);
      return;
    }
    setLoadingMedia(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${BACKEND_BASE_URL}/api/items/${item.item_id}/media`, {
        headers: { 'x-auth-token': token },
      });
      setItemMedia(data);
    } catch (error) {
      console.error('Failed to fetch item media:', error);
      setItemMedia([]);
    } finally {
      setLoadingMedia(false);
    }
  }, [item, BACKEND_BASE_URL]);

  useEffect(() => {
    if (isOpen && item) {
      fetchQrCode();
      fetchItemMedia();
    }
  }, [isOpen, item, fetchQrCode, fetchItemMedia]);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);

    // NEW LOGIC: Suggest media type based on file extension
    if (uploadedFile) {
      const fileExtension = uploadedFile.name.split('.').pop().toLowerCase();
      if (fileExtension === 'pdf') {
        setMediaType('manual');
      } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        setMediaType('image');
      }
      // You can add more conditions here for other types if needed
    }
  };

  const handleMediaSubmit = async () => {
    if (!file || !mediaType) {
      alert('Please select a file and media type.');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('media_type', mediaType);
    formData.append('description', mediaDescription);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BACKEND_BASE_URL}/api/items/${item.item_id}/media`, formData, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Media uploaded successfully!');
      setFile(null);
      setMediaDescription('');
      setMediaType('image'); // Reset for next upload
      fetchItemMedia(); // Refresh media list
    } catch (error) {
      console.error('Error uploading media:', error);
      alert('Failed to upload media. See console for details.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    if (!window.confirm('Are you sure you want to delete this media?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BACKEND_BASE_URL}/api/items/media/${mediaId}`, {
        headers: { 'x-auth-token': token },
      });
      alert('Media deleted successfully!');
      fetchItemMedia(); // Refresh media list
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('Failed to delete media. See console for details.');
    }
  };

  const handlePrintQrCode = () => {
    if (qrCodeDataUrl) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code for ${item.name}</title>
            <style>
              body { font-family: sans-serif; text-align: center; }
              img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
              p { margin-top: 10px; font-size: 1.2em; }
            </style>
          </head>
          <body>
            <h1>${item.name}</h1>
            <p>Unique ID: ${item.unique_identifier}</p>
            <img src="${qrCodeDataUrl}" onload="window.print();window.close()" />
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      alert('QR Code not available to print.');
    }
  };


  if (!item) return null;

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

            {/* QR Code Section */}
            <Heading size="md" mt={4} mb={2}>QR Code</Heading>
            {qrLoading ? (
              <Spinner size="md" />
            ) : qrCodeDataUrl ? (
              <VStack>
                <Image src={qrCodeDataUrl} alt={`QR Code for ${item.unique_identifier}`} boxSize="200px" objectFit="contain" border="1px solid lightgray" p={2} />
                <Button size="sm" onClick={handlePrintQrCode}>Print QR Code</Button>
              </VStack>
            ) : (
              <Text>Failed to load QR Code.</Text>
            )}

            {/* Item Media Section */}
            <Heading size="md" mt={4} mb={2}>Attached Media</Heading>
            <VStack align="stretch" spacing={3} w="100%">
              {loadingMedia ? (
                <Spinner size="md" />
              ) : itemMedia.length > 0 ? (
                itemMedia.map((media) => (
                  <HStack key={media.media_id} p={2} borderWidth="1px" borderRadius="md" justifyContent="space-between" alignItems="center">
                    {/* Use a robust way to check if it's an image that can be rendered */}
                    {media.media_type === 'image' && (
                      <Image src={`${BACKEND_BASE_URL}${media.media_url}`} alt={media.description || media.media_type} boxSize="80px" objectFit="cover" mr={2} fallbackSrc="https://via.placeholder.com/80?text=Image+Error" />
                    )}
                    <VStack align="start" spacing={0} flex="1">
                      <Text fontWeight="bold">{media.description || media.media_type}</Text>
                      {media.media_type === 'manual' ? (
                        <a href={`${BACKEND_BASE_URL}${media.media_url}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="link" size="sm">View Manual (PDF)</Button>
                        </a>
                      ) : (
                        <Text fontSize="sm" color="gray.500">{media.media_url.split('/').pop()}</Text>
                      )}
                      <Text fontSize="xs" color="gray.400">Uploaded: {new Date(media.uploaded_at).toLocaleDateString()}</Text>
                    </VStack>
                    <CloseButton onClick={() => handleDeleteMedia(media.media_id)} />
                  </HStack>
                ))
              ) : (
                <Text>No media attached.</Text>
              )}
            </VStack>

            {/* Upload Media Form */}
            <Heading size="md" mt={4} mb={2}>Upload New Media</Heading>
            <VStack as="form" spacing={3} w="100%" onSubmit={(e) => { e.preventDefault(); handleMediaSubmit(); }}>
              <FormControl>
                <FormLabel>File</FormLabel>
                <Input type="file" onChange={handleFileUpload} p={1} />
              </FormControl>
              <FormControl>
                <FormLabel>Media Type</FormLabel>
                <Select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
                  <option value="image">Image (e.g., condition photo)</option>
                  <option value="manual">Manual / Guide (PDF)</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Description (Optional)</FormLabel>
                <Input value={mediaDescription} onChange={(e) => setMediaDescription(e.target.value)} />
              </FormControl>
              <Button type="submit" colorScheme="blue" isLoading={uploading} isDisabled={!file}>
                Upload Media
              </Button>
            </VStack>
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