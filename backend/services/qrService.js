const QRCode = require("qrcode");

/**
 * QR Code Generation Service
 *
 * Generates QR codes for:
 * - Batches (batch-level verification URL)
 * - Units (individual packet verification URL)
 * - Packaging levels (box/carton scan URL)
 */

const DEFAULT_BASE_URL = "http://localhost:5173";

const QR_OPTIONS = {
  width: 400,
  margin: 2,
  color: {
    dark: "#1a1a2e",
    light: "#ffffff",
  },
  errorCorrectionLevel: "H", // High error correction
};

/**
 * Generate a QR code as a base64-encoded Data URL.
 * The QR code encodes a verification URL containing the batchId.
 *
 * @param {string} batchId - The batch identifier to embed in QR
 * @param {string} baseUrl - Frontend URL for verification page
 * @returns {Promise<string>} Base64 data URL of the QR code image
 */
async function generateQRCode(batchId, baseUrl = DEFAULT_BASE_URL) {
  try {
    const verificationUrl = `${baseUrl}/verify/${batchId}`;

    const qrDataUrl = await QRCode.toDataURL(verificationUrl, QR_OPTIONS);

    return qrDataUrl;
  } catch (error) {
    console.error("QR generation error:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Generate a QR code as a raw PNG buffer.
 */
async function generateQRBuffer(batchId, baseUrl = DEFAULT_BASE_URL) {
  try {
    const verificationUrl = `${baseUrl}/verify/${batchId}`;
    const buffer = await QRCode.toBuffer(verificationUrl, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: "H",
    });
    return buffer;
  } catch (error) {
    console.error("QR buffer generation error:", error);
    throw new Error("Failed to generate QR buffer");
  }
}

/**
 * Generate a QR code for an individual unit (packet).
 * Encodes: {baseUrl}/verify/unit/{serialNumber}
 *
 * @param {string} serialNumber - The unit serial number
 * @param {string} baseUrl      - Frontend base URL
 * @returns {Promise<string>} Base64 data URL of the QR code image
 */
async function generateUnitQR(serialNumber, baseUrl = DEFAULT_BASE_URL) {
  try {
    const verificationUrl = `${baseUrl}/verify/unit/${serialNumber}`;

    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      ...QR_OPTIONS,
      width: 300, // Slightly smaller for unit labels
    });

    return qrDataUrl;
  } catch (error) {
    console.error("Unit QR generation error:", error);
    throw new Error("Failed to generate unit QR code");
  }
}

/**
 * Generate a QR code for a packaging level (box or carton).
 * Encodes: {baseUrl}/verify/packaging/{levelId}
 *
 * @param {string} levelId  - The packaging level ID (e.g., "BATCH001-B-001")
 * @param {string} baseUrl  - Frontend base URL
 * @returns {Promise<string>} Base64 data URL of the QR code image
 */
async function generatePackagingQR(levelId, baseUrl = DEFAULT_BASE_URL) {
  try {
    const verificationUrl = `${baseUrl}/verify/packaging/${levelId}`;

    const qrDataUrl = await QRCode.toDataURL(verificationUrl, QR_OPTIONS);

    return qrDataUrl;
  } catch (error) {
    console.error("Packaging QR generation error:", error);
    throw new Error("Failed to generate packaging QR code");
  }
}

module.exports = { generateQRCode, generateQRBuffer, generateUnitQR, generatePackagingQR };
