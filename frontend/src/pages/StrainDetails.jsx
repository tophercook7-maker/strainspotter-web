import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { supabase } from '../services/supabase';

export default function StrainDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [strain, setStrain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStrain();
  }, [slug]);

  const loadStrain = async () => {
    try {
      const { data, error: err } = await supabase
        .from('strains')
        .select('*')
        .eq('slug', slug)
        .single();

      if (err) throw err;
      setStrain(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !strain) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Strain not found'}</Alert>
        <Button onClick={() => navigate('/gallery')} sx={{ mt: 2 }}>
          Back to Gallery
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/gallery')}
        sx={{ mb: 3 }}
      >
        Back to Gallery
      </Button>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {strain.name}
        </Typography>

        <Grid container spacing={4} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            {strain.type && (
              <Chip label={strain.type} color="primary" sx={{ mr: 1, mb: 1 }} />
            )}
            {strain.thc && (
              <Chip label={`THC: ${strain.thc}%`} sx={{ mr: 1, mb: 1 }} />
            )}
            {strain.cbd && (
              <Chip label={`CBD: ${strain.cbd}%`} sx={{ mr: 1, mb: 1 }} />
            )}
          </Grid>

          <Grid item xs={12}>
            {strain.description && (
              <Typography variant="body1" paragraph>
                {strain.description}
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}

