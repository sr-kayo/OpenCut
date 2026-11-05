import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.root, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  root: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});
