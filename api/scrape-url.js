const { JSDOM } = require('jsdom');
const puppeteer = require('puppeteer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    let propertyData = {};
    
    if (url.includes('zillow.com')) {
      propertyData = await scrapeZillow(url);
    } else if (url.includes('realtor.com')) {
      propertyData = await scrapeRealtor(url);
    } else if (url.includes('redfin.com')) {
      propertyData = await scrapeRedfin(url);
    } else {
      // Fallback to generic scraping for other sites
      propertyData = await scrapeGeneric(url);
    }
    
    res.status(200).json({ success: true, data: propertyData });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: 'Failed to scrape URL' });
  }
}

async function scrapeGeneric(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Extract property data using generic selectors
    return {
      price: extractPrice(document),
      bedrooms: extractBedrooms(document),
      bathrooms: extractBathrooms(document),
      sqft: extractSqft(document),
      features: extractFeatures(document),
      address: extractAddress(document),
      propertyType: extractPropertyType(document),
      description: extractDescription(document)
    };
  } catch (error) {
    console.error('Generic scraping error:', error);
    return {};
  }
}

async function scrapeZillow(url) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Extract data using Puppeteer
    const data = await page.evaluate(() => {
      return {
        price: document.querySelector('span[data-testid="price"]')?.textContent || 
               document.querySelector('.ds-price')?.textContent,
        bedrooms: document.querySelector('span[data-testid="bed"]')?.textContent || 
                  document.querySelector('.ds-bed-bath-living-area span:first-child')?.textContent,
        bathrooms: document.querySelector('span[data-testid="bath"]')?.textContent || 
                   document.querySelector('.ds-bed-bath-living-area span:nth-child(2)')?.textContent,
        sqft: document.querySelector('span[data-testid="sqft"]')?.textContent || 
              document.querySelector('.ds-bed-bath-living-area span:nth-child(3)')?.textContent,
        address: document.querySelector('h1[class="ds-address-container"]')?.textContent || 
                document.querySelector('.ds-address')?.textContent,
        features: Array.from(document.querySelectorAll('.ds-home-fact-list li, .ds-feature-item')).map(el => el.textContent),
        description: document.querySelector('.ds-overview-section p')?.textContent
      };
    });
    
    return data;
  } catch (error) {
    console.error('Zillow scraping error:', error);
    return {};
  } finally {
    await browser.close();
  }
}

async function scrapeRealtor(url) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Extract data using Puppeteer for Realtor.com
    const data = await page.evaluate(() => {
      return {
        price: document.querySelector('.Price__Component-rui__x3geed-0')?.textContent || 
               document.querySelector('[data-testid="price"]')?.textContent,
        bedrooms: document.querySelector('[data-testid="property-meta-beds"]')?.textContent || 
                  document.querySelector('.meta-beds')?.textContent,
        bathrooms: document.querySelector('[data-testid="property-meta-baths"]')?.textContent || 
                   document.querySelector('.meta-baths')?.textContent,
        sqft: document.querySelector('[data-testid="property-meta-sqft"]')?.textContent || 
              document.querySelector('.meta-sqft')?.textContent,
        address: document.querySelector('.address-value')?.textContent || 
                document.querySelector('[data-testid="address-container"]')?.textContent,
        features: Array.from(document.querySelectorAll('.feature-item, .amenity-item')).map(el => el.textContent),
        description: document.querySelector('.description-text')?.textContent || 
                     document.querySelector('[data-testid="description"]')?.textContent
      };
    });
    
    return data;
  } catch (error) {
    console.error('Realtor.com scraping error:', error);
    return {};
  } finally {
    await browser.close();
  }
}

