
// popup.js
document.addEventListener('DOMContentLoaded', function() {
  // Tab switching logic
  const itemsTab = document.getElementById('itemsTab');
  const addTab = document.getElementById('addTab');
  const itemsSection = document.getElementById('itemsSection');
  const addSection = document.getElementById('addSection');
  
  // Set Add tab as default active tab
  addTab.classList.add('active');
  itemsTab.classList.remove('active');
  addSection.style.display = 'block';
  itemsSection.style.display = 'none';
  
  // Load current page info immediately
  getCurrentPageInfo();
  
  itemsTab.addEventListener('click', function() {
    itemsTab.classList.add('active');
    addTab.classList.remove('active');
    itemsSection.style.display = 'block';
    addSection.style.display = 'none';
    loadWishlistItems();
  });
  
  addTab.addEventListener('click', function() {
    addTab.classList.add('active');
    itemsTab.classList.remove('active');
    addSection.style.display = 'block';
    itemsSection.style.display = 'none';
    getCurrentPageInfo();
  });
  
  // Add event listeners for buttons
  document.getElementById('addToWishlistBtn').addEventListener('click', addCurrentPageToWishlist);
  document.getElementById('addManualItemBtn').addEventListener('click', addManualItem);
  
  // Enhance the manual entry form with categories
  enhanceManualEntryForm();
});

function getCurrentPageInfo() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    document.getElementById('pageTitle').textContent = activeTab.title;
    document.getElementById('manualUrl').value = activeTab.url;
    
    // Inject content script to extract price and description
    chrome.scripting.executeScript({
      target: {tabId: activeTab.id},
      function: extractProductInfo
    }, (results) => {
      if (results && results[0] && results[0].result) {
        const info = results[0].result;
        document.getElementById('pagePrice').textContent = info.price || 'Price not detected';
        document.getElementById('pageDescription').textContent = info.description || 'No description found';
        document.getElementById('manualTitle').value = activeTab.title;
        document.getElementById('manualPrice').value = info.price || '';
        document.getElementById('manualDescription').value = info.description || '';
      }
    });
  });
}

// Function to extract product information from the current page
function extractProductInfo() {
  // Try to find price
  let price = '';
  const priceSelectors = [
    '.price', '#price', '.product-price', '.offer-price', 
    '[data-price]', '[itemprop="price"]', '.sales-price',
    '.current-price', '.now-price', '.product_price'
  ];
  
  for (const selector of priceSelectors) {
    const priceElement = document.querySelector(selector);
    if (priceElement && priceElement.textContent.trim()) {
      price = priceElement.textContent.trim();
      break;
    }
  }
  
  // Try to find description
  let description = '';
  const descriptionSelectors = [
    '[name="description"]', '[itemprop="description"]', '.product-description',
    '.description', '#description', '.prod-description', '.short-description',
    '.product-details', '.details', '.product-info'
  ];
  
  for (const selector of descriptionSelectors) {
    const descElement = document.querySelector(selector);
    if (descElement && descElement.textContent.trim()) {
      description = descElement.textContent.trim().substring(0, 200) + '...';
      break;
    }
  }
  
  return { price, description };
}

function addCurrentPageToWishlist() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    const title = activeTab.title;
    const url = activeTab.url;
    const price = document.getElementById('pagePrice').textContent;
    const description = document.getElementById('pageDescription').textContent;
    const category = document.getElementById('itemCategory') ? 
                     document.getElementById('itemCategory').value || 'Uncategorized' : 
                     'Uncategorized';
    
    const newItem = {
      id: Date.now().toString(),
      title: title,
      price: price !== 'Price not detected' ? price : '',
      url: url,
      description: description !== 'No description found' ? description : '',
      category: category,
      dateAdded: new Date().toISOString()
    };
    
    chrome.storage.sync.get('wishlist', function(data) {
      let wishlist = data.wishlist || [];
      wishlist.unshift(newItem);
      chrome.storage.sync.set({wishlist: wishlist}, function() {
        // Switch to items tab
        document.getElementById('itemsTab').click();
      });
    });
  });
}

function enhanceManualEntryForm() {
  const categoryField = document.createElement('div');
  categoryField.innerHTML = `
    <select id="itemCategory" style="width: 100%; margin-bottom: 10px; padding: 5px;">
      <option value="">Select Category</option>
      <option value="Electronics">Electronics</option>
      <option value="Clothing">Clothing</option>
      <option value="Home">Home</option>
      <option value="Books">Books</option>
      <option value="Other">Other</option>
    </select>
  `;
  
  // Insert before the Add Manual Item button
  const manualForm = document.getElementById('manualEntryForm');
  const addButton = document.getElementById('addManualItemBtn');
  manualForm.querySelector('div').insertBefore(categoryField, addButton);
}

