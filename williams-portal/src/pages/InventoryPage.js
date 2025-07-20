// src/pages/InventoryPage.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  Box,
  Heading,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useColorModeValue,
  Button,
  Flex,
  IconButton,
  useDisclosure, // Import useDisclosure for modal control
} from '@chakra-ui/react';
import { TriangleUpIcon, TriangleDownIcon } from '@chakra-ui/icons'; // Import icons

// Import the new ItemFormModal component (we'll create this next)
import ItemFormModal from '../components/ItemFormModal';
// Import ItemDetailsModal (we'll expand on this later for media/QR)
import ItemDetailsModal from '../components/ItemDetailsModal'; // Assuming a future ItemDetailsModal

const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const tableBg = useColorModeValue('white', 'gray.700');

  // States for ItemFormModal (Add/Edit)
  const { isOpen: isFormModalOpen, onOpen: onOpenFormModal, onClose: onCloseFormModal } = useDisclosure();
  const [editingItem, setEditingItem] = useState(null); // Null for Add, item object for Edit

  // States for ItemDetailsModal
  const { isOpen: isDetailsModalOpen, onOpen: onOpenDetailsModal, onClose: onCloseDetailsModal } = useDisclosure();
  const [viewingItem, setViewingItem] = useState(null);

  // States for sorting
  const [sortColumn, setSortColumn] = useState('name'); // Default sort by item name
  const [sortDirection, setSortDirection] = useState('asc'); // Default ascending

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/items', {
        headers: { 'x-auth-token': token },
      });
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch inventory items', error);
      // Optionally show a toast error here
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Sorting logic
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    sortableItems.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableItems;
  }, [items, sortColumn, sortDirection]);

  const handleAddItem = () => {
    setEditingItem(null); // Clear any item being edited
    onOpenFormModal();
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    onOpenFormModal();
  };

  const handleViewDetails = (item) => {
    setViewingItem(item);
    onOpenDetailsModal();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading>Inventory</Heading>
        <Button colorScheme="green" onClick={handleAddItem}>
          Add New Item
        </Button>
      </Flex>

      <TableContainer bg={tableBg} borderWidth="1px" borderRadius="lg" boxShadow="sm">
        <Table variant="striped" colorScheme="gray">
          <Thead>
            <Tr>
              <Th cursor="pointer" onClick={() => handleSort('name')}>
                <Flex align="center">
                  Item Name
                  {sortColumn === 'name' && (
                    <IconButton size="xs" ml={1} icon={sortDirection === 'asc' ? <TriangleUpIcon /> : <TriangleDownIcon />} aria-label="sort by name" variant="ghost" />
                  )}
                </Flex>
              </Th>
              <Th cursor="pointer" onClick={() => handleSort('unique_identifier')}>
                <Flex align="center">
                  Unique ID
                  {sortColumn === 'unique_identifier' && (
                    <IconButton size="xs" ml={1} icon={sortDirection === 'asc' ? <TriangleUpIcon /> : <TriangleDownIcon />} aria-label="sort by unique identifier" variant="ghost" />
                  )}
                </Flex>
              </Th>
              <Th cursor="pointer" onClick={() => handleSort('category')}>
                <Flex align="center">
                  Category
                  {sortColumn === 'category' && (
                    <IconButton size="xs" ml={1} icon={sortDirection === 'asc' ? <TriangleUpIcon /> : <TriangleDownIcon />} aria-label="sort by category" variant="ghost" />
                  )}
                </Flex>
              </Th>
              <Th cursor="pointer" onClick={() => handleSort('status')}>
                <Flex align="center">
                  Status
                  {sortColumn === 'status' && (
                    <IconButton size="xs" ml={1} icon={sortDirection === 'asc' ? <TriangleUpIcon /> : <TriangleDownIcon />} aria-label="sort by status" variant="ghost" />
                  )}
                </Flex>
              </Th>
              <Th cursor="pointer" onClick={() => handleSort('location')}>
                <Flex align="center">
                  Location
                  {sortColumn === 'location' && (
                    <IconButton size="xs" ml={1} icon={sortDirection === 'asc' ? <TriangleUpIcon /> : <TriangleDownIcon />} aria-label="sort by location" variant="ghost" />
                  )}
                </Flex>
              </Th>
              <Th isNumeric cursor="pointer" onClick={() => handleSort('purchase_cost')}>
                <Flex align="center">
                  Cost
                  {sortColumn === 'purchase_cost' && (
                    <IconButton size="xs" ml={1} icon={sortDirection === 'asc' ? <TriangleUpIcon /> : <TriangleDownIcon />} aria-label="sort by purchase cost" variant="ghost" />
                  )}
                </Flex>
              </Th>
              <Th cursor="pointer" onClick={() => handleSort('purchase_date')}>
                <Flex align="center">
                  Purchase Date
                  {sortColumn === 'purchase_date' && (
                    <IconButton size="xs" ml={1} icon={sortDirection === 'asc' ? <TriangleUpIcon /> : <TriangleDownIcon />} aria-label="sort by purchase date" variant="ghost" />
                  )}
                </Flex>
              </Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {sortedItems.map((item) => (
              <Tr key={item.item_id}>
                <Td>{item.name}</Td>
                <Td>{item.unique_identifier}</Td>
                <Td>{item.category}</Td>
                <Td>{item.status}</Td>
                <Td>{item.location}</Td>
                <Td isNumeric>${item.purchase_cost ? parseFloat(item.purchase_cost).toFixed(2) : '0.00'}</Td>
                <Td>{item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'N/A'}</Td>
                <Td>
                  <Button size="sm" mr={2} onClick={() => handleViewDetails(item)}>Details</Button>
                  <Button size="sm" onClick={() => handleEditItem(item)}>Edit</Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      {/* Item Add/Edit Modal */}
      {isFormModalOpen && (
        <ItemFormModal
          isOpen={isFormModalOpen}
          onClose={() => { onCloseFormModal(); setEditingItem(null); }} // Reset editingItem on close
          item={editingItem} // Pass item for editing, or null for adding
          onSuccess={fetchItems} // Callback to refresh list after success
        />
      )}

      {/* Item Details Modal */}
      {viewingItem && (
        <ItemDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => { onCloseDetailsModal(); setViewingItem(null); }}
          item={viewingItem}
        />
      )}
    </Box>
  );
};

export default InventoryPage;