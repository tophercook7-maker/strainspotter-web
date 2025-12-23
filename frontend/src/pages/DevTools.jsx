import { Container, Box, Typography, Paper, Button } from '@mui/material';
import { getScans } from '../services/api';

export default function DevTools() {
  const handleTestAPI = async () => {
    try {
      const scans = await getScans();
      console.log('Scans:', scans);
      alert(`Found ${scans.length} scans`);
    } catch (error) {
      console.error('API Error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dev Tools
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button variant="contained" onClick={handleTestAPI}>
            Test API Connection
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