function addManualItem() {
  const title = document.getElementById('manualTitle').value;
  const price = document.getElementById('manualPrice').value;
  const url = document.getElementById('manualUrl').value;
  const description = document.getElementById('manualDescription').value;
  const category = document.getElementById('itemCategory').value || 'Uncategorized';
  
  if (!title || !url) {
    alert('Title and URL are required!');
    return;
  }
  
  const newItem = {
    id: Date.now().toString(),
    title: title,
    price: price,
    url: url,
    description: description,
    category: category,
    dateAdded: new Date().toISOString()
  };
  
  chrome.storage.sync.get('wishlist', function(data) {
    let wishlist = data.wishlist || [];
    wishlist.unshift(newItem);
    chrome.storage.sync.set({wishlist: wishlist}, function() {
      // Clear form and switch to items tab
      document.getElementById('manualTitle').value = '';
      document.getElementById('manualPrice').value = '';
      document.getElementById('manualUrl').value = '';
      document.getElementById('manualDescription').value = '';
      document.getElementById('itemCategory').value = '';
      
      // Switch to items tab
      document.getElementById('itemsTab').click();
    });
  });
}

function loadWishlistItems() {
  // Add filtering options if they don't exist yet
  if (!document.querySelector('.filter-container')) {
    addFilteringOptions();
  }
  
  // Add export buttons if they don't exist yet
  if (!document.querySelector('.export-container')) {
    setupExportButton();
  }
  
  // Load and display items
  chrome.storage.sync.get('wishlist', function(data) {
    const wishlist = data.wishlist || [];
    displayWishlistItems(wishlist);
  });
}

function addFilteringOptions() {
  const filterContainer = document.createElement('div');
  filterContainer.className = 'filter-container';
  filterContainer.innerHTML = `
    <div class="filter-row">
      <select id="categoryFilter" class="filter-select">
        <option value="all">All Categories</option>
        <option value="Electronics">Electronics</option>
        <option value="Clothing">Clothing</option>
        <option value="Home">Home</option>
        <option value="Books">Books</option>
        <option value="Other">Other</option>
        <option value="Uncategorized">Uncategorized</option>
      </select>
      
      <select id="sortBy" class="filter-select">
        <option value="dateDesc">Newest First</option>
        <option value="dateAsc">Oldest First</option>
        <option value="priceAsc">Price: Low to High</option>
        <option value="priceDesc">Price: High to Low</option>
        <option value="titleAsc">Title: A to Z</option>
      </select>
    </div>
    <div class="search-row">
      <input type="text" id="searchItems" placeholder="Search wishlist..." class="search-input">
    </div>
  `;
  
  document.getElementById('itemsSection').prepend(filterContainer);
  
  // Add event listeners
  document.getElementById('categoryFilter').addEventListener('change', filterAndSortItems);
  document.getElementById('sortBy').addEventListener('change', filterAndSortItems);
  document.getElementById('searchItems').addEventListener('input', filterAndSortItems);
}

function setupExportButton() {
  const exportContainer = document.createElement('div');
  exportContainer.className = 'export-container';
  exportContainer.innerHTML = `
    <button id="exportCSV" class="btn export-btn">Export as CSV</button>
    <button id="exportJSON" class="btn export-btn">Export as JSON</button>
  `;
  
  document.getElementById('itemsSection').prepend(exportContainer);
  
  document.getElementById('exportCSV').addEventListener('click', exportAsCSV);
  document.getElementById('exportJSON').addEventListener('click', exportAsJSON);
}

