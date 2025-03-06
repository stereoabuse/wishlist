// Function to extract product information
function extractProductInfo() {
  // Try to find price
  let price = '';
  const priceSelectors = [
    '.price', '#price', '.product-price', '.offer-price', 
    '[data-price]', '[itemprop="price"]', '.sales-price',
    '.current-price', '.now-price', '.product_price',
    '.price-current', '.price_tag', '.price-box',
    '.a-price', '.price-value', '.product-price-value'
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
    '.product-details', '.details', '.product-info', '.product-overview',
    '.overview', '.product-summary', '.summary', '.product-features',
    '.features', '.product-specs', '.specs'
  ];
  
  for (const selector of descriptionSelectors) {
    const descElement = document.querySelector(selector);
    if (descElement && descElement.textContent.trim()) {
      description = descElement.textContent.trim().substring(0, 200) + '...';
      break;
    }
  }
  
  // Try to find image
  let image = '';
  const imageSelectors = [
    '[property="og:image"]', '[itemprop="image"]', '.product-image img',
    '.product-img img', '.main-image img', '#main-image',
    '.primary-image', '.featured-image', '.product-featured-image'
  ];
  
  for (const selector of imageSelectors) {
    const imgElement = document.querySelector(selector);
    if (imgElement) {
      if (imgElement.tagName === 'IMG') {
        image = imgElement.src;
        break;
      } else if (imgElement.getAttribute('content')) {
        image = imgElement.getAttribute('content');
        break;
      }
    }
  }
  
  return { price, description, image };
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getPageInfo') {
    const pageInfo = {
      title: document.title,
      url: window.location.href,
      ...extractProductInfo()
    };
    sendResponse(pageInfo);
  }
  return true;
});