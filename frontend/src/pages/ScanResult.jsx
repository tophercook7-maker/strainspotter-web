import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
} from '@mui/material';
import { ArrowBack, PhotoCamera } from '@mui/icons-material';
import ConfidenceBadge from '../components/ConfidenceBadge';
import MatchReasoning from '../components/MatchReasoning';
import { getScan } from '../services/api';

export default function ScanResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [scanData, setScanData] = useState(location.state);
  const [loading, setLoading] = useState(!location.state);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!scanData && id) {
      // Refetch scan data if not in location state
      getScan(id)
        .then((data) => {
          setScanData(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [id, scanData]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (error || !scanData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Scan not found'}</Alert>
        <Button onClick={() => navigate('/scanner')} sx={{ mt: 2 }}>
          Back to Scanner
        </Button>
      </Container>
    );
  }

  const { imageUrl, match, alternatives } = scanData;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/scanner')}
        sx={{ mb: 3 }}
      >
        Back to Scanner
      </Button>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box
              component="img"
              src={imageUrl}
              alt="Scanned image"
              sx={{
                width: '100%',
                borderRadius: 2,
                boxShadow: 2,
              }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            {match ? (
              <>
                <Typography variant="h4" component="h1" gutterBottom>
                  {match.name}
                </Typography>
                <ConfidenceBadge confidence={match.confidence} />
                <MatchReasoning reasoning={match.reasoning} />

                {alternatives && alternatives.length > 0 && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom>
                      Alternative Matches
                    </Typography>
                    <List>
                      {alternatives.map((alt, idx) => (
                        <ListItem
                          key={idx}
                          button
                          onClick={() => navigate(`/strain/${alt.slug}`)}
                        >
                          <ListItemText
                            primary={alt.name}
                            secondary={`${alt.confidence}% confidence`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </>
            ) : (
              <Alert severity="warning">No match found</Alert>
            )}

            <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<PhotoCamera />}
                onClick={() => navigate('/scanner')}
                fullWidth
              >
                Scan Another Image
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

