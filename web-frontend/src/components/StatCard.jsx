import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";

const StatCard = ({
  icon,
  label,
  value,
  hint,
  accent = "#059669",
  loading,
}) => (
  <Card sx={{ height: "100%" }}>
    <CardContent sx={{ p: 2.75 }}>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {label}
          </Typography>
          {loading ? (
            <Skeleton width={100} height={40} />
          ) : (
            <Typography variant="h4" sx={{ mt: 0.5 }}>
              {value}
            </Typography>
          )}
          {hint && (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${accent}18`,
            color: accent,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

export default StatCard;
