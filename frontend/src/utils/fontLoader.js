/**
 * Font loader for jsPDF Unicode support
 * Loads Roboto font for proper Spanish character support (á, é, í, ó, ú, ñ, etc.)
 */

// Function to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Cache for loaded fonts
let fontsLoaded = false;
let robotoRegularBase64 = null;
let robotoBoldBase64 = null;

// Function to load fonts from CDN
const loadFontsFromCDN = async () => {
  if (fontsLoaded) return { regular: robotoRegularBase64, bold: robotoBoldBase64 };
  
  try {
    // Load Roboto Regular
    const regularResponse = await fetch('https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-400-normal.woff');
    if (regularResponse.ok) {
      const regularBuffer = await regularResponse.arrayBuffer();
      robotoRegularBase64 = arrayBufferToBase64(regularBuffer);
    }
    
    // Load Roboto Bold
    const boldResponse = await fetch('https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-700-normal.woff');
    if (boldResponse.ok) {
      const boldBuffer = await boldResponse.arrayBuffer();
      robotoBoldBase64 = arrayBufferToBase64(boldBuffer);
    }
    
    fontsLoaded = robotoRegularBase64 !== null;
    return { regular: robotoRegularBase64, bold: robotoBoldBase64 };
  } catch (error) {
    console.error('Error loading fonts:', error);
    return { regular: null, bold: null };
  }
};

/**
 * Register Roboto font with jsPDF instance for Unicode support
 * @param {jsPDF} doc - jsPDF document instance
 * @returns {Promise<boolean>} - Returns true if fonts were loaded successfully
 */
export const registerRobotoFont = async (doc) => {
  try {
    const fonts = await loadFontsFromCDN();
    
    if (fonts.regular) {
      doc.addFileToVFS('Roboto-Regular.woff', fonts.regular);
      doc.addFont('Roboto-Regular.woff', 'Roboto', 'normal');
    }
    
    if (fonts.bold) {
      doc.addFileToVFS('Roboto-Bold.woff', fonts.bold);
      doc.addFont('Roboto-Bold.woff', 'Roboto', 'bold');
    }
    
    if (fonts.regular || fonts.bold) {
      doc.setFont('Roboto');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error registering Roboto font:', error);
    return false;
  }
};

/**
 * Set font with fallback - uses Roboto if available, otherwise helvetica
 * @param {jsPDF} doc - jsPDF document instance
 * @param {string} style - Font style ('normal' or 'bold')
 */
export const setFontWithFallback = (doc, style = 'normal') => {
  try {
    const fonts = doc.getFontList();
    if (fonts['Roboto']) {
      doc.setFont('Roboto', style);
    } else {
      doc.setFont('helvetica', style);
    }
  } catch (error) {
    doc.setFont('helvetica', style);
  }
};

export default { registerRobotoFont, setFontWithFallback };
