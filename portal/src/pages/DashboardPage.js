// src/pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Heading, SimpleGrid, Spinner } from '@chakra-ui/react';
// CORRECTED: Import Stat components from their own package
import { Stat, StatLabel, StatNumber } from '@chakra-ui/stat';

const DashboardPage = () => {
  const [summary, setSummary] = useState(null);

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
      <Heading mb={4}>Dashboard</Heading>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
        <Stat p={4} borderWidth="1px" borderRadius="lg">
          <StatLabel>Items in Repair</StatLabel>
          <StatNumber>{summary.items_in_repair}</StatNumber>
        </Stat>
        <Stat p={4} borderWidth="1px" borderRadius="lg">
          <StatLabel>Available Items</StatLabel>
          <StatNumber>{summary.available_items}</StatNumber>
        </Stat>
        <Stat p={4} borderWidth="1px" borderRadius="lg">
          <StatLabel>Upcoming Events</StatLabel>
          <StatNumber>{summary.upcoming_events}</StatNumber>
        </Stat>
        <Stat p={4} borderWidth="1px" borderRadius="lg">
          <StatLabel>Open Tickets</StatLabel>
          <StatNumber>{summary.open_tickets}</StatNumber>
        </Stat>
      </SimpleGrid>
    </Box>
  );
};

export default DashboardPage;