import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
  Animated,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

// Native Camera import from expo-camera
let CameraView = null;
if (Platform.OS !== 'web') {
  try {
    const ExpoCamera = require('expo-camera');
    CameraView = ExpoCamera.CameraView || ExpoCamera.Camera;
  } catch (e) {
    console.warn('expo-camera not loaded on native:', e);
  }
}

/**
 * Play authentic scanner audio beep using Web Audio API on web
 */
function playBeepSound(type = 'success') {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.06);
      } else {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.setValueAtTime(240, ctx.currentTime + 0.08);
      }

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {
      // AudioContext policy
    }
  } else {
    // Vibrate on mobile
    try {
      Vibration.vibrate(type === 'success' ? 70 : 200);
    } catch (e) {}
  }
}

export default function CameraBarcodeScannerModal({
  visible,
  onClose,
  onScan,
  title = 'Scanner Code-barres',
  continuous = false,
  feedback = null, // { type: 'success' | 'error', text: string }
  isRTL = false,
}) {
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState('environment'); // 'environment' | 'user'
  const [hasPermission, setHasPermission] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState(null);
  const [isScanningActive, setIsScanningActive] = useState(true);

  // Animated laser line
  const laserAnim = useRef(new Animated.Value(0)).current;
  const webVideoRef = useRef(null);
  const webReaderRef = useRef(null);
  const webStreamRef = useRef(null);
  const scanLockoutRef = useRef(false);

  // Laser scanning line animation loop
  useEffect(() => {
    if (!visible) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 220,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [visible]);

  // Web camera initialization & Barcode detection
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) {
      cleanupWebCamera();
      return;
    }

    let isMounted = true;
    scanLockoutRef.current = false;

    async function startWebScanner() {
      try {
        const constraints = {
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        webStreamRef.current = stream;
        setHasPermission(true);

        if (webVideoRef.current) {
          webVideoRef.current.srcObject = stream;
          webVideoRef.current.setAttribute('playsinline', 'true');
          await webVideoRef.current.play();
        }

        // Try initializing ZXing Browser Multi-format Reader
        try {
          const { BrowserMultiFormatReader } = require('@zxing/browser');
          const codeReader = new BrowserMultiFormatReader();
          webReaderRef.current = codeReader;

          codeReader.decodeFromVideoElement(webVideoRef.current, (result, err) => {
            if (!isMounted || !visible || scanLockoutRef.current) return;
            if (result && result.getText()) {
              handleBarcodeResult(result.getText());
            }
          });
        } catch (zxingErr) {
          console.warn('ZXing fallback or detector error:', zxingErr);
          // Fallback to native BarcodeDetector if browser has it
          if ('BarcodeDetector' in window) {
            startNativeBarcodeDetector(stream);
          }
        }
      } catch (err) {
        console.warn('Web camera access error:', err);
        setHasPermission(false);
      }
    }

    startWebScanner();

    return () => {
      isMounted = false;
      cleanupWebCamera();
    };
  }, [visible, facing]);

  const cleanupWebCamera = () => {
    if (webReaderRef.current) {
      try {
        if (typeof webReaderRef.current.reset === 'function') {
          webReaderRef.current.reset();
        }
      } catch (e) {}
      webReaderRef.current = null;
    }

    if (webStreamRef.current) {
      webStreamRef.current.getTracks().forEach((track) => track.stop());
      webStreamRef.current = null;
    }
  };

  const startNativeBarcodeDetector = async (stream) => {
    try {
      const barcodeDetector = new window.BarcodeDetector();
      const interval = setInterval(async () => {
        if (!webVideoRef.current || scanLockoutRef.current) return;
        try {
          const barcodes = await barcodeDetector.detect(webVideoRef.current);
          if (barcodes && barcodes.length > 0) {
            handleBarcodeResult(barcodes[0].rawValue);
          }
        } catch (e) {}
      }, 250);

      return () => clearInterval(interval);
    } catch (e) {}
  };

  const handleBarcodeResult = (rawCode) => {
    const code = String(rawCode || '').trim();
    if (!code || scanLockoutRef.current) return;

    // Temporarily lock scanning to prevent spamming
    scanLockoutRef.current = true;
    setLastScanned(code);
    playBeepSound('success');

    if (onScan) {
      onScan(code);
    }

    if (!continuous) {
      setTimeout(() => {
        scanLockoutRef.current = false;
        onClose();
      }, 400);
    } else {
      // In continuous mode, unlock after 1.5 seconds so cashier can scan next item
      setTimeout(() => {
        scanLockoutRef.current = false;
      }, 1500);
    }
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    handleBarcodeResult(manualCode.trim());
    setManualCode('');
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const toggleTorch = () => {
    const nextVal = !torch;
    setTorch(nextVal);

    if (Platform.OS === 'web' && webStreamRef.current) {
      const track = webStreamRef.current.getVideoTracks()[0];
      if (track && track.getCapabilities && track.getCapabilities().torch) {
        track.applyConstraints({ advanced: [{ torch: nextVal }] }).catch(() => {});
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.scannerContainer}>
          {/* Top Bar Header */}
          <View style={[styles.scannerHeader, isRTL && styles.rowReverse]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="scan" size={22} color="#22c55e" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>{title}</Text>
            </View>

            <View style={styles.headerControls}>
              <TouchableOpacity style={styles.controlIconBtn} onPress={toggleTorch}>
                <Ionicons
                  name={torch ? 'flash' : 'flash-off-outline'}
                  size={20}
                  color={torch ? '#facc15' : '#ffffff'}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlIconBtn} onPress={toggleFacing}>
                <Ionicons name="camera-reverse-outline" size={20} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Central Camera Viewfinder */}
          <View style={styles.viewfinderContainer}>
            {Platform.OS === 'web' ? (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#000000',
                }}
              >
                <video
                  ref={webVideoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  muted
                  autoPlay
                  playsInline
                />
              </div>
            ) : CameraView ? (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing={facing}
                enableTorch={torch}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
                }}
                onBarcodeScanned={({ data }) => handleBarcodeResult(data)}
              />
            ) : (
              <View style={styles.cameraPlaceholder}>
                <Ionicons name="camera-outline" size={54} color="#64748b" />
                <Text style={styles.cameraFallbackText}>
                  {isRTL ? 'الكاميرا غير متوفرة في هذا الجهاز' : 'Caméra non disponible sur ce périphérique'}
                </Text>
              </View>
            )}

            {/* Target Reticle Frame Overlay */}
            <View style={styles.reticleFrame} pointerEvents="none">
              {/* Corner brackets */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              {/* Animated Red Laser Scanning Line */}
              <Animated.View
                style={[
                  styles.laserLine,
                  {
                    transform: [{ translateY: laserAnim }],
                  },
                ]}
              />
            </View>

            {/* Feedback notification toast floating over viewfinder */}
            {feedback && (
              <View
                style={[
                  styles.scannerToast,
                  feedback.type === 'error' ? styles.bgDanger : styles.bgSuccess,
                ]}
              >
                <Ionicons
                  name={feedback.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
                  size={18}
                  color="#ffffff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.scannerToastText}>{feedback.text}</Text>
              </View>
            )}

            {lastScanned && !feedback && (
              <View style={styles.lastScannedBadge}>
                <Ionicons name="barcode-outline" size={16} color="#22c55e" style={{ marginRight: 6 }} />
                <Text style={styles.lastScannedText}>#{lastScanned}</Text>
              </View>
            )}
          </View>

          {/* Bottom Manual Barcode Input Fallback */}
          <View style={styles.bottomBar}>
            <Text style={[styles.bottomHelpText, isRTL && styles.textRight]}>
              {continuous
                ? isRTL
                  ? '⚡ المسح السريع مفعل: امسح الباركود مباشرة للإضافة المتكررة'
                  : '⚡ Mode Rapide Continu : Visez le code-barres pour ajouter directement'
                : isRTL
                ? 'وجه الكاميرا نحو باركود المنتج أو اكتبه يدوياً :'
                : 'Pointez la caméra vers le code-barres ou saisissez-le manuellement :'}
            </Text>

            <View style={[styles.manualInputRow, isRTL && styles.rowReverse]}>
              <TextInput
                style={[styles.manualInputBox, isRTL && styles.textRight]}
                placeholder={isRTL ? 'اكتب كود بار...' : 'Saisir code-barres...'}
                placeholderTextColor="#94a3b8"
                value={manualCode}
                onChangeText={setManualCode}
                onSubmitEditing={handleManualSubmit}
              />
              <TouchableOpacity style={styles.manualSubmitBtn} onPress={handleManualSubmit}>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                <Text style={styles.manualSubmitText}>{isRTL ? 'تأكيد' : 'Valider'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  scannerContainer: {
    width: '100%',
    maxWidth: 520,
    height: '88%',
    maxHeight: 650,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'column',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  textRight: {
    textAlign: 'right',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlIconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginLeft: 8,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    marginLeft: 10,
  },
  viewfinderContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraFallbackText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  reticleFrame: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#22c55e',
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  laserLine: {
    position: 'absolute',
    top: 15,
    left: 10,
    right: 10,
    height: 2.5,
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  scannerToast: {
    position: 'absolute',
    top: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  bgSuccess: {
    backgroundColor: '#16a34a',
  },
  bgDanger: {
    backgroundColor: '#dc2626',
  },
  scannerToastText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  lastScannedBadge: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  lastScannedText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomBar: {
    padding: 14,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  bottomHelpText: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manualInputBox: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 14,
    marginRight: 8,
  },
  manualSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  manualSubmitText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});
