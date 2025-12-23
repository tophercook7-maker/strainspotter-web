import { Button } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { useRef } from 'react';

export default function UploadButton({ onFileSelect, disabled = false }) {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <Button
        variant="contained"
        startIcon={<CloudUpload />}
        onClick={handleClick}
        disabled={disabled}
        size="large"
      >
        Select Image
      </Button>
    </>
  );
}