function filterAndSortItems() {
  const categoryFilter = document.getElementById('categoryFilter').value;
  const sortBy = document.getElementById('sortBy').value;
  const searchTerm = document.getElementById('searchItems').value.toLowerCase();
  
  chrome.storage.sync.get('wishlist', function(data) {
    let wishlist = data.wishlist || [];
    
    // Filter by category
    if (categoryFilter !== 'all') {
      wishlist = wishlist.filter(item => item.category === categoryFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
      wishlist = wishlist.filter(item => 
        item.title.toLowerCase().includes(searchTerm) || 
        item.description.toLowerCase().includes(searchTerm)
      );
    }
    
    // Sort items
    wishlist.sort((a, b) => {
      switch(sortBy) {
        case 'dateAsc':
          return new Date(a.dateAdded) - new Date(b.dateAdded);
        case 'dateDesc':
          return new Date(b.dateAdded) - new Date(a.dateAdded);
        case 'priceAsc':
          return parseFloat(a.price.replace(/[^0-9.]/g, '') || 0) - 
                 parseFloat(b.price.replace(/[^0-9.]/g, '') || 0);
        case 'priceDesc':
          return parseFloat(b.price.replace(/[^0-9.]/g, '') || 0) - 
                 parseFloat(a.price.replace(/[^0-9.]/g, '') || 0);
        case 'titleAsc':
          return a.title.localeCompare(b.title);
        default:
          return new Date(b.dateAdded) - new Date(a.dateAdded);
      }
    });
    
    displayWishlistItems(wishlist);
  });
}

function displayWishlistItems(wishlist) {
  const container = document.getElementById('wishlistItems');
  container.innerHTML = '';
  
  if (wishlist.length === 0) {
    container.innerHTML = '<p class="empty-list">Your wishlist is empty.</p>';
    return;
  }
  
  wishlist.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'item';
    itemElement.dataset.category = item.category || 'Uncategorized';
    
    itemElement.innerHTML = `
      <div class="item-header">
        <div class="item-title">${item.title}</div>
        <div class="item-price">${item.price}</div>
      </div>
      <div class="item-category">${item.category || 'Uncategorized'}</div>
      <div class="item-description">${item.description}</div>
      <div class="item-date">Added: ${new Date(item.dateAdded).toLocaleDateString()}</div>
      <div class="item-actions">
        <button class="btn btn-visit">Visit</button>
        <button class="btn btn-delete">Remove</button>
      </div>
    `;
    
    container.appendChild(itemElement);
    
    // Add event listeners
    itemElement.querySelector('.btn-visit').addEventListener('click', function() {
      chrome.tabs.create({url: item.url});
    });
    
    itemElement.querySelector('.btn-delete').addEventListener('click', function() {
      deleteItem(item.id);
    });
  });
}

function deleteItem(itemId) {
  const confirmDelete = document.createElement('div');
  confirmDelete.className = 'confirm-dialog';
  confirmDelete.innerHTML = `
    <p>Are you sure you want to delete this item?</p>
    <div class="confirm-buttons">
      <button class="btn btn-cancel">Cancel</button>
      <button class="btn btn-confirm">Delete</button>
    </div>
  `;
  
  document.body.appendChild(confirmDelete);
  
  confirmDelete.querySelector('.btn-cancel').addEventListener('click', () => {
    document.body.removeChild(confirmDelete);
  });
  
  confirmDelete.querySelector('.btn-confirm').addEventListener('click', () => {
    // Actual deletion logic
    chrome.storage.sync.get('wishlist', function(data) {
      let wishlist = data.wishlist || [];
      wishlist = wishlist.filter(item => item.id !== itemId);
      chrome.storage.sync.set({wishlist: wishlist}, function() {
        loadWishlistItems();
        document.body.removeChild(confirmDelete);
      });
    });
  });
}

function exportAsCSV() {
  chrome.storage.sync.get('wishlist', function(data) {
    const wishlist = data.wishlist || [];
    if (wishlist.length === 0) {
      alert('Your wishlist is empty.');
      return;
    }
    
    // Create CSV content
    const headers = ['Title', 'Price', 'URL', 'Description', 'Category', 'Date Added'];
    let csvContent = headers.join(',') + '\n';
    
    wishlist.forEach(item => {
      const row = [
        `"${item.title.replace(/"/g, '""')}"`,
        `"${item.price.replace(/"/g, '""')}"`,
        `"${item.url.replace(/"/g, '""')}"`,
        `"${item.description.replace(/"/g, '""')}"`,
        `"${item.category || 'Uncategorized'}"`,
        `"${new Date(item.dateAdded).toLocaleDateString()}"`
      ];
      csvContent += row.join(',') + '\n';
    });
    
    // Download the CSV file
    downloadFile(csvContent, 'wishlist.csv', 'text/csv');
  });
}

function exportAsJSON() {
  chrome.storage.sync.get('wishlist', function(data) {
    const wishlist = data.wishlist || [];
    if (wishlist.length === 0) {
      alert('Your wishlist is empty.');
      return;
    }
    
    // Create JSON content
    const jsonContent = JSON.stringify(wishlist, null, 2);
    
    // Download the JSON file
    downloadFile(jsonContent, 'wishlist.json', 'application/json');
  });
}

