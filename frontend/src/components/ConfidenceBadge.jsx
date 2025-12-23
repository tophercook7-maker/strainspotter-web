import { Chip, LinearProgress, Box, Typography } from '@mui/material';

export default function ConfidenceBadge({ confidence, showProgress = true }) {
  const getColor = (conf) => {
    if (conf >= 80) return 'success';
    if (conf >= 60) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Chip
          label={`${confidence}% Confidence`}
          color={getColor(confidence)}
          size="large"
        />
      </Box>
      {showProgress && (
        <LinearProgress
          variant="determinate"
          value={confidence}
          color={getColor(confidence)}
          sx={{ height: 8, borderRadius: 4 }}
        />
      )}
    </Box>
  );
}