async function scrapeRedfin(url) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Extract data using Puppeteer for Redfin
    const data = await page.evaluate(() => {
      return {
        price: document.querySelector('.price')?.textContent || 
               document.querySelector('.statsValue')?.textContent,
        bedrooms: document.querySelector('.beds .statsValue')?.textContent || 
                  document.querySelector('[data-rf-test-id="abp-beds"] .statsValue')?.textContent,
        bathrooms: document.querySelector('.baths .statsValue')?.textContent || 
                   document.querySelector('[data-rf-test-id="abp-baths"] .statsValue')?.textContent,
        sqft: document.querySelector('.sqFt .statsValue')?.textContent || 
              document.querySelector('[data-rf-test-id="abp-sqFt"] .statsValue')?.textContent,
        address: document.querySelector('.street-address')?.textContent + ', ' + 
                document.querySelector('.cityStateZip')?.textContent || 
                document.querySelector('.homeAddress')?.textContent,
        features: Array.from(document.querySelectorAll('.amenity-group li, .feature-item')).map(el => el.textContent),
        description: document.querySelector('.remarks')?.textContent || 
                     document.querySelector('[data-rf-test-id="description"]')?.textContent
      };
    });
    
    return data;
  } catch (error) {
    console.error('Redfin scraping error:', error);
    return {};
  } finally {
    await browser.close();
  }
}

function extractPrice(doc) {
  const selectors = [
    '.price-display',
    '[data-testid="price"]',
    '.PropertyPrice',
    '.listing-price',
    '.price',
    '[class*="price"]',
    '[class*="Price"]'
  ];
  
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const text = element.textContent.trim();
      const price = text.replace(/[^\d]/g, '');
      if (price.length > 3) return parseInt(price);
    }
  }
  return null;
}

function extractBedrooms(doc) {
  const selectors = [
    '[data-testid="bedrooms"]',
    '.bedrooms',
    '[class*="bedroom"]',
    '[class*="Bedroom"]'
  ];
  
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const text = element.textContent.trim();
      const bedrooms = text.match(/\d+/);
      if (bedrooms) return parseInt(bedrooms[0]);
    }
  }
  return null;
}

function extractBathrooms(doc) {
  const selectors = [
    '[data-testid="bathrooms"]',
    '.bathrooms',
    '[class*="bathroom"]',
    '[class*="Bathroom"]'
  ];
  
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const text = element.textContent.trim();
      const bathrooms = text.match(/\d+(?:\.\d+)?/);
      if (bathrooms) return parseFloat(bathrooms[0]);
    }
  }
  return null;
}

function extractSqft(doc) {
  const selectors = [
    '[data-testid="sqft"]',
    '.sqft',
    '[class*="square"]',
    '[class*="Square"]'
  ];
  
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const text = element.textContent.trim();
      const sqft = text.replace(/[^\d]/g, '');
      if (sqft.length > 2) return parseInt(sqft);
    }
  }
  return null;
}

function extractFeatures(doc) {
  const selectors = [
    '.features',
    '.amenities',
    '[class*="feature"]',
    '[class*="amenity"]'
  ];
  
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const features = Array.from(element.querySelectorAll('li, .feature-item'))
        .map(item => item.textContent.trim())
        .filter(text => text.length > 0);
      
      if (features.length > 0) {
        return features.join(', ');
      }
    }
  }
  return null;
}

function extractAddress(doc) {
  const selectors = [
    '[data-testid="address"]',
    '.address',
    '[class*="address"]',
    '[class*="Address"]',
    'h1',
    '.property-title'
  ];
  
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const text = element.textContent.trim();
      if (text.includes(',') && text.length > 10) {
        return text;
      }
    }
  }
  return null;
}

function extractPropertyType(doc) {
  const selectors = [
    '.property-type',
    '[class*="type"]',
    '[class*="Type"]'
  ];
  
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const text = element.textContent.trim().toLowerCase();
      if (text.includes('single') || text.includes('family')) return 'single-family';
      if (text.includes('condo') || text.includes('apartment')) return 'condo';
      if (text.includes('townhouse')) return 'townhouse';
      if (text.includes('multi')) return 'multi-family';
      if (text.includes('land')) return 'land';
    }
  }
  return 'residential';
}

function extractDescription(doc) {
  const selectors = [
    '.description',
    '.property-description',
    '[class*="description"]',
    '[class*="Description"]'
  ];
  
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const text = element.textContent.trim();
      if (text.length > 50) {
        return text.substring(0, 500) + (text.length > 500 ? '...' : '');
      }
    }
  }
  return null;
}
