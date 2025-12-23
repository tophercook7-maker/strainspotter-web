import { Box, Typography } from '@mui/material';

export default function ImagePreview({ imageUrl, fileName, fileSize }) {
  return (
    <Box sx={{ mt: 2, textAlign: 'center' }}>
      <Box
        component="img"
        src={imageUrl}
        alt="Preview"
        sx={{
          maxWidth: '100%',
          maxHeight: '400px',
          borderRadius: 2,
          boxShadow: 2,
        }}
      />
      {fileName && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {fileName}
          {fileSize && ` (${(fileSize / 1024 / 1024).toFixed(2)} MB)`}
        </Typography>
      )}
    </Box>
  );
}

