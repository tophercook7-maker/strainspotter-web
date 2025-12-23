import { Box, Typography, Paper } from '@mui/material';

export default function MatchReasoning({ reasoning }) {
  return (
    <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Match Reasoning
      </Typography>
      <Typography variant="body2" color="text.primary">
        {reasoning || 'No reasoning available'}
      </Typography>
    </Paper>
  );
}

