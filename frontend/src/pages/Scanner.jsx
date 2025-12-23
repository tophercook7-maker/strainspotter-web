import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { CameraAlt as ScanIcon } from '@mui/icons-material';
import UploadButton from '../components/UploadButton';
import ImagePreview from '../components/ImagePreview';
import { uploadImage, processScan, getVisualMatch } from '../services/api';

export default function Scanner() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      // Step 1: Upload image
      const uploadResult = await uploadImage(selectedFile);
      const { scan_id, image_url } = uploadResult;

      setUploading(false);
      setProcessing(true);

      // Step 2: Process scan
      await processScan(scan_id);

      // Step 3: Get visual match
      const matchResult = await getVisualMatch(image_url, scan_id);

      // Navigate to result page
      navigate(`/scan/${scan_id}`, {
        state: {
          scanId: scan_id,
          imageUrl: image_url,
          match: matchResult.match,
          alternatives: matchResult.alternatives,
        },
      });
    } catch (err) {
      setError(err.message);
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <ScanIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        <Typography variant="h3" component="h1" gutterBottom>
          Strain Scanner
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload an image to identify the cannabis strain
        </Typography>
      </Box>

      <Paper sx={{ p: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!preview ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <UploadButton onFileSelect={handleFileSelect} disabled={uploading || processing} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Supported formats: JPEG, PNG, WebP, HEIC
            </Typography>
          </Box>
        ) : (
          <>
            <ImagePreview
              imageUrl={preview}
              fileName={selectedFile?.name}
              fileSize={selectedFile?.size}
            />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
              <Button
                variant="contained"
                onClick={handleScan}
                disabled={uploading || processing}
                size="large"
              >
                {uploading && <CircularProgress size={20} sx={{ mr: 1 }} />}
                {uploading ? 'Uploading...' : processing ? 'Processing...' : 'Scan Image'}
              </Button>
              <Button variant="outlined" onClick={handleReset} disabled={uploading || processing}>
                Reset
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
}

