// background.js
// This script runs in the background

// Listen for installation
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === "install") {
    // Initialize empty wishlist
    chrome.storage.sync.set({wishlist: []});
    
    // Open a welcome page or tutorial
    chrome.tabs.create({
      url: "welcome.html"
    });
  }
});

// Optional: Add context menu for quick adding
chrome.contextMenus.create({
  id: "addToWishlist",
  title: "Add to Shopping Wishlist",
  contexts: ["page", "link"]
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "addToWishlist") {
    const url = info.linkUrl || info.pageUrl;
    
    // Create a basic item with just the URL and title
    const newItem = {
      id: Date.now().toString(),
      title: tab.title,
      price: "",
      url: url,
      description: "",
      category: "Uncategorized",
      dateAdded: new Date().toISOString()
    };
    
    // Add to wishlist
    chrome.storage.sync.get('wishlist', function(data) {
      let wishlist = data.wishlist || [];
      wishlist.unshift(newItem);
      chrome.storage.sync.set({wishlist: wishlist});
    });
  }
});