function downloadFile(content, fileName, contentType) {
  const a = document.createElement('a');
  const file = new Blob([content], {type: contentType});
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Add a bulk delete function with confirmation
function addBulkDeleteOption() {
  const bulkDeleteBtn = document.createElement('button');
  bulkDeleteBtn.className = 'btn bulk-delete-btn';
  bulkDeleteBtn.textContent = 'Clear All Items';
  bulkDeleteBtn.addEventListener('click', confirmBulkDelete);
  
  // Add to export container
  const exportContainer = document.querySelector('.export-container');
  if (exportContainer) {
    exportContainer.appendChild(bulkDeleteBtn);
  }
}

function confirmBulkDelete() {
  chrome.storage.sync.get('wishlist', function(data) {
    const wishlist = data.wishlist || [];
    if (wishlist.length === 0) {
      alert('Your wishlist is already empty.');
      return;
    }
    
    const confirmDelete = document.createElement('div');
    confirmDelete.className = 'confirm-dialog';
    confirmDelete.innerHTML = `
      <p>Are you sure you want to delete ALL items?</p>
      <p>This action cannot be undone.</p>
      <div class="confirm-buttons">
        <button class="btn btn-cancel">Cancel</button>
        <button class="btn btn-confirm">Delete All</button>
      </div>
    `;
    
    document.body.appendChild(confirmDelete);
    
    confirmDelete.querySelector('.btn-cancel').addEventListener('click', () => {
      document.body.removeChild(confirmDelete);
    });
    
    confirmDelete.querySelector('.btn-confirm').addEventListener('click', () => {
      // Clear the wishlist
      chrome.storage.sync.set({wishlist: []}, function() {
        loadWishlistItems();
        document.body.removeChild(confirmDelete);
      });
    });
  });
}

// Function to import wishlist data
function setupImportButton() {
  const importBtn = document.createElement('button');
  importBtn.className = 'btn import-btn';
  importBtn.textContent = 'Import Data';
  importBtn.addEventListener('click', showImportDialog);
  
  // Add to export container
  const exportContainer = document.querySelector('.export-container');
  if (exportContainer) {
    exportContainer.appendChild(importBtn);
  }
}

function showImportDialog() {
  const importDialog = document.createElement('div');
  importDialog.className = 'import-dialog';
  importDialog.innerHTML = `
    <div class="import-header">
      <h3>Import Wishlist Data</h3>
      <button class="close-btn">&times;</button>
    </div>
    <div class="import-body">
      <p>Select a JSON file to import:</p>
      <input type="file" id="importFile" accept=".json">
      <div class="import-options">
        <label>
          <input type="radio" name="importOption" value="replace" checked> Replace current wishlist
        </label>
        <label>
          <input type="radio" name="importOption" value="merge"> Merge with current wishlist
        </label>
      </div>
      <div class="import-buttons">
        <button class="btn btn-cancel">Cancel</button>
        <button class="btn btn-import">Import</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(importDialog);
  
  // Close button event
  importDialog.querySelector('.close-btn').addEventListener('click', () => {
    document.body.removeChild(importDialog);
  });
  
  // Cancel button event
  importDialog.querySelector('.btn-cancel').addEventListener('click', () => {
    document.body.removeChild(importDialog);
  });
  
  // Import button event
  importDialog.querySelector('.btn-import').addEventListener('click', () => {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
      alert('Please select a file to import.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importedData = JSON.parse(e.target.result);
        const importOption = document.querySelector('input[name="importOption"]:checked').value;
        
        if (!Array.isArray(importedData)) {
          throw new Error('Invalid data format. Expected an array of wishlist items.');
        }
        
        // Validate each item has required fields
        importedData.forEach(item => {
          if (!item.id || !item.title || !item.url) {
            throw new Error('Invalid item format. Each item must have id, title, and url.');
          }
        });
        
        chrome.storage.sync.get('wishlist', function(data) {
          let currentWishlist = data.wishlist || [];
          let newWishlist = [];
          
          if (importOption === 'replace') {
            newWishlist = importedData;
          } else if (importOption === 'merge') {
            // Create a map of existing IDs to avoid duplicates
            const existingIds = new Set(currentWishlist.map(item => item.id));
            
            // Add items that don't already exist
            newWishlist = [...currentWishlist];
            importedData.forEach(item => {
              if (!existingIds.has(item.id)) {
                newWishlist.push(item);
              }
            });
          }
          
          chrome.storage.sync.set({wishlist: newWishlist}, function() {
            loadWishlistItems();
            document.body.removeChild(importDialog);
            alert('Import successful!');
          });
        });
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
    };
    
    reader.readAsText(file);
  });
}

// Initialize additional features when loading wishlist items
function initializeAdditionalFeatures() {
  if (!document.querySelector('.bulk-delete-btn')) {
    addBulkDeleteOption();
  }
  
  if (!document.querySelector('.import-btn')) {
    setupImportButton();
  }
}

// Update loadWishlistItems to initialize all features
function loadWishlistItems() {
  // Add filtering options if they don't exist yet
  if (!document.querySelector('.filter-container')) {
    addFilteringOptions();
  }
  
  // Add export buttons if they don't exist yet
  if (!document.querySelector('.export-container')) {
    setupExportButton();
  }
  
  // Initialize additional features
  initializeAdditionalFeatures();
  
  // Load and display items
  chrome.storage.sync.get('wishlist', function(data) {
    const wishlist = data.wishlist || [];
    displayWishlistItems(wishlist);
  });
}