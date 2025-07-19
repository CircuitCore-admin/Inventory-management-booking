// src/pages/DashboardPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Heading,
  SimpleGrid,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  useColorModeValue,
} from '@chakra-ui/react';

const DashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const cardBg = useColorModeValue('white', 'gray.700');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get('/api/dashboard/summary', {
          headers: { 'x-auth-token': token },
        });
        setSummary(data);
      } catch (error) {
        console.error('Failed to fetch summary data', error);
      }
    };

    fetchSummary();
  }, []);

  if (!summary) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box>
      <Heading mb={6}>Dashboard</Heading>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
        <Stat p={4} bg={cardBg} borderWidth="1px" borderRadius="lg" boxShadow="sm">
          <StatLabel>Items in Repair</StatLabel>
          <StatNumber>{summary.items_in_repair}</StatNumber>
        </Stat>
        <Stat p={4} bg={cardBg} borderWidth="1px" borderRadius="lg" boxShadow="sm">
          <StatLabel>Available Items</StatLabel>
          <StatNumber>{summary.available_items}</StatNumber>
        </Stat>
        <Stat p={4} bg={cardBg} borderWidth="1px" borderRadius="lg" boxShadow="sm">
          <StatLabel>Upcoming Events</StatLabel>
          <StatNumber>{summary.upcoming_events}</StatNumber>
        </Stat>
        <Stat p={4} bg={cardBg} borderWidth="1px" borderRadius="lg" boxShadow="sm">
          <StatLabel>Open Tickets</StatLabel>
          <StatNumber>{summary.open_tickets}</StatNumber>
        </Stat>
      </SimpleGrid>
    </Box>
  );
};

export default DashboardPage;
