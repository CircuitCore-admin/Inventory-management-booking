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
  useDisclosure,
  Input, // For search bar
  Select, // For filter dropdowns
  InputGroup, InputLeftElement // For search icon
} from '@chakra-ui/react';
import { TriangleUpIcon, TriangleDownIcon, SearchIcon } from '@chakra-ui/icons'; // Import SearchIcon

// Import the new ItemFormModal component
import ItemFormModal from '../components/ItemFormModal';
// Import ItemDetailsModal
import ItemDetailsModal from '../components/ItemDetailsModal';

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

  // NEW: Filtering and Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterRegion, setFilterRegion] = useState(''); // New filter for region

  // Defined categories and regions for filters (should match ItemFormModal)
  const categories = [
    'Wheelbase', 'Steering Wheel', 'Pedals', 'Rig', 'PC', 'Monitor',
    'Headphones', 'Keyboard', 'Accessories'
  ];
  const regions = ['EU', 'US', 'ASIA', 'AFRICA', 'NORTH_AMERICA', 'OCEANIA', 'OTHER'];

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Pass filter parameters to backend
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      if (filterStatus) params.append('status', filterStatus);
      if (filterLocation) params.append('location', filterLocation);
      if (filterRegion) params.append('region', filterRegion); // Pass region filter
      if (searchTerm) params.append('search', searchTerm);

      const { data } = await axios.get(`http://localhost:3001/api/items?${params.toString()}`, { // Use explicit URL
        headers: { 'x-auth-token': token },
      });
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch inventory items', error);
      // Optionally show a toast error here
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus, filterLocation, filterRegion, searchTerm]); // Add filter dependencies

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

      // Handle null/undefined values for sorting robustly
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      // For numbers, ensure conversion
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      // For dates, convert to Date objects for comparison
      if (sortColumn === 'purchase_date') {
        const dateA = a.purchase_date ? new Date(a.purchase_date).getTime() : 0; // Use 0 for N/A dates
        const dateB = b.purchase_date ? new Date(b.purchase_date).getTime() : 0;
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0; // Fallback
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

      {/* NEW: Filtering and Search Section */}
      <Flex mb={6} wrap="wrap" gap={4}>
        <InputGroup maxWidth="300px">
          <InputLeftElement pointerEvents="none" children={<SearchIcon color="gray.300" />} />
          <Input
            placeholder="Search by name or ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
        <Select placeholder="Filter by Category" maxWidth="200px" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option> {/* Added All option */}
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </Select>
        <Select placeholder="Filter by Status" maxWidth="200px" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option> {/* Added All option */}
          <option value="In Storage">In Storage</option>
          <option value="In Transit">In Transit</option>
          <option value="In Use">In Use</option>
          <option value="In Repair">In Repair</option>
          <option value="Retired">Retired</option>
        </Select>
        <Select placeholder="Filter by Location" maxWidth="200px" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
          <option value="">All Locations</option> {/* Added All option */}
          {Array.from(new Set(items.map(item => item.location))).filter(Boolean).map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </Select>
        <Select placeholder="Filter by Region" maxWidth="200px" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
          <option value="">All Regions</option> {/* Added All option */}
          {regions.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </Select>
        <Button onClick={() => {
            setSearchTerm('');
            setFilterCategory('');
            setFilterStatus('');
            setFilterLocation('');
            setFilterRegion('');
        }}>Clear Filters</Button>
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
              <Th cursor="pointer" onClick={() => handleSort('region')}>
                <Flex align="center">
                  Region
                  {sortColumn === 'region' && (
                    <IconButton size="xs" ml={1} icon={sortDirection === 'asc' ? <TriangleUpIcon /> : <TriangleDownIcon />} aria-label="sort by region" variant="ghost" />
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
                <Td>{item.region || 'N/A'}</Td>
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
          onClose={() => { onCloseFormModal(); setEditingItem(null); }}
          item={editingItem}
          onSuccess={fetchItems}
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